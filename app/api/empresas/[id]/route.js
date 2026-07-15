import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarEmpresa } from "@/lib/empresaValidation";

async function empresaDelUsuario(id, usuarioId) {
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa || empresa.usuarioId !== usuarioId) return null;
  return empresa;
}

// GET /api/empresas/:id
export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const empresa = await empresaDelUsuario(id, sesion.id);
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  return NextResponse.json({ empresa });
}

// PUT /api/empresas/:id
export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await empresaDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors } = normalizarEmpresa(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({ where: { id }, data });
  return NextResponse.json({ empresa });
}

// DELETE /api/empresas/:id
export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await empresaDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

  await prisma.empresa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
