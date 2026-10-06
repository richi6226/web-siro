/**
 * SIRO Inmobiliaria - Gestión de fotos del editor
 * Comprime en el navegador (WebP, con JPEG de respaldo), permite ordenar
 * arrastrando y sube a Supabase Storage al guardar la propiedad.
 */
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/modular/sortable.esm.js";
import { supabase, BUCKET, imageUrl } from "../catalogo.js";

const MAX_GRANDE = 1920;
const MAX_MINI = 640;
const MAX_FOTOS = 40;

/* ---------- Compresión ---------- */

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decodificar(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function redimensionar(fuente, ancho, alto, max, calidad) {
  const escala = Math.min(1, max / Math.max(ancho, alto));
  const w = Math.round(ancho * escala);
  const h = Math.round(alto * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fuente, 0, 0, w, h);

  let blob = await toBlob(canvas, "image/webp", calidad);
  // Safari no sabe generar WebP: en ese caso usamos JPEG.
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", calidad);
  canvas.width = canvas.height = 0; // libera memoria en iOS
  if (!blob) throw new Error("No se pudo procesar la imagen.");
  return { blob, width: w, height: h, ext: blob.type === "image/webp" ? "webp" : "jpg" };
}

export async function procesarImagen(file) {
  let fuente;
  try {
    fuente = await decodificar(file);
  } catch {
    const heic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
    throw new Error(
      heic
        ? `«${file.name}» está en formato HEIC y este navegador no lo abre. Súbela desde el iPhone directamente o expórtala como JPG.`
        : `«${file.name}» no es una imagen válida.`
    );
  }
  const ancho = fuente.width || fuente.naturalWidth;
  const alto = fuente.height || fuente.naturalHeight;
  const grande = await redimensionar(fuente, ancho, alto, MAX_GRANDE, 0.82);
  const mini = await redimensionar(fuente, ancho, alto, MAX_MINI, 0.78);
  if (fuente.close) fuente.close();
  return { grande, mini };
}

/* ---------- Galería ---------- */

export class Galeria {
  /**
   * @param {HTMLElement} grid      contenedor de miniaturas
   * @param {HTMLElement} dropzone  zona para soltar archivos
   * @param {HTMLInputElement} input selector de archivos
   * @param {{ onChange: Function, onError: Function, onCount: Function }} hooks
   */
  constructor(grid, dropzone, input, hooks) {
    this.grid = grid;
    this.dropzone = dropzone;
    this.input = input;
    this.hooks = hooks;
    this.items = [];
    this.eliminadas = [];
    this.procesando = 0;

    input.addEventListener("change", () => {
      this.agregar(input.files);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach((ev) =>
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.add("is-dragover");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.remove("is-dragover");
      })
    );
    dropzone.addEventListener("drop", (e) => this.agregar(e.dataTransfer.files));

    Sortable.create(grid, {
      animation: 180,
      delay: 150,
      delayOnTouchOnly: true,
      filter: "button",
      preventOnFilter: false,
      draggable: ".photo:not(.is-loading)",
      onEnd: () => {
        const orden = [...grid.children].map((el) => el.dataset.key);
        this.items.sort((a, b) => orden.indexOf(a.key) - orden.indexOf(b.key));
        this.render();
        this.hooks.onChange();
      }
    });
  }

  get count() {
    return this.items.length;
  }

  get ocupada() {
    return this.procesando > 0;
  }

  cargar(filas) {
    this.items = filas
      .sort((a, b) => a.posicion - b.posicion)
      .map((f) => ({ key: f.id, id: f.id, path: f.path, thumb_path: f.thumb_path, width: f.width, height: f.height, preview: imageUrl(f.thumb_path) }));
    this.eliminadas = [];
    this.render();
  }

  async agregar(fileList) {
    const archivos = [...fileList].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!archivos.length) return;
    const hueco = MAX_FOTOS - this.items.length;
    if (hueco <= 0) return this.hooks.onError(`Máximo ${MAX_FOTOS} fotos por propiedad.`);
    if (archivos.length > hueco) this.hooks.onError(`Solo se añadirán ${hueco} fotos (máximo ${MAX_FOTOS}).`);

    for (const file of archivos.slice(0, hueco)) {
      const key = crypto.randomUUID();
      const item = { key, cargando: true, nombre: file.name };
      this.items.push(item);
      this.procesando++;
      this.render();
      try {
        const { grande, mini } = await procesarImagen(file);
        Object.assign(item, {
          cargando: false,
          pendiente: { grande, mini },
          width: grande.width,
          height: grande.height,
          preview: URL.createObjectURL(mini.blob)
        });
      } catch (err) {
        this.items = this.items.filter((i) => i.key !== key);
        this.hooks.onError(err.message);
      } finally {
        this.procesando--;
        this.render();
      }
    }
    this.hooks.onChange();
  }

  quitar(key) {
    const item = this.items.find((i) => i.key === key);
    if (!item) return;
    if (item.id) this.eliminadas.push(item);
    if (item.pendiente && item.preview) URL.revokeObjectURL(item.preview);
    this.items = this.items.filter((i) => i.key !== key);
    this.render();
    this.hooks.onChange();
  }

  portada(key) {
    const i = this.items.findIndex((it) => it.key === key);
    if (i <= 0) return;
    const [item] = this.items.splice(i, 1);
    this.items.unshift(item);
    this.render();
    this.hooks.onChange();
  }

  render() {
    this.grid.innerHTML = "";
    this.items.forEach((item, index) => {
      const el = document.createElement("div");
      el.className = `photo${item.cargando ? " is-loading" : ""}`;
      el.dataset.key = item.key;

      if (item.cargando) {
        el.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center gap-2 text-[#76777d] text-xs">
          <span class="material-symbols-outlined animate-spin">progress_activity</span>Optimizando…</div>`;
        this.grid.appendChild(el);
        return;
      }

      const img = document.createElement("img");
      img.src = item.preview;
      img.alt = `Foto ${index + 1}`;
      img.loading = "lazy";
      el.appendChild(img);

      const acciones = document.createElement("div");
      acciones.className = "photo-actions";
      if (index > 0) acciones.appendChild(this.boton("star", "Hacer portada", () => this.portada(item.key)));
      acciones.appendChild(this.boton("delete", "Quitar foto", () => this.quitar(item.key)));
      el.appendChild(acciones);

      if (index === 0) el.insertAdjacentHTML("beforeend", '<span class="cover-tag">Portada</span>');
      if (item.pendiente) el.insertAdjacentHTML("beforeend", '<span class="pending-tag">Sin guardar</span>');
      this.grid.appendChild(el);
    });
    this.hooks.onCount(this.items.length);
  }

  boton(icono, titulo, accion) {
    const b = document.createElement("button");
    b.type = "button";
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    b.innerHTML = `<span class="material-symbols-outlined">${icono}</span>`;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      accion();
    });
    return b;
  }

  /** Aplica en Supabase los cambios: borra, sube las nuevas y guarda el orden. */
  async guardar(propertyId, progreso = () => {}) {
    if (this.eliminadas.length) {
      const rutas = this.eliminadas.flatMap((i) => [i.path, i.thumb_path]);
      const { error: errFiles } = await supabase.storage.from(BUCKET).remove(rutas);
      if (errFiles) throw errFiles;
      const { error } = await supabase.from("property_images").delete().in("id", this.eliminadas.map((i) => i.id));
      if (error) throw error;
      this.eliminadas = [];
    }

    const pendientes = this.items.filter((i) => i.pendiente);
    for (let n = 0; n < pendientes.length; n++) {
      const item = pendientes[n];
      progreso(`Subiendo fotos ${n + 1} de ${pendientes.length}…`);
      const base = `${propertyId}/${crypto.randomUUID()}`;
      const { grande, mini } = item.pendiente;
      const path = `${base}.${grande.ext}`;
      const thumb_path = `${base}_thumb.${mini.ext}`;
      const opciones = (b) => ({ contentType: b.blob.type, cacheControl: "31536000", upsert: false });

      const up1 = await supabase.storage.from(BUCKET).upload(path, grande.blob, opciones(grande));
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage.from(BUCKET).upload(thumb_path, mini.blob, opciones(mini));
      if (up2.error) throw up2.error;

      const { data, error } = await supabase
        .from("property_images")
        .insert({ property_id: propertyId, path, thumb_path, width: item.width, height: item.height, posicion: this.items.indexOf(item) })
        .select("id")
        .single();
      if (error) throw error;
      Object.assign(item, { id: data.id, path, thumb_path, pendiente: null });
    }

    if (this.items.length) {
      progreso("Guardando el orden de las fotos…");
      const filas = this.items.map((i, posicion) => ({
        id: i.id, property_id: propertyId, path: i.path, thumb_path: i.thumb_path,
        width: i.width, height: i.height, posicion
      }));
      const { error } = await supabase.from("property_images").upsert(filas, { onConflict: "id" });
      if (error) throw error;
    }
    this.render();
  }
}
