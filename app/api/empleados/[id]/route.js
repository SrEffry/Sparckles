import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarEmpleado } from "@/lib/empleadoValidation";

async function empleadoDelUsuario(id, usuarioId) {
  const e = await prisma.empleado.findUnique({ where: { id } });
  if (!e || e.usuarioId !== usuarioId) return null;
  return e;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const empleado = await empleadoDelUsuario(id, sesion.id);
  if (!empleado) return NextResponse.json({ error: "Empleado no encontrado." }, { status: 404 });
  return NextResponse.json({ empleado, avisos });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await empleadoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Empleado no encontrado." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors, avisos } = normalizarEmpleado(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const empleado = await prisma.empleado.update({ where: { id }, data });
  return NextResponse.json({ empleado });
}

export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await empleadoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Empleado no encontrado." }, { status: 404 });

  await prisma.empleado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
