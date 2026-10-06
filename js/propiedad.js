/**
 * SIRO Inmobiliaria - Ficha pública de una propiedad (/propiedades/<slug>)
 * La propiedad se busca por la referencia del final del slug (…-siro-0007),
 * así los enlaces antiguos siguen funcionando aunque cambie el título.
 */
import {
  supabase, TIPOS, ESTADOS, OPERACIONES, CONSERVACION, CARACTERISTICAS, CERTIFICADOS,
  formatPrecio, imageUrl, publicUrl, escapeHtml
} from "./catalogo.js";

const SITE = "https://www.siroinmobiliaria.com";
const TELEFONO = "34688764969";
const LETRAS = ["A", "B", "C", "D", "E", "F", "G"];
const COLORES_CERT = { A: "#00a651", B: "#50b848", C: "#bed730", D: "#fff200", E: "#fdb913", F: "#f37021", G: "#ed1c24" };
const SCHEMA_TIPO = { piso: "Apartment", atico: "Apartment", duplex: "Apartment", estudio: "Apartment", casa: "SingleFamilyResidence", chalet: "SingleFamilyResidence", caserio: "House" };

const main = document.getElementById("ficha");
const e = escapeHtml;
let fotos = [];

const referencia = (
  (location.pathname.match(/(siro-\d+)\/?$/i) || [])[1] ||
  new URLSearchParams(location.search).get("ref") || ""
).toUpperCase();

(async () => {
  if (!referencia) return noEncontrada();
  const { data: p, error } = await supabase
    .from("properties")
    .select("*, property_images (path, thumb_path, width, height, posicion)")
    .eq("referencia", referencia)
    .neq("estado", "borrador")
    .maybeSingle();

  if (error) return errorCarga();
  if (!p) return noEncontrada();

  fotos = [...p.property_images].sort((a, b) => a.posicion - b.posicion);
  if (location.pathname !== publicUrl(p)) history.replaceState(null, "", publicUrl(p));
  actualizarSEO(p);
  pintar(p);
  prepararVisor();
})();

/* ---------- Estados especiales ---------- */

function noEncontrada() {
  document.title = "Propiedad no disponible | SIRO Inmobiliaria";
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex";
  document.head.appendChild(robots);
  main.innerHTML = `
    <section class="max-w-xl mx-auto px-margin-mobile text-center py-24">
      <span class="material-symbols-outlined text-6xl text-[#d4b26f] mb-4">search_off</span>
      <h1 class="font-headline-lg text-headline-lg text-primary mb-3">Esta propiedad ya no está disponible</h1>
      <p class="text-on-surface-variant mb-8">Puede que se haya retirado. Echa un vistazo al resto del catálogo o cuéntanos qué buscas.</p>
      <div class="flex flex-wrap justify-center gap-3">
        <a href="/propiedades" class="px-6 py-3 rounded border border-outline-variant/60 text-primary font-semibold text-sm hover:border-[#131b2e]">Ver propiedades</a>
        <a href="/contacto" class="px-6 py-3 btn-gold rounded font-semibold text-sm">Contactar con Raquel</a>
      </div>
    </section>`;
}

function errorCarga() {
  main.innerHTML = `
    <section class="max-w-xl mx-auto px-margin-mobile text-center py-24">
      <h1 class="font-headline-md text-headline-md text-primary mb-3">No se ha podido cargar la propiedad</h1>
      <p class="text-on-surface-variant mb-8">Comprueba tu conexión y recarga la página.</p>
      <button onclick="location.reload()" class="px-6 py-3 btn-gold rounded font-semibold text-sm">Recargar</button>
    </section>`;
}

/* ---------- SEO ---------- */

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function resumen(p) {
  const base = [
    `${TIPOS[p.tipo]} en ${OPERACIONES[p.operacion].toLowerCase()} en ${[p.zona, p.municipio].filter(Boolean).join(", ")}`,
    p.habitaciones != null ? `${p.habitaciones} hab.` : "",
    p.m2_construidos ? `${p.m2_construidos} m²` : "",
    formatPrecio(p)
  ].filter(Boolean).join(" · ");
  const desc = (p.descripcion || "").replace(/\s+/g, " ").trim();
  return `${base}. ${desc}`.slice(0, 158).replace(/\s\S*$/, "") + (desc ? "…" : "");
}

