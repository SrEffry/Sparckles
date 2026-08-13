import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

// LIBRO DIARIO — SOLO LECTURA.
//
// El asiento manual suelto quedó cerrado. Un asiento sin documento que lo soporte no cumple el
// art. 124 del Decreto 2649: le falta el origen, la justificación y el periodo que se está
// ajustando. Ahora todo asiento es la CONSECUENCIA de un documento — una factura, una compra,
// un comprobante de tesorería o una nota de contabilidad.
//
// ORDEN CRONOLÓGICO. El art. 125 exige que el diario registre las operaciones en estricto
// orden cronológico. Se ordena por FECHA del documento y no por `createdAt`: un asiento del 5
// de enero registrado en marzo pertenece al 5 de enero, y ordenar por creación lo ponía al
// final del libro.

const PAGINA = 100;

export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const desde = (sp.get("desde") || "").trim();
  const hasta = (sp.get("hasta") || "").trim();
  const origen = (sp.get("origen") || "").trim();
  const q = (sp.get("q") || "").trim();
  const pagina = Math.max(1, Number(sp.get("pagina")) || 1);

  const where = {
    usuarioId: sesion.id,
    ...(desde || hasta
      ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } }
      : {}),
    ...(origen ? { tipo: origen } : {}),
    ...(q
      ? {
          OR: [
            { numero: { contains: q, mode: "insensitive" } },
            { descripcion: { contains: q, mode: "insensitive" } },
            { documentoRef: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [asientos, total, sumas] = await Promise.all([
    prisma.asiento.findMany({
      where,
      // Cronológico ascendente, y el número desempata dentro del mismo día.
      orderBy: [{ fecha: "asc" }, { numero: "asc" }],
      skip: (pagina - 1) * PAGINA,
      take: PAGINA,
    }),
    prisma.asiento.count({ where }),
    // Los totales son del FILTRO COMPLETO, no de la página: un libro que suma solo lo que se
    // ve en pantalla no sirve para cuadrar nada.
    prisma.asiento.aggregate({
      where: { ...where, anulado: false },
      _sum: { totalDebitos: true, totalCreditos: true },
    }),
  ]);

  return NextResponse.json({
    asientos,
    paginacion: { pagina, porPagina: PAGINA, total, paginas: Math.max(1, Math.ceil(total / PAGINA)) },
    totales: {
      debitos: Number(sumas._sum.totalDebitos || 0),
      creditos: Number(sumas._sum.totalCreditos || 0),
    },
  });
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
