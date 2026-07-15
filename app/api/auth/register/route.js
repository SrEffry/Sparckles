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

  const nombreCompleto = (body.nombreCompleto || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  // Validación de servidor (nunca confiar en el cliente)
  if (!nombreCompleto || !email || !password) {
    return NextResponse.json({ error: "Complete todos los campos." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ingrese un correo electrónico válido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) {
    return NextResponse.json(
      { error: "Este correo electrónico ya está registrado." },
      { status: 409 }
    );
  }

  const partes = nombreCompleto.split(/\s+/);
  const nombre = partes[0];
  const apellido = partes.slice(1).join(" ") || partes[0];
  const hash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: { nombre, apellido, nombreCompleto, email, password: hash },
  });

  await crearSesion(usuario);
  return NextResponse.json({ usuario: usuarioPublico(usuario) }, { status: 201 });
}
