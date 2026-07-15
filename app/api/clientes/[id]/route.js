import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarCliente } from "@/lib/clienteValidation";

async function clienteDelUsuario(id, usuarioId) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente || cliente.usuarioId !== usuarioId) return null;
  return cliente;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const cliente = await clienteDelUsuario(id, sesion.id);
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  return NextResponse.json({ cliente });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await clienteDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors } = normalizarCliente(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  const cliente = await prisma.cliente.update({ where: { id }, data });
  return NextResponse.json({ cliente });
}

export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await clienteDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
