import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

// El asiento es la CONSECUENCIA de un documento, nunca el documento en sí. Ni se edita ni se
// anula por su cuenta: si se pudiera, quedaría un comprobante "Contabilizado" cuyo asiento dice
// otra cosa, y el papel que tiene el tercero dejaría de corresponder con los libros — justo lo
// que exige el art. 124 del Decreto 2649.
//
// Y el art. 125 exige numeración sucesiva y continua en los libros: un error se corrige
// registrado, no borrando la línea. Ese contraasiento lo emite la reversión del documento.

/** A dónde mandar al usuario para corregir, según el documento que generó el asiento. */
async function origenDelAsiento(asientoId) {
  const [comprobante, nota] = await Promise.all([
    prisma.comprobanteTesoreria.findFirst({ where: { asientoId }, select: { numero: true, tipo: true } }),
    prisma.notaContabilidad.findFirst({ where: { asientoId }, select: { numero: true, id: true } }),
  ]);

  if (comprobante) {
    return {
      texto: `el comprobante ${comprobante.numero}`,
      comoCorregir: `Revérsalo desde Finanzas → Comprobantes de ${comprobante.tipo}.`,
    };
  }
  if (nota) {
    return {
      texto: `la nota de contabilidad ${nota.numero}`,
      comoCorregir: "Revérsala desde Contabilidad → Notas de contabilidad.",
    };
  }
  return null;
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

export async function PUT(_request, { params }) {
  return cerrado(params);
}

export async function PATCH(_request, { params }) {
  return cerrado(params);
}

async function cerrado(params) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const asiento = await prisma.asiento.findUnique({ where: { id } });
  if (!asiento || asiento.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Asiento no encontrado." }, { status: 404 });

  const origen = await origenDelAsiento(id);
  const error = origen
    ? `Este asiento lo generó ${origen.texto} y no se modifica por separado. ${origen.comoCorregir}`
    : "El libro diario es de solo lectura. Un error se corrige con el contraasiento que emite la reversión del documento que lo originó (art. 125 del Decreto 2649).";

  return NextResponse.json({ error }, { status: 410 });
}
