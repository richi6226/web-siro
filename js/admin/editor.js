/**
 * SIRO Inmobiliaria - Editor de propiedades (crear y editar)
 */
import { requireAdmin, supabase, toast, errorMessage, formatFecha } from "./sesion.js";
import { validarPublicacion, crearPropiedad, eliminarPropiedad } from "./acciones.js";
import { Galeria } from "./fotos.js";
import {
  TIPOS, ESTADOS, CONSERVACION, CARACTERISTICAS, CERTIFICADOS, MUNICIPIOS,
  propertySlug, publicUrl
} from "../catalogo.js";

const ENTEROS = ["precio", "gastos_comunidad", "m2_construidos", "m2_utiles", "m2_parcela", "habitaciones", "banos", "ano_construccion"];
const DECIMALES = ["consumo_energia", "emisiones_co2"];
const TEXTOS = ["titulo", "tipo", "municipio", "zona", "planta", "conservacion", "cert_energetico", "descripcion", "video_url", "tour_url", "operacion", "estado"];
const BOOLEANOS = ["precio_a_consultar", "destacada"];
const PRIVADOS = ["direccion", "propietario_nombre", "propietario_telefono", "notas"];
const COLORES_CERT = { A: "#00a651", B: "#50b848", C: "#bed730", D: "#fff200", E: "#fdb913", F: "#f37021", G: "#ed1c24" };
const AYUDA_ESTADO = {
  borrador: "No se ve en la web. Puedes guardarla a medias.",
  publicada: "Visible en la web para todo el mundo.",
  reservada: "Visible con la etiqueta «Reservada».",
  vendida: "Visible con la etiqueta «Vendida» (genera confianza).",
  alquilada: "Visible con la etiqueta «Alquilada»."
};

const form = document.getElementById("form");
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let propiedad = null;     // fila guardada en Supabase
let sucio = false;
let guardando = false;

const galeria = new Galeria($("[data-grid-fotos]"), $("[data-dropzone]"), $("[data-input-fotos]"), {
  onChange: marcarSucio,
  onError: (msg) => toast(msg, { error: true }),
  onCount: (n) => ($("[data-contador-fotos]").textContent = `${n} ${n === 1 ? "foto" : "fotos"}`)
});

construirOpciones();
await requireAdmin();
await cargar();
conectarEventos();

/* ---------- Construcción del formulario ---------- */

function construirOpciones() {
  const catalogos = { TIPOS, CONSERVACION };
  $$("select[data-opciones]").forEach((select) => {
    if (select.dataset.vacio) select.add(new Option(select.dataset.vacio, ""));
    Object.entries(catalogos[select.dataset.opciones]).forEach(([v, l]) => select.add(new Option(l, v)));
  });

  const datalist = $("#municipios");
  MUNICIPIOS.forEach((m) => datalist.appendChild(new Option(m)));

  const extras = $("[data-caracteristicas]");
  Object.entries(CARACTERISTICAS).forEach(([valor, label]) => {
    extras.insertAdjacentHTML(
      "beforeend",
      `<label class="chip-check"><input type="checkbox" name="caracteristicas" value="${valor}"><span>${label}</span></label>`
    );
  });

  const certs = $("[data-certificados]");
  Object.entries(CERTIFICADOS).forEach(([valor, label]) => {
    const color = COLORES_CERT[valor];
    const texto = ["C", "D", "E"].includes(valor) ? "#1c1c19" : "#fff";
    certs.insertAdjacentHTML(
      "beforeend",
      `<label class="chip-check cert-chip">
         <input type="radio" name="cert_energetico" value="${valor}">
         <span style="${color ? `--cert:${color};--cert-text:${texto}` : ""}">${label}</span>
       </label>`
    );
  });
  // Pequeño ajuste visual para las letras del certificado
  const style = document.createElement("style");
  style.textContent = `
    .cert-chip span::before { content: none; }
    .cert-chip span { min-width: 44px; justify-content: center; font-weight: 700; }
    .cert-chip input:checked + span[style] { background: var(--cert); border-color: var(--cert); color: var(--cert-text); }`;
  document.head.appendChild(style);

  actualizarEstados("venta");
}

function actualizarEstados(operacion) {
  const select = form.estado;
  const actual = select.value || "borrador";
  select.innerHTML = "";
  Object.entries(ESTADOS).forEach(([v, l]) => {
    if (v === "vendida" && operacion !== "venta") return;
    if (v === "alquilada" && operacion !== "alquiler") return;
    select.add(new Option(l, v));
  });
  const equivalente = { vendida: "alquilada", alquilada: "vendida" };
  select.value = [...select.options].some((o) => o.value === actual) ? actual : equivalente[actual] || "borrador";
  $("[data-ayuda-estado]").textContent = AYUDA_ESTADO[select.value];

  const sufijo = operacion === "alquiler" ? "€/mes" : "€";
  $("[data-sufijo-precio]").textContent = `(${sufijo})`;
  $("[data-sufijo-precio-input]").textContent = sufijo;
}

