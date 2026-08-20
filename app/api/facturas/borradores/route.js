import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { validarBorradorFactura, pendientesParaEmitir } from "@/lib/borradorFacturaValidation";

// GET /api/facturas/borradores → lista de borradores del usuario.
//
// Va SEPARADO del historial de facturas a propósito. Son dos cosas distintas: aquí hay trabajo
// en curso, allá documentos fiscales. Mezclarlos en una sola tabla haría que los conteos y los
// totales de la pantalla sumaran documentos que no existen para la DIAN.
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const estado = sp.get("estado");

  const where = { usuarioId: sesion.id };
  // Por defecto se muestra lo que sigue vivo. Los emitidos quedan archivados y se consultan
  // pidiéndolos: son la traza de una factura que ya existe, no trabajo pendiente.
  if (estado && ["borrador", "revisado", "emitido"].includes(estado)) where.estado = estado;
  else where.estado = { in: ["borrador", "revisado"] };

  const borradores = await prisma.borradorFactura.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      factura: { select: { id: true, numeroCompleto: true, fecha: true, estado: true } },
    },
  });

  // Los nombres de cliente, en una sola consulta: la lista los necesita para ser legible y no
  // vale la pena un snapshot en el borrador (justamente lo que NO debe congelar).
  const ids = [...new Set(borradores.map((b) => b.clienteId).filter(Boolean))];
  const clientes = ids.length
    ? await prisma.cliente.findMany({
        where: { id: { in: ids }, usuarioId: sesion.id },
        select: { id: true, nombreCompleto: true },
      })
    : [];
  const nombrePorId = Object.fromEntries(clientes.map((c) => [c.id, c.nombreCompleto]));

  return NextResponse.json({
    borradores: borradores.map((b) => ({
      ...b,
      clienteNombre: b.clienteId ? nombrePorId[b.clienteId] || "(cliente eliminado)" : null,
      pendientes: pendientesParaEmitir(b),
    })),
  });
}

// POST /api/facturas/borradores → crea un borrador.
//
// No consume consecutivo DIAN ni genera asiento: no es un documento, es trabajo guardado.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { errors, datos } = validarBorradorFactura(body);
  if (errors.length)
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const borrador = await prisma.borradorFactura.create({
    data: { ...datos, usuarioId: sesion.id, estado: "borrador" },
  });

  return NextResponse.json(
    { borrador: { ...borrador, pendientes: pendientesParaEmitir(borrador) } },
    { status: 201 }
  );
}
