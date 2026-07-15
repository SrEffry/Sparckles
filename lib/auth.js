// Auth del cliente: ahora consume la API real (/api/auth/*). La sesión vive en una cookie
// httpOnly (no accesible por JS), así que el estado se obtiene con obtenerUsuarioActual().

export async function iniciarSesion(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al iniciar sesión." };
  return { usuario: data.usuario };
}

export async function registrarUsuario({ nombreCompleto, email, password }) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreCompleto, email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al crear la cuenta." };
  return { usuario: data.usuario };
}

export async function obtenerUsuarioActual() {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.usuario || null;
  } catch {
    return null;
  }
}

export async function cerrarSesion() {
  await fetch("/api/auth/logout", { method: "POST" });
}
