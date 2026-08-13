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

    // ORDEN DE DESHACER: en sentido inverso a la creación.
    //
    // Un soporte NORMAL se causa primero y se paga después, así que el pago se apoya en él:
    // anularlo con un pago vivo dejaría el comprobante aplicado a un documento que ya no
    // existe, y el balance con un saldo débito en proveedores que no corresponde a nada.
    //
    // Un soporte GENERADO DESDE UN PAGO es al revés —el pago existía antes— y sí se puede
    // anular: el comprobante vuelve a quedar pendiente de legalizar, que es un estado válido.
    if (!soporte.generadoDesdeComprobanteId) {
      const pagos = await prisma.comprobanteAplicacion.findMany({
        where: { documentoSoporteId: id, comprobante: { estado: "emitido" } },
        select: { valorAplicado: true, comprobante: { select: { numero: true } } },
      });
      if (pagos.length) {
        const lista = pagos.map((p) => p.comprobante.numero).join(", ");
        return NextResponse.json(
          {
            error: `No se puede anular: este documento ya fue pagado con ${lista}. Reversa primero el comprobante de egreso.`,
          },
          { status: 409 }
        );
      }
    }

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

      // Se suelta la aplicación del comprobante que lo legalizó. El pago NO se toca: la plata
      // sí salió. El comprobante vuelve a quedar pendiente de legalizar, que es el estado
      // correcto — y podrá generar otro soporte con los datos corregidos.
      await tx.comprobanteAplicacion.deleteMany({ where: { documentoSoporteId: id } });

      return tx.documentoSoporte.update({
        where: { id },
        data: {
          estado: "Anulado",
          fechaAnulacion: hoyBogota(),
          motivoAnulacion: (body.motivo || "").trim() || null,
          totalPagado: 0,
        },
      });
    });
    return NextResponse.json({ soporte: actualizado });
  }

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}
