import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { reversarAsientoDe } from "@/lib/asientoAutomatico";
import { hoyBogota } from "@/lib/fechas";

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const nota = await prisma.nota.findUnique({ where: { id }, include: { items: true } });
  if (!nota || nota.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });
  return NextResponse.json({ nota });
}

// DELETE → elimina la nota y REVIERTE el saldo aplicado a la factura (en transacción)
export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const nota = await prisma.nota.findUnique({ where: { id } });
  if (!nota || nota.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (nota.facturaId) {
      const factura = await tx.factura.findUnique({ where: { id: nota.facturaId } });
      if (factura) {
        const campo = nota.tipo === "credito" ? "saldoAplicadoNC" : "saldoAplicadoND";
        const actual = Number(factura[campo] || 0);
        const nuevo = Math.max(0, actual - Number(nota.totalNota));
        await tx.factura.update({ where: { id: factura.id }, data: { [campo]: nuevo } });
      }
    }
    // El asiento no se borra con la nota: se le suma el contraasiento (art. 125 D. 2649).
    await reversarAsientoDe(tx, {
      usuarioId: sesion.id,
      asientoId: nota.asientoId,
      fecha: hoyBogota(),
      motivo: `Nota ${nota.numero} eliminada`,
    });
    await tx.nota.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
