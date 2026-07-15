import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

const ESTADOS = ["Pendiente", "Pagada", "Anulada"];

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const nomina = await prisma.nomina.findUnique({ where: { id } });
  if (!nomina || nomina.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Nómina no encontrada." }, { status: 404 });
  return NextResponse.json({ nomina });
}

// PATCH → cambiar estado (Pendiente | Pagada | Anulada)
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const nomina = await prisma.nomina.findUnique({ where: { id } });
  if (!nomina || nomina.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Nómina no encontrada." }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* opcional */
  }

  if (!ESTADOS.includes(body.estado))
    return NextResponse.json({ error: "Estado no válido." }, { status: 400 });

  const actualizada = await prisma.nomina.update({
    where: { id },
    data: { estado: body.estado },
  });
  return NextResponse.json({ nomina: actualizada });
}
