// Sesión de servidor: JWT firmado (HS256) en cookie httpOnly. Solo se usa en el servidor
// (route handlers / server components). En Fase de endurecimiento se puede migrar a Auth.js.
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE = "sparkles_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export async function crearSesion(usuario) {
  const token = await new SignJWT({
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    nombreCompleto: usuario.nombreCompleto,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function obtenerSesion() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      apellido: payload.apellido,
      nombreCompleto: payload.nombreCompleto,
    };
  } catch {
    return null;
  }
}

export async function destruirSesion() {
  const store = await cookies();
  store.delete(COOKIE);
}

// Datos públicos del usuario (sin el hash de contraseña).
export function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    nombreCompleto: u.nombreCompleto,
    email: u.email,
  };
}