function actualizarSEO(p) {
  const url = SITE + publicUrl(p);
  const titulo = `${p.titulo} · ${formatPrecio(p)} | SIRO Inmobiliaria`;
  const descripcion = resumen(p);
  const imagen = fotos[0] ? imageUrl(fotos[0].path) : `${SITE}/img/og-image.jpg`;

  document.title = titulo;
  setMeta('meta[name="description"]', "content", descripcion);
  setMeta('link[rel="canonical"]', "href", url);
  setMeta('meta[property="og:title"]', "content", titulo);
  setMeta('meta[property="og:image"]', "content", imagen);

  const ld = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.titulo,
    url,
    description: (p.descripcion || "").slice(0, 500),
    image: fotos.slice(0, 10).map((f) => imageUrl(f.path)),
    datePosted: p.publicada_at,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      ...(p.precio && !p.precio_a_consultar ? { price: p.precio } : {}),
      availability: p.estado === "publicada" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      businessFunction: p.operacion === "venta" ? "http://purl.org/goodrelations/v1#Sell" : "http://purl.org/goodrelations/v1#LeaseOut",
      seller: { "@type": "RealEstateAgent", name: "SIRO Inmobiliaria", telephone: "+34688764969", url: SITE + "/" }
    },
    about: {
      "@type": SCHEMA_TIPO[p.tipo] || "Place",
      ...(p.habitaciones != null ? { numberOfRooms: p.habitaciones } : {}),
      ...(p.banos != null ? { numberOfBathroomsTotal: p.banos } : {}),
      ...(p.m2_construidos ? { floorSize: { "@type": "QuantitativeValue", value: p.m2_construidos, unitCode: "MTK" } } : {}),
      address: { "@type": "PostalAddress", addressLocality: p.municipio, addressRegion: "Gipuzkoa", addressCountry: "ES" }
    }
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
}

/* ---------- Pintado ---------- */

function pintar(p) {
  const lugar = [p.zona, p.municipio].filter(Boolean).join(", ");
  const cerrada = p.estado === "vendida" || p.estado === "alquilada";

  main.innerHTML = `
  <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-6 md:pt-8">
    <div class="flex items-center gap-2 text-sm text-on-surface-variant mb-5 overflow-hidden whitespace-nowrap">
      <a href="/propiedades" class="hover:text-primary underline-offset-4 hover:underline">Propiedades</a>
      <span class="material-symbols-outlined text-[16px]">chevron_right</span>
      <span class="truncate">${e(p.municipio)}</span>
      <span class="material-symbols-outlined text-[16px]">chevron_right</span>
      <span class="font-mono text-xs">${e(p.referencia)}</span>
    </div>
    ${galeria(p)}
  </div>

  <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mt-8 md:mt-12 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-10 lg:gap-16 items-start pb-24 lg:pb-0">
    <article class="min-w-0">
      <header class="mb-8">
        <div class="flex flex-wrap gap-2 mb-4">
          <span class="text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded bg-secondary-container text-primary">${e(OPERACIONES[p.operacion])}</span>
          <span class="text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded bg-secondary-container text-primary">${e(TIPOS[p.tipo])}</span>
          ${p.estado !== "publicada" ? `<span class="text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded bg-[#131b2e] text-[#d4b26f]">${e(ESTADOS[p.estado])}</span>` : ""}
        </div>
        <h1 class="font-display-lg-mobile md:font-display-lg text-[34px] leading-[1.15] md:text-[44px] text-primary mb-3">${e(p.titulo)}</h1>
        <p class="flex items-center gap-1 text-on-surface-variant mb-5">
          <span class="material-symbols-outlined text-[20px]">location_on</span>${e(lugar)}, Gipuzkoa
        </p>
        <p class="text-[32px] font-semibold text-primary leading-none">${e(formatPrecio(p))}</p>
        ${p.gastos_comunidad ? `<p class="text-sm text-on-surface-variant mt-2">Gastos de comunidad: ${p.gastos_comunidad.toLocaleString("es-ES")} €/mes</p>` : ""}
      </header>

      ${datosClave(p)}
      ${descripcion(p)}
      ${caracteristicas(p)}
      ${certificado(p)}
      ${multimedia(p)}
      ${mapa(p)}
    </article>

    <aside class="lg:sticky lg:top-28">
      ${contacto(p, cerrada)}
    </aside>
  </div>

  ${barraMovil(p, cerrada)}`;

  main.querySelectorAll("[data-foto]").forEach((el) =>
    el.addEventListener("click", () => abrirVisor(parseInt(el.dataset.foto, 10)))
  );
  const carrusel = main.querySelector("[data-carrusel]");
  if (carrusel) {
    carrusel.addEventListener("scroll", () => {
      const i = Math.round(carrusel.scrollLeft / carrusel.clientWidth);
      main.querySelector("[data-carrusel-contador]").textContent = `${i + 1} / ${fotos.length}`;
    }, { passive: true });
  }
  main.querySelectorAll("[data-compartir]").forEach((btn) => btn.addEventListener("click", () => compartir(p)));
}

