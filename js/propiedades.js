/**
 * SIRO Inmobiliaria - Catálogo público con filtros
 * Los filtros se reflejan en la URL (?operacion=venta&tipo=piso…) para poder
 * compartir búsquedas y para recibir las del buscador de la portada.
 */
import { TIPOS } from "./catalogo.js";
import { cargarPublicas, tarjetaPropiedad } from "./tarjetas.js";

const PRECIOS = {
  venta: [150000, 250000, 350000, 500000, 750000, 1000000],
  alquiler: [700, 900, 1200, 1500, 2000, 3000]
};

const form = document.getElementById("filtros");
const orden = document.getElementById("orden");
const resultados = document.getElementById("resultados");
const contador = document.getElementById("contador");
const vacio = document.getElementById("vacio");

let todas = [];

const normalizar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function opcionesPrecio() {
  const select = form.precio;
  const actual = select.value;
  const lista = form.operacion.value ? PRECIOS[form.operacion.value] : PRECIOS.venta;
  const sufijo = form.operacion.value === "alquiler" ? " €/mes" : " €";
  select.length = 1;
  lista.forEach((v) => select.add(new Option(`Hasta ${v.toLocaleString("es-ES", { useGrouping: "always" })}${sufijo}`, v)));
  if ([...select.options].some((o) => o.value === actual)) select.value = actual;
}

function leerURL() {
  const params = new URLSearchParams(location.search);
  form.operacion.value = params.get("operacion") || "";
  opcionesPrecio();
  ["tipo", "precio", "habitaciones"].forEach((k) => {
    const v = params.get(k) || "";
    if ([...form[k].options].some((o) => o.value === v)) form[k].value = v;
  });
  // La ubicación puede venir escrita a mano desde la portada ("donosti", "pasai"…)
  const lugar = normalizar(params.get("municipio"));
  if (lugar) {
    const op = [...form.municipio.options].find((o) => o.value && normalizar(o.value).includes(lugar));
    form.municipio.value = op ? op.value : "";
    if (!op) form.municipio.dataset.texto = lugar;
  }
  if (params.get("orden")) orden.value = params.get("orden");
}

function escribirURL() {
  const params = new URLSearchParams();
  ["operacion", "tipo", "municipio", "precio", "habitaciones"].forEach((k) => {
    if (form[k].value) params.set(k, form[k].value);
  });
  if (orden.value !== "relevancia") params.set("orden", orden.value);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function filtrar() {
  const f = {
    operacion: form.operacion.value,
    tipo: form.tipo.value,
    municipio: form.municipio.value,
    texto: form.municipio.dataset.texto || "",
    precio: parseInt(form.precio.value, 10) || null,
    habitaciones: parseInt(form.habitaciones.value, 10) || null
  };
  let lista = todas.filter((p) =>
    (!f.operacion || p.operacion === f.operacion) &&
    (!f.tipo || p.tipo === f.tipo) &&
    (!f.municipio || p.municipio === f.municipio) &&
    (!f.texto || normalizar(`${p.municipio} ${p.zona}`).includes(f.texto)) &&
    (!f.precio || (p.precio != null && !p.precio_a_consultar && p.precio <= f.precio)) &&
    (!f.habitaciones || (p.habitaciones || 0) >= f.habitaciones)
  );

  const precio = (p) => (p.precio_a_consultar || p.precio == null ? Infinity : p.precio);
  if (orden.value === "recientes") lista.sort((a, b) => new Date(b.publicada_at) - new Date(a.publicada_at));
  if (orden.value === "precio-asc") lista.sort((a, b) => precio(a) - precio(b));
  if (orden.value === "precio-desc") lista.sort((a, b) => (precio(b) === Infinity ? -1 : precio(b)) - (precio(a) === Infinity ? -1 : precio(a)));
  if (orden.value === "relevancia") lista.sort((a, b) => Number(b.destacada) - Number(a.destacada));
  return lista;
}

function render() {
  const lista = filtrar();
  escribirURL();

  if (!todas.length) {
    contador.textContent = "";
    resultados.innerHTML = "";
    document.getElementById("vacio-titulo").textContent = "Selección en proceso";
    document.getElementById("vacio-texto").textContent =
      "Estamos preparando nuestra colección de propiedades. Cuéntanos qué buscas y te avisaremos en cuanto tengamos algo para ti.";
    document.getElementById("vacio-limpiar").classList.add("hidden");
    vacio.classList.remove("hidden");
    return;
  }

  const disponibles = lista.filter((p) => p.estado === "publicada").length;
  contador.textContent = `${lista.length} ${lista.length === 1 ? "propiedad" : "propiedades"}` +
    (disponibles !== lista.length ? ` · ${disponibles} disponibles` : "");
  resultados.innerHTML = lista.map(tarjetaPropiedad).join("");
  vacio.classList.toggle("hidden", lista.length > 0);
  if (!lista.length) {
    document.getElementById("vacio-titulo").textContent = "Sin resultados";
    document.getElementById("vacio-texto").textContent =
      "No hay propiedades que encajen con estos filtros. Prueba a ampliarlos o cuéntanos qué buscas.";
    document.getElementById("vacio-limpiar").classList.remove("hidden");
  }
}

function limpiar() {
  form.reset();
  delete form.municipio.dataset.texto;
  orden.value = "relevancia";
  opcionesPrecio();
  render();
}

(async () => {
  try {
    todas = await cargarPublicas();
  } catch {
    contador.textContent = "No se han podido cargar las propiedades. Recarga la página en unos segundos.";
    resultados.innerHTML = "";
    return;
  }

  // Solo se ofrecen los tipos y municipios que existen en el catálogo
  const tipos = [...new Set(todas.map((p) => p.tipo))].sort((a, b) => TIPOS[a].localeCompare(TIPOS[b]));
  tipos.forEach((t) => form.tipo.add(new Option(TIPOS[t], t)));
  const municipios = [...new Set(todas.map((p) => p.municipio))].sort((a, b) => a.localeCompare(b, "es"));
  municipios.forEach((m) => form.municipio.add(new Option(m, m)));

  leerURL();
  render();

  form.addEventListener("change", (e) => {
    if (e.target === form.operacion) opcionesPrecio();
    if (e.target === form.municipio) delete form.municipio.dataset.texto;
    render();
  });
  form.addEventListener("submit", (e) => e.preventDefault());
  orden.addEventListener("change", render);
  document.getElementById("limpiar").addEventListener("click", limpiar);
  document.getElementById("vacio-limpiar").addEventListener("click", limpiar);
})();
