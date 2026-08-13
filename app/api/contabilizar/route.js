import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { contabilizarYEnlazar, TIPOS_CONTABILIZABLES } from "@/lib/asientoAutomatico";

// Documentos pendientes por contabilizar.
//
// Un documento queda pendiente cuando al emitirlo faltaba alguna cuenta del mapa. No se
// bloquea la emisión —una tarea de configuración no debe parar el negocio— pero el hueco
// tiene que ser VISIBLE y recuperable, que es justo lo que no pasaba antes: las ventas, las
// compras y la nómina no llegaban al libro por ninguna vía y nada lo decía.
//
// Este mismo endpoint hace de BACKFILL: los documentos anteriores a que existiera la
// contabilización automática también tienen `asientoId: null`, así que salen aquí y se
// contabilizan con el mismo botón.

/** Cómo se consulta y se describe cada tipo. Un solo sitio para agregar uno nuevo. */
const FUENTES = {
  factura: {
    etiqueta: "Facturas de venta",
    modelo: "factura",
    // Una factura anulada no debe entrar al libro ahora: su efecto ya no existe.
    where: { estado: { not: "anulada" } },
    orden: [{ fecha: "asc" }],
    ref: (d) => d.numeroCompleto,
    detalle: (d) => d.clienteNombre,
    valor: (d) => Number(d.total),
  },
  nota: {
    etiqueta: "Notas débito y crédito",
    modelo: "nota",
    where: {},
    orden: [{ fecha: "asc" }],
    ref: (d) => d.numero,
    detalle: (d) => `${d.motivoLabel}${d.clienteNombre ? ` — ${d.clienteNombre}` : ""}`,
    valor: (d) => Number(d.totalNota),
  },
  compra: {
    etiqueta: "Compras",
    modelo: "compra",
    where: {},
    orden: [{ fecha: "asc" }],
    ref: (d) => d.numFactura,
    detalle: (d) => d.proveedorNombre,
    valor: (d) => Number(d.totalBruto),
  },
  documento_soporte: {
    etiqueta: "Documentos soporte",
    modelo: "documentoSoporte",
    where: { estado: { not: "Anulado" } },
    orden: [{ fecha: "asc" }],
    ref: (d) => d.numero,
    detalle: (d) => d.concepto,
    valor: (d) => Number(d.bruto),
  },
  nomina: {
    etiqueta: "Nómina",
    modelo: "nomina",
    where: { estado: { not: "Anulada" } },
    orden: [{ fechaLiquidacion: "asc" }],
    ref: (d) => d.id.slice(-6).toUpperCase(),
    detalle: (d) => d.empleadoNombre,
    valor: (d) => Number(d.totalDevengos),
  },
};

async function pendientesDe(db, usuarioId, tipo) {
  const f = FUENTES[tipo];
  return db[f.modelo].findMany({
    where: { usuarioId, asientoId: null, ...f.where },
    orderBy: f.orden,
  });
}

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const grupos = [];
  let total = 0;

  for (const tipo of TIPOS_CONTABILIZABLES) {
    const f = FUENTES[tipo];
    const docs = await pendientesDe(prisma, sesion.id, tipo);
    if (docs.length === 0) continue;
    total += docs.length;
    grupos.push({
      tipo,
      etiqueta: f.etiqueta,
      cantidad: docs.length,
      // Solo una muestra: la lista existe para que el usuario reconozca qué falta, no para
      // paginar miles de documentos.
      muestra: docs.slice(0, 5).map((d) => ({
        id: d.id,
        ref: f.ref(d),
        detalle: f.detalle(d),
        valor: f.valor(d),
      })),
    });
  }

  return NextResponse.json({ total, grupos });
}

// POST → contabiliza todo lo pendiente que el mapa permita.
//
// No es todo o nada: contabiliza lo que puede y devuelve, por concepto, qué cuenta faltó para
// el resto. Un usuario al que solo le falta "Gasto de nómina" debe poder meter sus ventas al
// libro hoy y resolver la nómina después.
export async function POST() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  if (!mapa) {
    return NextResponse.json(
      { error: "Configura el mapa de cuentas antes de contabilizar." },
      { status: 400 }
    );
  }

  const resultado = { contabilizados: 0, pendientes: 0, porTipo: {}, faltantes: [] };

  for (const tipo of TIPOS_CONTABILIZABLES) {
    const docs = await pendientesDe(prisma, sesion.id, tipo);
    if (docs.length === 0) continue;
    let hechos = 0;

    for (const documento of docs) {
      // Una transacción por documento: si uno falla por un dato suyo, no arrastra a los demás.
      const r = await prisma.$transaction((tx) =>
        contabilizarYEnlazar(tx, { usuarioId: sesion.id, tipo, documento, mapa })
      );
      if (r.asiento) {
        hechos++;
      } else {
        resultado.pendientes++;
        for (const f of r.faltantes || []) {
          if (!resultado.faltantes.includes(f)) resultado.faltantes.push(f);
        }
      }
    }

    resultado.contabilizados += hechos;
    if (hechos) resultado.porTipo[FUENTES[tipo].etiqueta] = hechos;
  }

  return NextResponse.json({ ok: true, ...resultado });
}
