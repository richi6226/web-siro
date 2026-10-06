/**
 * SIRO Inmobiliaria - Listado de propiedades del panel
 */
import { requireAdmin, supabase, toast, errorMessage, formatFecha } from "./sesion.js";
import { validarPublicacion, duplicarPropiedad, eliminarPropiedad } from "./acciones.js";
import { ESTADOS, TIPOS, OPERACIONES, formatPrecio, imageUrl, publicUrl } from "../catalogo.js";

const FILTROS = [
  { id: "todas", label: "Todas", test: () => true },
  { id: "publicada", label: "Publicadas", test: (p) => p.estado === "publicada" },
  { id: "borrador", label: "Borradores", test: (p) => p.estado === "borrador" },
  { id: "reservada", label: "Reservadas", test: (p) => p.estado === "reservada" },
  { id: "cerradas", label: "Vendidas / alquiladas", test: (p) => p.estado === "vendida" || p.estado === "alquilada" }
];

const lista = document.getElementById("lista");
const filtrosEl = document.getElementById("filtros");
const buscar = document.getElementById("buscar");
const tpl = document.getElementById("tpl-fila");

let propiedades = [];
let filtro = "todas";

await requireAdmin();
await cargar();

buscar.addEventListener("input", render);

async function cargar() {
  const { data, error } = await supabase
    .from("properties")
    .select(`id, referencia, slug, titulo, operacion, tipo, estado, destacada, precio, precio_a_consultar,
             municipio, zona, cert_energetico, descripcion, updated_at,
             property_images (thumb_path, posicion)`)
    .order("updated_at", { ascending: false });

  if (error) {
    lista.innerHTML = "";
    toast(errorMessage(error), { error: true });
    return;
  }
  propiedades = data.map((p) => ({
    ...p,
    fotos: [...p.property_images].sort((a, b) => a.posicion - b.posicion)
  }));
  render();
}

function render() {
  renderFiltros();
  const q = normalizar(buscar.value);
  const activo = FILTROS.find((f) => f.id === filtro);
  const visibles = propiedades.filter(
    (p) => activo.test(p) && (!q || normalizar(`${p.titulo} ${p.referencia} ${p.municipio} ${p.zona || ""}`).includes(q))
  );

  const publicadas = propiedades.filter((p) => p.estado !== "borrador").length;
  document.getElementById("resumen").textContent = propiedades.length
    ? `${propiedades.length} en total · ${publicadas} visibles en la web`
    : "Todavía no hay ninguna propiedad.";

  lista.innerHTML = "";
  if (!visibles.length) {
    lista.appendChild(vacio(propiedades.length === 0));
    return;
  }
  visibles.forEach((p) => lista.appendChild(fila(p)));
}

function renderFiltros() {
  filtrosEl.innerHTML = "";
  FILTROS.forEach((f) => {
    const n = propiedades.filter(f.test).length;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(f.id === filtro));
    btn.className = `shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
      f.id === filtro ? "bg-[#131b2e] text-white" : "text-[#5f5e5b] hover:bg-[#efede9]"
    }`;
    btn.textContent = `${f.label} · ${n}`;
    btn.addEventListener("click", () => {
      filtro = f.id;
      render();
    });
    filtrosEl.appendChild(btn);
  });
}

function fila(p) {
  const el = tpl.content.firstElementChild.cloneNode(true);
  const editar = `/admin/editar?id=${p.id}`;
  el.querySelectorAll("[data-editar]").forEach((a) => (a.href = editar));

  const portada = p.fotos[0];
  if (portada) {
    el.querySelector("[data-foto]").src = imageUrl(portada.thumb_path);
  } else {
    el.querySelector("[data-foto]").remove();
    el.querySelector("[data-sin-foto]").classList.remove("hidden");
  }

  const badge = el.querySelector("[data-badge]");
  badge.textContent = ESTADOS[p.estado];
  badge.classList.add(`badge-${p.estado}`);
  el.querySelector("[data-destacada]").classList.toggle("hidden", !p.destacada);
  el.querySelector("[data-ref]").textContent = p.referencia;
  el.querySelector("[data-titulo]").textContent = p.titulo;
  el.querySelector("[data-meta]").textContent = [
    TIPOS[p.tipo], OPERACIONES[p.operacion], [p.zona, p.municipio].filter(Boolean).join(", ")
  ].join(" · ");
  el.querySelector("[data-precio]").textContent = formatPrecio(p);
  el.querySelector("[data-fecha]").textContent = `Editada ${formatFecha(p.updated_at)}`;

  const ver = el.querySelector("[data-ver]");
  if (p.estado === "borrador") ver.remove();
  else ver.href = publicUrl(p);

  // Cambio rápido de estado
  const select = el.querySelector("[data-estado]");
  Object.entries(ESTADOS).forEach(([valor, label]) => {
    if (valor === "alquilada" && p.operacion !== "alquiler") return;
    if (valor === "vendida" && p.operacion !== "venta") return;
    select.add(new Option(label, valor, false, valor === p.estado));
  });
  select.addEventListener("change", async () => {
    const nuevo = select.value;
    const { errores } = validarPublicacion({ ...p, estado: nuevo }, p.fotos.length);
    if (errores.length) {
      select.value = p.estado;
      toast(`No se puede publicar todavía: ${errores[0]} Ábrela para completarla.`, { error: true });
      return;
    }
    select.disabled = true;
    const { error } = await supabase.from("properties").update({ estado: nuevo }).eq("id", p.id);
    select.disabled = false;
    if (error) {
      select.value = p.estado;
      return toast(errorMessage(error), { error: true });
    }
    toast(`${p.referencia} ahora está «${ESTADOS[nuevo]}».`);
    await cargar();
  });

  el.querySelector("[data-duplicar]").addEventListener("click", async (e) => {
    e.currentTarget.disabled = true;
    try {
      const copia = await duplicarPropiedad(p.id);
      toast("Copia creada como borrador. Añádele las fotos.");
      location.href = `/admin/editar?id=${copia.id}`;
    } catch (err) {
      e.currentTarget.disabled = false;
      toast(errorMessage(err), { error: true });
    }
  });

  el.querySelector("[data-eliminar]").addEventListener("click", async (e) => {
    const ok = confirm(`¿Eliminar «${p.titulo}» (${p.referencia})?\n\nSe borrarán también todas sus fotos. No se puede deshacer.`);
    if (!ok) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await eliminarPropiedad(p.id);
      toast(`${p.referencia} eliminada.`);
      await cargar();
    } catch (err) {
      btn.disabled = false;
      toast(errorMessage(err), { error: true });
    }
  });

  return el;
}

function vacio(sinNada) {
  const box = document.createElement("div");
  box.className = "admin-card py-16 px-6 text-center flex flex-col items-center";
  box.innerHTML = sinNada
    ? `<span class="material-symbols-outlined !text-[48px] text-[#d4b26f] mb-4">real_estate_agent</span>
       <h2 class="text-2xl mb-2" style="font-family:'Playfair Display',serif">Empieza tu catálogo</h2>
       <p class="text-[#5f5e5b] mb-6 max-w-sm">Crea tu primera propiedad. Puedes guardarla como borrador y publicarla cuando esté lista.</p>
       <a href="/admin/editar" class="btn btn-primary"><span class="material-symbols-outlined">add</span>Nueva propiedad</a>`
    : `<span class="material-symbols-outlined !text-[40px] text-[#a8a59f] mb-3">search_off</span>
       <p class="text-[#5f5e5b]">No hay propiedades que coincidan.</p>`;
  return box;
}

function normalizar(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