function galeria(p) {
  if (!fotos.length) {
    return `<div class="aspect-[16/9] max-h-[480px] w-full rounded-xl bg-secondary-container flex items-center justify-center text-outline">
      <span class="material-symbols-outlined text-6xl">home</span></div>`;
  }
  const alt = (i) => e(`${p.titulo} – foto ${i + 1}`);
  const movil = `
    <div class="md:hidden relative -mx-margin-mobile">
      <div data-carrusel class="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        ${fotos.map((f, i) => `
          <button type="button" data-foto="${i}" class="shrink-0 w-full snap-center aspect-[4/3] bg-secondary-container">
            <img src="${e(imageUrl(i === 0 ? f.path : f.thumb_path))}" alt="${alt(i)}" class="w-full h-full object-cover" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
          </button>`).join("")}
      </div>
      <span data-carrusel-contador class="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums">1 / ${fotos.length}</span>
    </div>`;

  const verTodas = `<button type="button" data-foto="0" class="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white/95 hover:bg-white text-primary text-sm font-semibold px-4 py-2.5 rounded-lg shadow-md">
      <span class="material-symbols-outlined text-[20px]">photo_library</span>Ver las ${fotos.length} fotos</button>`;

  const escritorio = fotos.length >= 5
    ? `<div class="hidden md:grid relative grid-cols-4 grid-rows-2 gap-2 h-[480px] rounded-xl overflow-hidden">
        ${fotos.slice(0, 5).map((f, i) => `
          <button type="button" data-foto="${i}" class="${i === 0 ? "col-span-2 row-span-2" : ""} relative overflow-hidden bg-secondary-container group">
            <img src="${e(imageUrl(i === 0 ? f.path : f.thumb_path))}" alt="${alt(i)}" class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
          </button>`).join("")}
        ${verTodas}
      </div>`
    : `<div class="hidden md:block relative h-[520px] rounded-xl overflow-hidden bg-secondary-container">
        <button type="button" data-foto="0" class="w-full h-full"><img src="${e(imageUrl(fotos[0].path))}" alt="${alt(0)}" class="w-full h-full object-cover" fetchpriority="high"></button>
        ${fotos.length > 1 ? verTodas : ""}
      </div>`;
  return movil + escritorio;
}

function datosClave(p) {
  const items = [
    p.m2_construidos && ["square_foot", `${p.m2_construidos} m²`, "construidos"],
    p.habitaciones != null && ["bed", p.habitaciones, p.habitaciones === 1 ? "habitación" : "habitaciones"],
    p.banos != null && ["bathtub", p.banos, p.banos === 1 ? "baño" : "baños"],
    p.planta && ["stairs", p.planta, "planta"]
  ].filter(Boolean);
  if (!items.length) return "";
  return `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
    ${items.map(([icono, valor, etiqueta]) => `
      <div class="bg-surface-container-low rounded-xl px-4 py-4">
        <span class="material-symbols-outlined text-[#a17f3b] mb-1">${icono}</span>
        <p class="text-xl font-semibold text-primary leading-tight">${e(valor)}</p>
        <p class="text-sm text-on-surface-variant">${etiqueta}</p>
      </div>`).join("")}
  </div>`;
}

