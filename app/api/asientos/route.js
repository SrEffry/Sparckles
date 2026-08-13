import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

// LIBRO DIARIO — SOLO LECTURA.
//
// El asiento manual suelto quedó cerrado. Un asiento sin documento que lo soporte no cumple el
// art. 124 del Decreto 2649: le falta el origen, la justificación y el periodo que se está
// ajustando. Ahora todo asiento es la CONSECUENCIA de un documento — una factura, una compra,
// un comprobante de tesorería o una nota de contabilidad.

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const asientos = await prisma.asiento.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ asientos });
}

// 410 y no 404: la ruta existió y se retiró a propósito, y el mensaje dice a dónde ir.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Los asientos ya no se crean sueltos. Un ajuste va por una Nota de contabilidad, que lo documenta y genera el asiento (art. 124 del Decreto 2649).",
      irA: "/notas-contabilidad",
    },
    { status: 410 }
  );
}
