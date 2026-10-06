/**
 * SIRO Inmobiliaria - Acceso al panel (login, recuperación y nueva contraseña)
 */
import { supabase, errorMessage } from "./sesion.js";

const PANEL_URL = "/admin/panel";
const views = ["view-login", "view-forgot", "view-reset"];
const flash = document.getElementById("flash");
const authHash = new URLSearchParams((window.__SIRO_AUTH_HASH || "").replace(/^#/, ""));
const isRecovery = authHash.get("type") === "recovery";

function show(id) {
  views.forEach((v) => document.getElementById(v).classList.toggle("hidden", v !== id));
  const first = document.querySelector(`#${id} input`);
  if (first) first.focus();
}

function setFlash(message, type = "error") {
  if (!message) {
    flash.classList.add("hidden");
    return;
  }
  flash.textContent = message;
  flash.className = `mb-6 rounded-lg px-4 py-3 text-sm ${
    type === "error" ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#e3f3ea] text-[#1f5c3d]"
  }`;
}

async function withBusy(form, fn) {
  const btn = form.querySelector('button[type="submit"]');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Un momento…";
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

document.querySelectorAll("[data-show]").forEach((btn) => {
  btn.addEventListener("click", () => {
    setFlash("");
    show(btn.dataset.show);
  });
});

document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = btn.parentElement.querySelector("input");
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    btn.querySelector("span").textContent = visible ? "visibility" : "visibility_off";
    btn.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  });
});

// Entrar
document.getElementById("form-login").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return setFlash("Escribe tu email y tu contraseña.");

  withBusy(form, async () => {
    setFlash("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setFlash(errorMessage(error));
    location.replace(PANEL_URL);
  });
});

// Pedir enlace de recuperación
document.getElementById("form-forgot").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.email.value.trim();
  if (!email) return setFlash("Escribe tu email.");

  withBusy(form, async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/admin/login`
    });
    if (error && /rate limit/i.test(error.message)) return setFlash(errorMessage(error));
    // Mensaje genérico: no revela si el email existe.
    setFlash("Si ese email tiene acceso al panel, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.", "ok");
    show("view-login");
  });
});

// Guardar nueva contraseña
document.getElementById("form-reset").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const password = form.password.value;
  if (password.length < 8) return setFlash("La contraseña debe tener al menos 8 caracteres.");
  if (password !== form.password2.value) return setFlash("Las dos contraseñas no coinciden.");

  withBusy(form, async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setFlash(errorMessage(error));
    location.replace(PANEL_URL);
  });
});

// Arranque
(async () => {
  if (new URLSearchParams(location.search).get("e") === "permiso") {
    setFlash("Esta cuenta no tiene acceso al panel.");
  }

  if (authHash.get("error")) {
    setFlash(
      authHash.get("error_code") === "otp_expired"
        ? "El enlace ha caducado o ya se usó. Pide uno nuevo."
        : "El enlace no es válido. Pide uno nuevo."
    );
    show("view-forgot");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (isRecovery && session) {
    show("view-reset");
    return;
  }
  if (session) {
    location.replace(PANEL_URL);
    return;
  }
  show("view-login");
})();