function seccion(titulo, contenido) {
  return `<section class="border-t border-outline-variant/30 py-8">
    <h2 class="font-headline-md text-[26px] text-primary mb-5">${titulo}</h2>${contenido}</section>`;
}

function descripcion(p) {
  if (!p.descripcion) return "";
  const parrafos = p.descripcion.trim().split(/\n\s*\n/)
    .map((t) => `<p>${e(t.trim()).replace(/\n/g, "<br>")}</p>`).join("");
  return seccion("Descripción", `<div class="space-y-4 text-body-lg text-on-surface-variant leading-relaxed">${parrafos}</div>`);
}

function caracteristicas(p) {
  const filas = [
    ["Referencia", p.referencia],
    ["Tipo", TIPOS[p.tipo]],
    ["Operación", OPERACIONES[p.operacion]],
    p.m2_construidos && ["Superficie construida", `${p.m2_construidos} m²`],
    p.m2_utiles && ["Superficie útil", `${p.m2_utiles} m²`],
    p.m2_parcela && ["Parcela", `${p.m2_parcela} m²`],
    p.habitaciones != null && ["Habitaciones", p.habitaciones],
    p.banos != null && ["Baños", p.banos],
    p.planta && ["Planta", p.planta],
    p.ano_construccion && ["Año de construcción", p.ano_construccion],
    p.conservacion && ["Estado", CONSERVACION[p.conservacion]],
    p.gastos_comunidad && ["Comunidad", `${p.gastos_comunidad.toLocaleString("es-ES")} €/mes`]
  ].filter(Boolean);

  const extras = (p.caracteristicas || []).filter((c) => CARACTERISTICAS[c]);
  return seccion("Características", `
    <dl class="grid sm:grid-cols-2 gap-x-10">
      ${filas.map(([k, v]) => `<div class="flex justify-between gap-4 py-3 border-b border-outline-variant/20">
        <dt class="text-on-surface-variant">${k}</dt><dd class="font-semibold text-primary text-right">${e(v)}</dd></div>`).join("")}
    </dl>
    ${extras.length ? `<ul class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
      ${extras.map((c) => `<li class="flex items-center gap-2 text-on-surface-variant">
        <span class="material-symbols-outlined text-[20px] text-[#a17f3b]">check_circle</span>${CARACTERISTICAS[c]}</li>`).join("")}
    </ul>` : ""}`);
}

function certificado(p) {
  if (!p.cert_energetico) return "";
  if (!LETRAS.includes(p.cert_energetico)) {
    return seccion("Certificado energético", `<p class="text-on-surface-variant">Calificación energética: <strong class="text-primary">${e(CERTIFICADOS[p.cert_energetico])}</strong></p>`);
  }
  const escala = LETRAS.map((l, i) => {
    const activa = l === p.cert_energetico;
    return `<div class="flex items-center gap-3">
      <div class="h-7 rounded-r-md flex items-center pl-2 text-xs font-bold ${["C", "D", "E"].includes(l) ? "text-[#1c1c19]" : "text-white"} ${activa ? "" : "opacity-35"}"
           style="width:${34 + i * 9}%;background:${COLORES_CERT[l]}">${l}</div>
      ${activa ? `<span class="flex items-center gap-1 text-sm font-semibold text-primary"><span class="material-symbols-outlined text-[18px]">arrow_back</span>Esta vivienda</span>` : ""}
    </div>`;
  }).join("");
  const valores = [
    p.consumo_energia != null && `Consumo: <strong class="text-primary">${String(p.consumo_energia).replace(".", ",")} kWh/m² año</strong>`,
    p.emisiones_co2 != null && `Emisiones: <strong class="text-primary">${String(p.emisiones_co2).replace(".", ",")} kg CO₂/m² año</strong>`
  ].filter(Boolean).join("<br>");
  return seccion("Certificado energético", `<div class="flex flex-col gap-1.5 max-w-md mb-4">${escala}</div>
    ${valores ? `<p class="text-sm text-on-surface-variant leading-relaxed">${valores}</p>` : ""}`);
}

