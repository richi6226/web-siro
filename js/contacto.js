/**
 * SIRO Inmobiliaria - Formulario de contacto
 * Si se llega desde una ficha (/contacto?ref=SIRO-0007), prepara el mensaje
 * y añade la referencia al email que recibe Raquel.
 */
import { supabase } from "./catalogo.js";

const form = document.querySelector("form[action*='formsubmit']");
const ref = (new URLSearchParams(location.search).get("ref") || "").toUpperCase();

if (form && /^SIRO-\d+$/.test(ref)) {
  const oculto = document.createElement("input");
  oculto.type = "hidden";
  oculto.name = "referencia";
  oculto.value = ref;
  form.appendChild(oculto);

  const asunto = form.querySelector("input[name='_subject']");
  if (asunto) asunto.value = `Interés en ${ref} · Web SIRO Inmobiliaria`;

  const { data: p } = await supabase
    .from("properties")
    .select("titulo")
    .eq("referencia", ref)
    .neq("estado", "borrador")
    .maybeSingle();

  const mensaje = form.querySelector("textarea[name='mensaje']");
  if (mensaje && !mensaje.value) {
    mensaje.value = `Hola Raquel, me interesa la propiedad ${ref}${p ? ` («${p.titulo}»)` : ""}. ¿Podríamos concertar una visita?`;
  }
}