/* ---------- Carga ---------- */

async function cargar() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    pintarCabecera();
    form.titulo.focus();
    return;
  }

  const [{ data: p, error }, { data: priv }, { data: fotos }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("property_private").select("*").eq("property_id", id).maybeSingle(),
    supabase.from("property_images").select("*").eq("property_id", id).order("posicion")
  ]);

  if (error || !p) {
    toast("No se ha encontrado la propiedad.", { error: true });
    setTimeout(() => location.replace("/admin/panel"), 1500);
    return;
  }

  propiedad = p;
  rellenar(p, priv || {});
  galeria.cargar(fotos || []);
  pintarCabecera();
  sucio = false;
}

function rellenar(p, priv) {
  form.querySelector(`input[name="operacion"][value="${p.operacion}"]`).checked = true;
  actualizarEstados(p.operacion);

  TEXTOS.forEach((k) => {
    if (k === "operacion" || k === "cert_energetico") return;
    form[k].value = p[k] ?? "";
  });
  ENTEROS.forEach((k) => (form[k].value = p[k] == null ? "" : formatearMiles(k, p[k])));
  DECIMALES.forEach((k) => (form[k].value = p[k] == null ? "" : String(p[k]).replace(".", ",")));
  BOOLEANOS.forEach((k) => (form[k].checked = !!p[k]));
  PRIVADOS.forEach((k) => (form[k].value = priv[k] ?? ""));

  $$('input[name="caracteristicas"]').forEach((c) => (c.checked = (p.caracteristicas || []).includes(c.value)));
  $$('input[name="cert_energetico"]').forEach((r) => (r.checked = r.value === p.cert_energetico));

  form.estado.value = p.estado;
  $("[data-ayuda-estado]").textContent = AYUDA_ESTADO[p.estado];
  form.precio.disabled = form.precio_a_consultar.checked;
  contarDescripcion();
}

function pintarCabecera() {
  const titulo = (propiedad && propiedad.titulo) || "Nueva propiedad";
  $("[data-cabecera]").textContent = titulo;
  document.title = `${titulo} · Panel SIRO`;
  $("[data-referencia]").textContent = propiedad ? propiedad.referencia : "La referencia se asigna al guardar";

  const ver = $("[data-ver-web]");
  const visible = propiedad && propiedad.estado !== "borrador";
  ver.classList.toggle("hidden", !visible);
  if (visible) ver.href = publicUrl(propiedad);

  $("[data-eliminar]").classList.toggle("hidden", !propiedad);
  pintarGuardado();
}

function pintarGuardado(texto) {
  const msg = texto
    || (sucio ? "Hay cambios sin guardar"
      : propiedad ? `Guardado · ${formatFecha(propiedad.updated_at)}` : "Sin guardar todavía");
  $$("[data-estado-guardado]").forEach((el) => {
    el.textContent = msg;
    el.classList.toggle("text-[#8a5a00]", sucio && !texto);
  });
}

/* ---------- Lectura y validación ---------- */

function leerFormulario() {
  const datos = {};
  TEXTOS.forEach((k) => {
    const v = (form[k].value ?? "").toString().trim();
    datos[k] = v === "" ? null : v;
  });
  ENTEROS.forEach((k) => {
    const v = form[k].value.replace(/\D/g, "");
    datos[k] = v === "" ? null : parseInt(v, 10);
  });
  DECIMALES.forEach((k) => {
    const v = form[k].value.trim().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(v);
    datos[k] = Number.isFinite(n) ? n : null;
  });
  BOOLEANOS.forEach((k) => (datos[k] = form[k].checked));
  datos.caracteristicas = $$('input[name="caracteristicas"]:checked').map((c) => c.value);
  return datos;
}

function leerPrivado() {
  const priv = {};
  PRIVADOS.forEach((k) => {
    const v = form[k].value.trim();
    priv[k] = v === "" ? null : v;
  });
  return priv;
}

function mostrarValidacion(errores, avisos) {
  const box = $("[data-validacion]");
  if (!errores.length && !avisos.length) {
    box.classList.add("hidden");
    return;
  }
  const lista = (items) => items.map((t) => `<li>${t}</li>`).join("");
  box.className = `mb-4 rounded-lg p-3 text-sm ${errores.length ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#fdf0d8] text-[#6b4600]"}`;
  box.innerHTML = errores.length
    ? `<p class="font-semibold mb-1">Para publicarla falta:</p><ul class="list-disc pl-5 space-y-1">${lista(errores)}</ul>`
    : `<p class="font-semibold mb-1">Sugerencias:</p><ul class="list-disc pl-5 space-y-1">${lista(avisos)}</ul>`;
}

