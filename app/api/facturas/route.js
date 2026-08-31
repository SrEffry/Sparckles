import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { construirWhere } from "@/lib/facturaFiltros";
import { emitirFactura, errorDeEmision } from "@/lib/emitirFactura";

// GET /api/facturas → historial filtrado, paginado y con agregados fiscales.
//
// Los agregados se calculan sobre EL MISMO `where` que la tabla. Antes los KPI se calculaban
// sobre el histórico completo ignorando el filtro activo, así que el número de arriba no
// correspondía a lo que se veía abajo.
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const { where, filtros, avisos } = construirWhere(sesion.id, sp);

  const size = Math.min(200, Math.max(1, Number(sp.get("size")) || 50));
  const page = Math.max(1, Number(sp.get("page")) || 1);

  // Las anuladas se excluyen de los totales, pero se CUENTAN aparte: ocultarlas sin decirlo
  // hace creer que se está viendo todo.
  const whereAnuladas = { ...where };
  delete whereAnuladas.OR;
  delete whereAnuladas.fechaAnulacion;

  const [facturas, total, agregados, anuladas, notas] = await Promise.all([
    prisma.factura.findMany({
      where,
      // Orden por fecha fiscal, no por createdAt (que es UTC y cambia de periodo de noche).
      orderBy: [{ fecha: "desc" }, { numero: "desc" }],
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.factura.count({ where }),
    prisma.factura.aggregate({
      where,
      _sum: {
        subtotal: true,
        baseGravada: true,
        baseExenta: true,
        baseExcluida: true,
        baseNoResponsable: true,
        baseSinClasificar: true,
        totalDescuentos: true,
        iva: true,
        inc: true,
        otrosImpuestos: true,
        retenciones: true,
        reteIva: true,
        reteIca: true,
        total: true,
        totalACobrar: true,
      },
    }),
    prisma.factura.count({ where: { ...whereAnuladas, estado: "anulada" } }),
    // Informativo: las notas se declaran en el periodo de SU fecha, no en el de la factura,
    // así que NO se restan de los totales de arriba.
    prisma.factura.aggregate({
      where,
      _sum: { saldoAplicadoNC: true, saldoAplicadoND: true },
    }),
  ]);

  const n = (v) => Number(v || 0);
  const s = agregados._sum;

  return NextResponse.json({
    facturas,
    paginacion: { page, size, total, paginas: Math.ceil(total / size) || 1 },
    filtros,
    avisos,
    agregados: {
      documentos: total,
      anuladasExcluidas: filtros.estado === "emitida" ? anuladas : 0,
      baseGravada: n(s.baseGravada),
      baseExenta: n(s.baseExenta),
      baseExcluida: n(s.baseExcluida),
      baseNoResponsable: n(s.baseNoResponsable),
      baseSinClasificar: n(s.baseSinClasificar),
      subtotal: n(s.subtotal),
      totalDescuentos: n(s.totalDescuentos),
      iva: n(s.iva),
      // El INC va aparte del IVA: es otro tributo, con su propio formulario, y no se
      // compensa contra el IVA descontable de las compras.
      inc: n(s.inc),
      otrosImpuestos: n(s.otrosImpuestos),
      // `total` = valor del documento (base + IVA). Es el que va a la declaración.
      total: n(s.total),
      reteFuente: n(s.retenciones),
      reteIva: n(s.reteIva),
      reteIca: n(s.reteIca),
      // `totalACobrar` = caja esperada tras retenciones. NO es ingreso ni base de ningún
      // impuesto: no corresponde a ninguna casilla de ninguna declaración.
      totalACobrar: n(s.totalACobrar),
      notaCredito: n(notas._sum.saldoAplicadoNC),
      notaDebito: n(notas._sum.saldoAplicadoND),
    },
  });
}

// POST /api/facturas → emite una factura directamente (numeración secuencial + cálculo
// autoritativo). Toda la lógica vive en `lib/emitirFactura.js`, que es el ÚNICO camino de
// emisión: este endpoint y el de emitir un borrador entran por la misma puerta.
//
// El panel ya no llega aquí: desde que toda factura nace como borrador, la pantalla de
// creación guarda y la emisión pasa por `/api/facturas/borradores/[id]/emitir`. Este endpoint
// se conserva para la emisión directa por API (cargues, integraciones), que no tiene por qué
// pasar por un borrador.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  try {
    const { factura, contabilizacion, avisos } = await emitirFactura({
      usuarioId: sesion.id,
      entrada: body,
    });
    return NextResponse.json({ factura, contabilizacion, avisos }, { status: 201 });
  } catch (e) {
    const fallo = errorDeEmision(e);
    if (fallo) {
      const { status, ...cuerpo } = fallo;
      return NextResponse.json(cuerpo, { status });
    }
    throw e;
  }
}
