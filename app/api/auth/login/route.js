import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearSesion, usuarioPublico } from "@/lib/session";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Por favor complete todos los campos." }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  // Mensaje genérico para no revelar si el correo existe.
  const credencialesInvalidas = NextResponse.json(
    { error: "Correo electrónico o contraseña incorrectos." },
    { status: 401 }
  );

  if (!usuario || !usuario.activo) return credencialesInvalidas;

  const ok = await bcrypt.compare(password, usuario.password);
  if (!ok) return credencialesInvalidas;

  await crearSesion(usuario);
  return NextResponse.json({ usuario: usuarioPublico(usuario) });
}
