import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { hoyBogota } from "@/lib/fechas";

// GET /api/facturas/:id → detalle con ítems
export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const factura = await prisma.factura.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!factura || factura.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });

  return NextResponse.json({ factura });
}

// PATCH /api/facturas/:id → anular (los documentos fiscales NO se borran, se anulan)
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const factura = await prisma.factura.findUnique({ where: { id } });
  if (!factura || factura.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* body opcional */
  }

  if (body.accion === "anular") {
    if (factura.estado === "anulada")
      return NextResponse.json({ error: "La factura ya está anulada." }, { status: 400 });
    // Se fecha la anulación: sin ella, un periodo ya declarado deja de ser reproducible.
    // Anular hoy una factura de marzo no debe cambiar lo que devolvía el filtro del
    // bimestre marzo-abril cuando se presentó la declaración.
    const actualizada = await prisma.factura.update({
      where: { id },
      data: {
        estado: "anulada",
        fechaAnulacion: hoyBogota(),
        motivoAnulacion: (body.motivo || "").trim() || null,
      },
    });
    return NextResponse.json({ factura: actualizada });
  }

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}
