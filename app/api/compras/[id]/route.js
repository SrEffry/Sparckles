import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarCompra } from "@/lib/compraValidation";

async function compraDelUsuario(id, usuarioId) {
  const c = await prisma.compra.findUnique({ where: { id } });
  if (!c || c.usuarioId !== usuarioId) return null;
  return c;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const compra = await prisma.compra.findUnique({ where: { id }, include: { items: true } });
  if (!compra || compra.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });
  return NextResponse.json({ compra });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await compraDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, items, errors } = normalizarCompra(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const compra = await prisma.compra.update({
    where: { id },
    data: { ...data, items: { deleteMany: {}, create: items } },
    include: { items: true },
  });
  return NextResponse.json({ compra });
}

export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await compraDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });

  await prisma.compra.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
