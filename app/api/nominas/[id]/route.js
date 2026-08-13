import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { reversarAsientoDe } from "@/lib/asientoAutomatico";
import { hoyBogota } from "@/lib/fechas";

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

  const actualizada = await prisma.$transaction(async (tx) => {
    // Anular una nómina dejaba vivos el gasto de nómina y los pasivos con la EPS, el fondo y
    // el trabajador: el costo laboral del mes salía inflado y la base de la planilla PILA con
    // él. Igual que la factura y el documento soporte, se le suma el contraasiento.
    if (body.estado === "Anulada") {
      await reversarAsientoDe(tx, {
        usuarioId: sesion.id,
        asientoId: nomina.asientoId,
        fecha: hoyBogota(),
        motivo: "Nómina anulada",
      });
    }
    return tx.nomina.update({ where: { id }, data: { estado: body.estado } });
  });
  return NextResponse.json({ nomina: actualizada });
}
