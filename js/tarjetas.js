/**
 * SIRO Inmobiliaria - Tarjeta pública de propiedad (listado y portada)
 */
import { supabase, TIPOS, ESTADOS, formatPrecio, imageUrl, publicUrl, escapeHtml } from "./catalogo.js";

export const CAMPOS_TARJETA = `id, referencia, slug, titulo, operacion, tipo, estado, destacada, precio,
  precio_a_consultar, municipio, zona, m2_construidos, habitaciones, banos, publicada_at,
  property_images (thumb_path, posicion)`;

const ORDEN_ESTADO = { publicada: 0, reservada: 1, vendida: 2, alquilada: 2 };

/** Propiedades visibles en la web (nunca borradores, aunque haya sesión de admin abierta). */
export async function cargarPublicas(consulta = (q) => q) {
  const { data, error } = await consulta(
    supabase.from("properties").select(CAMPOS_TARJETA).neq("estado", "borrador")
  );
  if (error) throw error;
  return data
    .map((p) => ({ ...p, fotos: [...p.property_images].sort((a, b) => a.posicion - b.posicion) }))
    .sort((a, b) =>
      ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
      new Date(b.publicada_at) - new Date(a.publicada_at)
    );
}

function dato(icono, texto) {
  return `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px] text-outline">${icono}</span>${texto}</span>`;
}

export function tarjetaPropiedad(p) {
  const portada = p.fotos && p.fotos[0];
  const cerrada = ["reservada", "vendida", "alquilada"].includes(p.estado);
  const lugar = [p.zona, p.municipio].filter(Boolean).join(", ");
  const datos = [
    p.habitaciones != null && dato("bed", `${p.habitaciones} hab.`),
    p.banos != null && dato("bathtub", `${p.banos} ${p.banos === 1 ? "baño" : "baños"}`),
    p.m2_construidos != null && dato("square_foot", `${p.m2_construidos} m²`)
  ].filter(Boolean).join("");

  return `
  <a href="${escapeHtml(publicUrl(p))}" class="group flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(19,27,46,0.08)] hover:-translate-y-1 transition-all duration-300">
    <div class="relative aspect-[4/3] bg-secondary-container overflow-hidden">
      ${portada
        ? `<img src="${escapeHtml(imageUrl(portada.thumb_path))}" alt="${escapeHtml(p.titulo)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${cerrada && p.estado !== "reservada" ? "grayscale-[35%]" : ""}">`
        : `<div class="w-full h-full flex items-center justify-center text-outline"><span class="material-symbols-outlined text-5xl">home</span></div>`}
      <div class="absolute top-3 left-3 flex gap-2">
        ${p.operacion === "alquiler" ? `<span class="bg-white/95 text-[#131b2e] text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">Alquiler</span>` : ""}
        ${cerrada ? `<span class="bg-[#131b2e] text-[#d4b26f] text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">${ESTADOS[p.estado]}</span>` : ""}
      </div>
      <span class="absolute bottom-3 left-3 bg-white/95 backdrop-blur text-[#131b2e] font-semibold text-sm px-3 py-1.5 rounded shadow-sm">${escapeHtml(formatPrecio(p))}</span>
    </div>
    <div class="p-5 flex flex-col gap-2 flex-1">
      <span class="text-[11px] font-bold text-[#a17f3b] uppercase tracking-[0.15em]">${escapeHtml(TIPOS[p.tipo] || "")}</span>
      <h3 class="font-headline-md text-[22px] leading-snug text-primary">${escapeHtml(p.titulo)}</h3>
      <p class="flex items-center gap-1 text-sm text-on-surface-variant">
        <span class="material-symbols-outlined text-[16px]">location_on</span>${escapeHtml(lugar)}
      </p>
      ${datos ? `<div class="flex flex-wrap gap-x-4 gap-y-1 mt-auto pt-4 border-t border-outline-variant/20 text-sm text-on-surface-variant">${datos}</div>` : ""}
    </div>
  </a>`;
}
