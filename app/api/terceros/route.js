import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { validarTercero } from "@/lib/terceroValidation";
import { pendientesDeTercero, consolidarTerceros } from "@/lib/terceros";

// GET /api/terceros?q=&pendientes=1
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") || "").trim();
  const soloPendientes = sp.get("pendientes") === "1";

  const where = { usuarioId: sesion.id };
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { razonSocial: { contains: q, mode: "insensitive" } },
      { documento: { contains: q.replace(/\D/g, "") || q } },
    ];
  }

  const terceros = await prisma.tercero.findMany({
    where,
    orderBy: { nombre: "asc" },
    include: { _count: { select: { compras: true, soportes: true } } },
  });

  const conEstado = terceros.map((t) => ({ ...t, ...pendientesDeTercero(t) }));
  return NextResponse.json({
    terceros: soloPendientes
      ? conEstado.filter((t) => t.criticos.length || t.faltantes.length)
      : conEstado,
  });
}

// POST /api/terceros → crea un tercero a mano.
//
// El camino normal es que se creen solos al registrar una compra o un documento soporte
// (`resolverTercero`). Este endpoint es para darlos de alta por adelantado o para completar la
// ficha antes de operar con ellos.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { errors, datos } = validarTercero(body);
  if (errors.length)
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const yaExiste = await prisma.tercero.findUnique({
    where: { usuarioId_documento: { usuarioId: sesion.id, documento: datos.documento } },
  });
  if (yaExiste)
    return NextResponse.json(
      { error: `Ya existe un tercero con el documento ${datos.documento}: ${yaExiste.nombre}.` },
      { status: 409 }
    );

  const tercero = await prisma.tercero.create({ data: { ...datos, usuarioId: sesion.id } });
  return NextResponse.json({ tercero }, { status: 201 });
}

// PATCH /api/terceros → { accion: 'consolidar' }
//
// Backfill: enlaza con su tercero las compras y documentos soporte anteriores al registro.
// Es idempotente —solo mira los que están sin enlazar— así que se puede repetir sin miedo.
export async function PATCH(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* body opcional */
  }

  if (body.accion !== "consolidar")
    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });

  const resumen = await consolidarTerceros(prisma, sesion.id);
  return NextResponse.json({ resumen });
}