function marcarInvalidos(datos) {
  form.titulo.setAttribute("aria-invalid", String(!datos.titulo));
  form.municipio.setAttribute("aria-invalid", String(!datos.municipio));
}

/* ---------- Guardar ---------- */

async function guardar() {
  if (guardando) return;
  if (galeria.ocupada) return toast("Espera a que terminen de optimizarse las fotos.", { error: true });

  const datos = leerFormulario();
  const priv = leerPrivado();
  marcarInvalidos(datos);
  const { errores, avisos } = validarPublicacion(datos, galeria.count);
  mostrarValidacion(errores, avisos);
  if (errores.length) {
    toast(errores[0], { error: true });
    if (!datos.titulo) form.titulo.focus();
    else if (!datos.municipio) form.municipio.focus();
    return;
  }

  guardando = true;
  $$("[data-guardar]").forEach((b) => (b.disabled = true));
  pintarGuardado("Guardando…");

  try {
    if (!propiedad) {
      // Se crea primero como borrador: así nunca se publica sin sus fotos.
      const nueva = await crearPropiedad({ ...datos, estado: "borrador" }, priv);
      propiedad = { ...nueva, estado: "borrador" };
      history.replaceState(null, "", `/admin/editar?id=${nueva.id}`);
    }

    await galeria.guardar(propiedad.id, (msg) => pintarGuardado(msg));

    const slug = propertySlug(datos.titulo, propiedad.referencia);
    const { data, error } = await supabase
      .from("properties")
      .update({ ...datos, slug })
      .eq("id", propiedad.id)
      .select("*")
      .single();
    if (error) throw error;

    const { error: errPriv } = await supabase
      .from("property_private")
      .upsert({ property_id: propiedad.id, ...priv });
    if (errPriv) throw errPriv;

    propiedad = data;
    sucio = false;
    pintarCabecera();
    toast(data.estado === "borrador" ? "Borrador guardado." : "Guardado. Los cambios ya están en la web.");
  } catch (err) {
    pintarGuardado("No se ha podido guardar");
    toast(errorMessage(err), { error: true });
  } finally {
    guardando = false;
    $$("[data-guardar]").forEach((b) => (b.disabled = false));
  }
}

/* ---------- Eventos ---------- */

function marcarSucio() {
  sucio = true;
  pintarGuardado();
}

function formatearMiles(nombre, valor) {
  return ["precio", "gastos_comunidad"].includes(nombre)
    ? Number(valor).toLocaleString("es-ES", { useGrouping: "always" })
    : String(valor);
}

function contarDescripcion() {
  const n = form.descripcion.value.trim().length;
  $("[data-contador-desc]").textContent = `${n} caracteres`;
}

function conectarEventos() {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    guardar();
  });
  form.addEventListener("input", marcarSucio);
  form.addEventListener("change", marcarSucio);

  $$('input[name="operacion"]').forEach((r) =>
    r.addEventListener("change", () => actualizarEstados(form.operacion.value))
  );
  form.estado.addEventListener("change", () => {
    $("[data-ayuda-estado]").textContent = AYUDA_ESTADO[form.estado.value];
    const { errores, avisos } = validarPublicacion(leerFormulario(), galeria.count);
    mostrarValidacion(errores, avisos);
  });
  form.precio_a_consultar.addEventListener("change", () => {
    form.precio.disabled = form.precio_a_consultar.checked;
  });
  ["precio", "gastos_comunidad"].forEach((k) =>
    form[k].addEventListener("blur", () => {
      const v = form[k].value.replace(/\D/g, "");
      form[k].value = v ? formatearMiles(k, parseInt(v, 10)) : "";
    })
  );
  form.descripcion.addEventListener("input", contarDescripcion);
  form.titulo.addEventListener("input", () => form.titulo.removeAttribute("aria-invalid"));
  form.municipio.addEventListener("input", () => form.municipio.removeAttribute("aria-invalid"));

  // Cmd/Ctrl + S guarda
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      guardar();
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (sucio || galeria.ocupada) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  $("[data-eliminar]").addEventListener("click", async (e) => {
    if (!propiedad) return;
    const ok = confirm(`¿Eliminar «${propiedad.titulo}» (${propiedad.referencia})?\n\nSe borrarán también todas sus fotos. No se puede deshacer.`);
    if (!ok) return;
    e.currentTarget.disabled = true;
    try {
      await eliminarPropiedad(propiedad.id);
      sucio = false;
      location.replace("/admin/panel");
    } catch (err) {
      e.currentTarget.disabled = false;
      toast(errorMessage(err), { error: true });
    }
  });
}
