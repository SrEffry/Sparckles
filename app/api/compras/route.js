import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarCompra } from "@/lib/compraValidation";
import { registrarRetencionesDeCompra } from "@/lib/retencionesDeDocumentos";
import { contabilizarYEnlazar } from "@/lib/asientoAutomatico";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const compras = await prisma.compra.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ compras });
}

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, items, errors } = normalizarCompra(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  // La política decide si la retención cuenta al causar (aquí) o al pagar (el comprobante).
  // Las dos ramas se cablean: con `true` fijo, la política "no causar" contaba las dos veces.
  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  const causadas = mapa?.retencionesEnCausacion !== false;

  const compra = await prisma.$transaction(async (tx) => {
    const creada = await tx.compra.create({
      data: { ...data, usuarioId: sesion.id, items: { create: items } },
      include: { items: true },
    });
    // Las retenciones practicadas al proveedor van también a la tabla unificada: es lo que
    // alimenta el certificado anual.
    await registrarRetencionesDeCompra(tx, sesion.id, creada, causadas);
    // Y la compra entra al libro diario. Si falta una cuenta del mapa, queda pendiente por
    // contabilizar en vez de bloquear el registro.
    const contab = await contabilizarYEnlazar(tx, { usuarioId: sesion.id, tipo: "compra", documento: creada, mapa });
    return { ...creada, asientoId: contab.asiento?.id || null };
  });
  return NextResponse.json({ compra }, { status: 201 });
}
