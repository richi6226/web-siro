/**
 * SIRO Inmobiliaria - Sesión y utilidades comunes del panel
 */
import { supabase } from "../catalogo.js";

export { supabase };

const LOGIN_URL = "/admin/login";

/** Bloquea la página hasta confirmar que hay sesión y que la cuenta es administradora. */
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.replace(LOGIN_URL);
    return new Promise(() => {});
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    location.replace(`${LOGIN_URL}?e=permiso`);
    return new Promise(() => {});
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") location.replace(LOGIN_URL);
  });

  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = session.user.email;
  });
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", () => supabase.auth.signOut());
  });
  document.body.classList.remove("invisible");
  return session;
}

export function toast(message, { error = false } = {}) {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = `toast${error ? " is-error" : ""}`;
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined";
  icon.textContent = error ? "error" : "check_circle";
  const text = document.createElement("span");
  text.textContent = message;
  el.append(icon, text);
  root.appendChild(el);
  setTimeout(() => el.remove(), error ? 7000 : 3500);
}

/** Traduce los errores habituales de Supabase a mensajes comprensibles. */
export function errorMessage(error) {
  const msg = (error && (error.message || error.error_description)) || String(error || "");
  if (/Invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/Email not confirmed/i.test(msg)) return "Esta cuenta aún no está confirmada.";
  if (/rate limit|too many/i.test(msg)) return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  if (/Password should be at least/i.test(msg)) return "La contraseña debe tener al menos 8 caracteres.";
  if (/same_password|should be different/i.test(msg)) return "La nueva contraseña debe ser distinta de la anterior.";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  if (/JWT expired|session/i.test(msg)) return "La sesión ha caducado. Vuelve a entrar.";
  if (/row-level security|permission denied/i.test(msg)) return "No tienes permiso para hacer esto.";
  if (/duplicate key.*slug/i.test(msg)) return "Ya existe una propiedad con ese título. Cámbialo un poco.";
  return msg || "Ha ocurrido un error inesperado.";
}

export function formatFecha(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(iso));
}