function embedVideo(url) {
  try {
    const u = new URL(url);
    let id;
    if (/youtu\.be$/.test(u.hostname)) id = u.pathname.slice(1);
    else if (/youtube\.com$/.test(u.hostname)) id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
    if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    if (/vimeo\.com$/.test(u.hostname)) {
      const vid = u.pathname.split("/").filter(Boolean).pop();
      if (/^\d+$/.test(vid)) return `https://player.vimeo.com/video/${vid}`;
    }
  } catch { /* URL no válida */ }
  return null;
}

function multimedia(p) {
  if (!p.video_url && !p.tour_url) return "";
  const embed = p.video_url && embedVideo(p.video_url);
  const video = p.video_url
    ? embed
      ? `<div class="aspect-video rounded-xl overflow-hidden bg-black mb-4"><iframe src="${e(embed)}" class="w-full h-full" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen title="Vídeo de la propiedad"></iframe></div>`
      : `<a href="${e(p.video_url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-outline-variant/60 text-primary font-semibold mr-3 mb-3"><span class="material-symbols-outlined">play_circle</span>Ver vídeo</a>`
    : "";
  const tour = p.tour_url
    ? `<a href="${e(p.tour_url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-5 py-3 rounded-lg btn-gold font-semibold"><span class="material-symbols-outlined">360</span>Ver tour virtual 360º</a>`
    : "";
  return seccion("Vídeo y tour virtual", video + tour);
}

function mapa(p) {
  const q = encodeURIComponent([p.zona, p.municipio, "Gipuzkoa"].filter(Boolean).join(", "));
  return seccion("Ubicación", `
    <div class="rounded-xl overflow-hidden h-72 bg-secondary-container">
      <iframe src="https://maps.google.com/maps?q=${q}&z=14&output=embed" class="w-full h-full border-0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Zona de la propiedad"></iframe>
    </div>
    <p class="text-sm text-on-surface-variant mt-3 flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">info</span>Ubicación aproximada. Te daremos la dirección exacta al concertar la visita.</p>`);
}

function enlaceWhatsApp(p) {
  const texto = `Hola Raquel, me interesa la propiedad ${p.referencia} (${p.titulo}): ${SITE}${publicUrl(p)}`;
  return `https://wa.me/${TELEFONO}?text=${encodeURIComponent(texto)}`;
}

const ICONO_WHATSAPP = `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 0 1 6.7 2.78 9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46zm8.06-17.53A11.33 11.33 0 0 0 12.04.62C5.76.62.65 5.73.65 12.01c0 2 .52 3.96 1.52 5.69L.55 23.6l6.04-1.58a11.37 11.37 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.33-8.05z"/></svg>`;

function contacto(p, cerrada) {
  const intro = cerrada
    ? `Esta propiedad ya está ${p.estado === "vendida" ? "vendida" : "alquilada"}. Si buscas algo parecido, cuéntamelo y te aviso antes de que salga al mercado.`
    : p.estado === "reservada"
      ? "Esta propiedad está reservada, pero puedes apuntarte por si la operación no sigue adelante."
      : "Te enseño la vivienda y resuelvo todas tus dudas sin compromiso.";
  return `<div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-[0_20px_50px_rgba(19,27,46,0.06)]">
    <div class="flex items-center gap-4 mb-5">
      <img src="/img/raquel.jpg" alt="Raquel Ortega" class="w-16 h-16 rounded-full object-cover">
      <div>
        <p class="font-headline-md text-xl text-primary leading-tight">Raquel Ortega</p>
        <p class="text-[11px] uppercase tracking-[0.15em] font-semibold text-[#a17f3b] mt-1">SIRO Inmobiliaria</p>
      </div>
    </div>
    <p class="text-on-surface-variant mb-6">${intro}</p>
    <div class="flex flex-col gap-3">
      <a href="${e(enlaceWhatsApp(p))}" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#131b2e] hover:bg-[#22304d] text-white font-semibold transition-colors">
        ${ICONO_WHATSAPP}Escribir por WhatsApp
      </a>
      <a href="tel:+${TELEFONO}" class="inline-flex items-center justify-center gap-2 py-3.5 rounded-lg btn-gold font-semibold">
        <span class="material-symbols-outlined text-[20px]">call</span>Llamar · 688 76 49 69
      </a>
      <a href="/contacto?ref=${encodeURIComponent(p.referencia)}" class="inline-flex items-center justify-center gap-2 py-3 rounded-lg border border-outline-variant/60 hover:border-[#131b2e] text-primary font-semibold transition-colors">
        <span class="material-symbols-outlined text-[20px]">mail</span>Pedir información
      </a>
    </div>
    <button type="button" data-compartir class="w-full mt-4 inline-flex items-center justify-center gap-2 text-sm text-on-surface-variant hover:text-primary">
      <span class="material-symbols-outlined text-[18px]">share</span>Compartir esta propiedad
    </button>
    <p class="text-xs text-on-surface-variant/70 text-center mt-4">Ref. ${e(p.referencia)}</p>
  </div>`;
}

