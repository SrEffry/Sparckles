import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarAsiento } from "@/lib/asientoValidation";

async function asientoDelUsuario(id, usuarioId) {
  const a = await prisma.asiento.findUnique({ where: { id } });
  if (!a || a.usuarioId !== usuarioId) return null;
  return a;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const asiento = await prisma.asiento.findUnique({ where: { id }, include: { movimientos: true } });
  if (!asiento || asiento.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Asiento no encontrado." }, { status: 404 });
  return NextResponse.json({ asiento });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await asientoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Asiento no encontrado." }, { status: 404 });
  if (existente.anulado)
    return NextResponse.json({ error: "No se puede editar un asiento anulado." }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, movimientos, errors } = normalizarAsiento(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const asiento = await prisma.asiento.update({
    where: { id },
    data: { ...data, movimientos: { deleteMany: {}, create: movimientos } },
    include: { movimientos: true },
  });
  return NextResponse.json({ asiento });
}

// PATCH → anular (documento contable: no se borra)
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await asientoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Asiento no encontrado." }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* opcional */
  }

  if (body.accion === "anular") {
    if (existente.anulado)
      return NextResponse.json({ error: "El asiento ya está anulado." }, { status: 400 });
    const asiento = await prisma.asiento.update({
      where: { id },
      data: { anulado: true, motivoAnulacion: (body.motivo || "").trim() || null },
    });
    return NextResponse.json({ asiento });
  }

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}
