/**
 * SIRO Inmobiliaria - Propiedades destacadas en la portada
 * Muestra hasta 3: primero las marcadas como «Destacada»; si no hay,
 * las más recientes disponibles. Si el catálogo está vacío, la sección no aparece.
 */
import { cargarPublicas, tarjetaPropiedad } from "./tarjetas.js";

(async () => {
  let todas;
  try {
    todas = await cargarPublicas();
  } catch {
    return;
  }
  const disponibles = todas.filter((p) => p.estado === "publicada" || p.estado === "reservada");
  const destacadas = disponibles.filter((p) => p.destacada);
  const seleccion = (destacadas.length ? destacadas : disponibles).slice(0, 3);
  if (!seleccion.length) return;

  document.getElementById("destacadas-grid").innerHTML = seleccion.map(tarjetaPropiedad).join("");
  document.getElementById("destacadas").classList.remove("hidden");
})();
