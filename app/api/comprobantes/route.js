import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarComprobante, validarSaldos } from "@/lib/comprobanteValidation";
import { esFechaISOValida } from "@/lib/fechas";

// GET /api/comprobantes?tipo=&estado=&desde=&hasta=
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const where = { usuarioId: sesion.id };
  const tipo = sp.get("tipo");
  if (tipo === "ingreso" || tipo === "egreso") where.tipo = tipo;
  const estado = sp.get("estado");
  if (estado) where.estado = estado;
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  if (esFechaISOValida(desde) || esFechaISOValida(hasta)) {
    where.fecha = {};
    if (esFechaISOValida(desde)) where.fecha.gte = desde;
    if (esFechaISOValida(hasta)) where.fecha.lte = hasta;
  }

  const [comprobantes, agg] = await Promise.all([
    prisma.comprobanteTesoreria.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { consecutivo: "desc" }],
      include: { aplicaciones: true, retenciones: true },
      take: 200,
    }),
    prisma.comprobanteTesoreria.aggregate({
      where: { ...where, estado: "emitido" },
      _sum: { valorBruto: true, totalRetenciones: true, neto: true },
      _count: true,
    }),
  ]);

  const n = (v) => Number(v || 0);
  return NextResponse.json({
    comprobantes,
    totales: {
      emitidos: agg._count,
      bruto: n(agg._sum.valorBruto),
      retenciones: n(agg._sum.totalRetenciones),
      neto: n(agg._sum.neto),
    },
  });
}

// POST /api/comprobantes → crea el comprobante en BORRADOR.
//
// El borrador NO afecta libros y NO consume consecutivo: así, uno descartado no deja un hueco
// en la serie. El número y el asiento se asignan al contabilizar (PATCH accion=emitir).
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, aplicaciones, retenciones, errors } = normalizarComprobante(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  // La cuenta de tesorería debe ser del usuario y estar activa.
  let cuenta = null;
  if (data.cuentaTesoreriaId) {
    cuenta = await prisma.cuentaTesoreria.findUnique({ where: { id: data.cuentaTesoreriaId } });
    if (!cuenta || cuenta.usuarioId !== sesion.id || !cuenta.activa) {
      return NextResponse.json({ error: "La caja o banco seleccionado no es válido." }, { status: 400 });
    }
  }

  try {
    const comprobante = await prisma.$transaction(async (tx) => {
      const val = await validarSaldos(tx, sesion.id, data.tipo, aplicaciones);
      if (val.errors.length) {
        const e = new Error(val.errors[0]);
        e.code = "SALDO";
        e.errores = val.errors;
        throw e;
      }

      const bruto = val.aplicaciones.reduce((a, x) => a + x.valorAplicado, 0);
      const totalRet = retenciones.reduce((a, x) => a + x.valor, 0);
      const neto = bruto - totalRet - (data.otrosDescuentos || 0);

      // Padre y luego hijos, en vez de escrituras anidadas: mezclar claves foráneas
      // escalares (usuarioId, facturaId) con `create` anidado hace que Prisma resuelva al
      // input "checked", que exige `connect` y rechaza los escalares.
      const creado = await tx.comprobanteTesoreria.create({
        data: {
          ...data,
          usuarioId: sesion.id,
          estado: "borrador",
          // Snapshot: el comprobante debe seguir mostrando de dónde salió el dinero aunque
          // la cuenta se desactive después.
          cuentaTesoreriaPuc: cuenta?.cuentaPuc || null,
          cuentaTesoreriaNombre: cuenta?.nombre || null,
          valorBruto: bruto,
          totalRetenciones: totalRet,
          neto,
          elaboradoPor: sesion.nombreCompleto || sesion.email,
          elaboradoEn: new Date(),
        },
      });

      if (val.aplicaciones.length) {
        await tx.comprobanteAplicacion.createMany({
          data: val.aplicaciones.map((a) => ({ ...a, comprobanteId: creado.id })),
        });
      }
      if (retenciones.length) {
        await tx.comprobanteRetencion.createMany({
          data: retenciones.map((r) => ({ ...r, comprobanteId: creado.id })),
        });
      }

      return tx.comprobanteTesoreria.findUnique({
        where: { id: creado.id },
        include: { aplicaciones: true, retenciones: true },
      });
    });

    return NextResponse.json({ comprobante }, { status: 201 });
  } catch (e) {
    if (e.code === "SALDO")
      return NextResponse.json({ error: e.message, errores: e.errores }, { status: 400 });
    throw e;
  }
}
