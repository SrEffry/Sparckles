import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { borrarRetencionesDe } from "@/lib/retencionesDeDocumentos";
import { reversarAsientoDe } from "@/lib/asientoAutomatico";
import { hoyBogota } from "@/lib/fechas";

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const soporte = await prisma.documentoSoporte.findUnique({ where: { id } });
  if (!soporte || soporte.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  return NextResponse.json({ soporte });
}

// PATCH → anular (documento: no se borra)
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const soporte = await prisma.documentoSoporte.findUnique({ where: { id } });
  if (!soporte || soporte.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* opcional */
  }

  if (body.accion === "anular") {
    if (soporte.estado === "Anulado")
      return NextResponse.json({ error: "El documento ya está anulado." }, { status: 400 });

    const actualizado = await prisma.$transaction(async (tx) => {
      // Un documento anulado NO practicó retención. Dejarla en la tabla la metía en el
      // certificado del proveedor, que entonces contradecía la declaración mensual del
      // agente: el tercero descontaría algo que nadie consignó.
      await borrarRetencionesDe(tx, { documentoSoporteId: id });
      // Y el asiento se reversa con un contraasiento, no se borra.
      await reversarAsientoDe(tx, {
        usuarioId: sesion.id,
        asientoId: soporte.asientoId,
        fecha: hoyBogota(),
        motivo: `Documento soporte ${soporte.numero} anulado`,
      });
      return tx.documentoSoporte.update({
        where: { id },
        data: {
          estado: "Anulado",
          fechaAnulacion: hoyBogota(),
          motivoAnulacion: (body.motivo || "").trim() || null,
        },
      });
    });
    return NextResponse.json({ soporte: actualizado });
  }

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}