function barraMovil(p, cerrada) {
  return `<div class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-outline-variant/30 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex items-center gap-3">
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-primary truncate">${e(formatPrecio(p))}</p>
      <p class="text-xs text-on-surface-variant truncate">${e(cerrada ? ESTADOS[p.estado] : p.referencia)}</p>
    </div>
    <a href="tel:+${TELEFONO}" class="w-12 h-12 rounded-lg border border-outline-variant/60 flex items-center justify-center text-primary" aria-label="Llamar">
      <span class="material-symbols-outlined">call</span>
    </a>
    <a href="${e(enlaceWhatsApp(p))}" target="_blank" rel="noopener" class="h-12 px-5 rounded-lg bg-[#131b2e] text-white font-semibold inline-flex items-center gap-2">
      ${ICONO_WHATSAPP}WhatsApp
    </a>
  </div>`;
}

async function compartir(p) {
  const url = SITE + publicUrl(p);
  if (navigator.share) {
    try { await navigator.share({ title: p.titulo, text: `${p.titulo} · ${formatPrecio(p)}`, url }); } catch { /* cancelado */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    const btn = main.querySelector("[data-compartir]");
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span>Enlace copiado';
    setTimeout(() => (btn.innerHTML = original), 2500);
  } catch {
    prompt("Copia este enlace:", url);
  }
}

/* ---------- Visor a pantalla completa ---------- */

const visor = document.getElementById("visor");
const pista = document.getElementById("visor-pista");
const visorContador = document.getElementById("visor-contador");

function prepararVisor() {
  pista.innerHTML = fotos.map((f, i) => `
    <div class="shrink-0 w-full h-full snap-center flex items-center justify-center p-2 md:p-10">
      <img src="${e(imageUrl(f.path))}" alt="Foto ${i + 1}" loading="lazy" class="max-w-full max-h-full object-contain select-none">
    </div>`).join("");
  pista.addEventListener("scroll", () => {
    visorContador.textContent = `${indiceVisor() + 1} / ${fotos.length}`;
  }, { passive: true });
  document.getElementById("visor-cerrar").addEventListener("click", () => visor.close());
  document.getElementById("visor-prev").addEventListener("click", () => irA(indiceVisor() - 1));
  document.getElementById("visor-next").addEventListener("click", () => irA(indiceVisor() + 1));
  visor.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") irA(indiceVisor() + 1);
    if (ev.key === "ArrowLeft") irA(indiceVisor() - 1);
  });
  visor.addEventListener("close", () => (document.body.style.overflow = ""));
}

function indiceVisor() {
  return Math.round(pista.scrollLeft / pista.clientWidth);
}

function irA(i) {
  const destino = Math.max(0, Math.min(fotos.length - 1, i));
  pista.scrollTo({ left: destino * pista.clientWidth, behavior: "smooth" });
}

function abrirVisor(i) {
  if (!fotos.length) return;
  visor.showModal();
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    pista.scrollTo({ left: i * pista.clientWidth, behavior: "instant" });
    visorContador.textContent = `${i + 1} / ${fotos.length}`;
  });
}
