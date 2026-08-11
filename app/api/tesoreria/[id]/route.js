import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

const T = (v) => (v ?? "").toString().trim();

async function cuentaDelUsuario(id, usuarioId) {
  const c = await prisma.cuentaTesoreria.findUnique({ where: { id } });
  if (!c || c.usuarioId !== usuarioId) return null;
  return c;
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await cuentaDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const nombre = T(body.nombre) || existente.nombre;
  const cuentaPuc = T(body.cuentaPuc) || existente.cuentaPuc;
  const tipo = body.tipo === "caja" ? "caja" : body.tipo === "banco" ? "banco" : existente.tipo;

  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  const sector = mapa?.sector || "comercial";
  const cuentaPUC = await prisma.cuentaPUC.findFirst({ where: { sector, codigo: cuentaPuc } });
  if (!cuentaPUC)
    return NextResponse.json({ error: `La cuenta ${cuentaPuc} no existe en el catálogo ${sector}.` }, { status: 400 });
  if (!cuentaPUC.imputable)
    return NextResponse.json(
      { error: `La cuenta ${cuentaPuc} (${cuentaPUC.nombre}) es de agrupación y no admite movimientos.` },
      { status: 400 }
    );

  const predeterminada = body.predeterminada !== undefined ? !!body.predeterminada : existente.predeterminada;

  const cuenta = await prisma.$transaction(async (tx) => {
    if (predeterminada) {
      await tx.cuentaTesoreria.updateMany({
        where: { usuarioId: sesion.id, NOT: { id } },
        data: { predeterminada: false },
      });
    }
    return tx.cuentaTesoreria.update({
      where: { id },
      data: {
        nombre,
        cuentaPuc,
        tipo,
        medioPago: body.medioPago !== undefined ? T(body.medioPago) || null : existente.medioPago,
        gravadaGmf: tipo === "banco" && (body.gravadaGmf !== undefined ? !!body.gravadaGmf : existente.gravadaGmf),
        predeterminada,
        activa: body.activa !== undefined ? !!body.activa : existente.activa,
      },
    });
  });

  return NextResponse.json({ cuenta });
}

// Las cuentas de tesorería no son documentos fiscales, pero sí quedan referenciadas por
// comprobantes ya emitidos: se DESACTIVAN en vez de borrarse, para que un comprobante
// histórico siga mostrando de dónde salió el dinero.
export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await cuentaDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });

  const cuenta = await prisma.cuentaTesoreria.update({
    where: { id },
    data: { activa: false, predeterminada: false },
  });
  return NextResponse.json({ cuenta, desactivada: true });
}
