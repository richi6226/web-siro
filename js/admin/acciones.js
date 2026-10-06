/**
 * SIRO Inmobiliaria - Operaciones sobre propiedades compartidas por el listado y el editor
 */
import { supabase, BUCKET, propertySlug } from "../catalogo.js";

/** Tipos para los que el certificado energético no aplica normalmente. */
const SIN_CERTIFICADO = ["garaje", "trastero", "terreno"];

/**
 * Comprueba lo mínimo para que una propiedad salga en la web.
 * Devuelve { errores, avisos }: los errores impiden publicar, los avisos no.
 */
export function validarPublicacion(p, numFotos) {
  const errores = [];
  const avisos = [];
  if (!p.titulo || !p.titulo.trim()) errores.push("Falta el título.");
  if (!p.municipio || !p.municipio.trim()) errores.push("Falta el municipio.");
  if (p.estado === "borrador") return { errores, avisos };

  if (!p.precio_a_consultar && (p.precio == null || p.precio === "")) {
    errores.push("Indica el precio o marca «Precio a consultar».");
  }
  if (numFotos < 1) errores.push("Añade al menos una foto.");
  if (!p.cert_energetico && !SIN_CERTIFICADO.includes(p.tipo)) {
    errores.push("Indica el certificado energético (es obligatorio en los anuncios). Si aún no lo tienes, elige «En trámite».");
  }
  if (!p.descripcion || p.descripcion.trim().length < 80) {
    avisos.push("La descripción es muy corta: una buena descripción ayuda a vender.");
  }
  if (numFotos > 0 && numFotos < 5) avisos.push("Con 5 fotos o más el anuncio funciona mucho mejor.");
  return { errores, avisos };
}

/** Inserta una propiedad nueva y fija su slug definitivo con la referencia generada. */
export async function crearPropiedad(datos, privado = null) {
  const temporal = propertySlug(datos.titulo, crypto.randomUUID().slice(0, 8));
  const { data: fila, error } = await supabase
    .from("properties")
    .insert({ ...datos, slug: temporal })
    .select("id, referencia")
    .single();
  if (error) throw error;

  const slug = propertySlug(datos.titulo, fila.referencia);
  const { error: errSlug } = await supabase.from("properties").update({ slug }).eq("id", fila.id);
  if (errSlug) throw errSlug;

  if (privado) {
    const { error: errPriv } = await supabase
      .from("property_private")
      .upsert({ property_id: fila.id, ...privado });
    if (errPriv) throw errPriv;
  }
  return { ...fila, slug };
}

/** Copia una propiedad (sin fotos) como borrador nuevo. */
export async function duplicarPropiedad(id) {
  const { data: original, error } = await supabase.from("properties").select("*").eq("id", id).single();
  if (error) throw error;
  const { data: privado } = await supabase
    .from("property_private")
    .select("direccion, propietario_nombre, propietario_telefono, notas")
    .eq("property_id", id)
    .maybeSingle();

  const { id: _id, referencia, slug, created_at, updated_at, publicada_at, ...resto } = original;
  return crearPropiedad(
    { ...resto, titulo: `${original.titulo} (copia)`, estado: "borrador", destacada: false },
    privado
  );
}

/** Borra la propiedad, sus filas relacionadas (en cascada) y todos sus archivos. */
export async function eliminarPropiedad(id) {
  const rutas = new Set();
  const { data: imagenes } = await supabase
    .from("property_images")
    .select("path, thumb_path")
    .eq("property_id", id);
  (imagenes || []).forEach((img) => {
    rutas.add(img.path);
    rutas.add(img.thumb_path);
  });
  const { data: archivos } = await supabase.storage.from(BUCKET).list(id, { limit: 1000 });
  (archivos || []).forEach((f) => rutas.add(`${id}/${f.name}`));

  if (rutas.size) {
    const { error: errFiles } = await supabase.storage.from(BUCKET).remove([...rutas]);
    if (errFiles) throw errFiles;
  }
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;
}
