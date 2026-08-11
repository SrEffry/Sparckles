import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { calcularFactura } from "@/lib/facturaCalc";
import { validarFactura } from "@/lib/facturaValidation";
import { construirWhere } from "@/lib/facturaFiltros";
import { hoyBogota } from "@/lib/fechas";

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

// POST /api/facturas → emite una factura (numeración secuencial + cálculo autoritativo)
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  // Validación de servidor (cantidad > 0, descuento 0-100, cliente, ítems, fecha)
  const { errors } = validarFactura(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  const items = body.items;

  // Cliente y productos deben pertenecer al usuario
  const cliente = await prisma.cliente.findUnique({ where: { id: body.clienteId } });
  if (!cliente || cliente.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Cliente no válido." }, { status: 400 });

  const ids = [...new Set(items.map((i) => i.productoId).filter(Boolean))];
  // Se traen los impuestos del catálogo: la tarifa la fija la norma, no el cliente HTTP.
  const productos = await prisma.producto.findMany({
    where: { id: { in: ids }, usuarioId: sesion.id },
    include: { impuestos: { include: { impuesto: true } } },
  });
  const productosPorId = Object.fromEntries(productos.map((p) => [p.id, p]));
  if (items.some((i) => !productosPorId[i.productoId]))
    return NextResponse.json({ error: "Algún producto no es válido." }, { status: 400 });

  // La configuración define si el emisor cobra IVA y la resolución DIAN vigente.
  const config = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });
  if (!config || config.numeracionActual == null) {
    return NextResponse.json(
      { error: "Configura la facturación (resolución DIAN) antes de emitir." },
      { status: 400 }
    );
  }

  const fecha = body.fecha || hoyBogota();

  let calc;
  try {
    calc = calcularFactura({
      cliente,
      productosPorId,
      items,
      emisorResponsableIva: config.responsableIva,
      descuentoGlobalPorcentaje: Number(body.descuentoGlobalPorcentaje) || 0,
      reteIvaPorcentaje: Number(body.reteIvaPorcentaje) || 0,
      reteIcaPorMil: Number(body.reteIcaPorMil) || 0,
    });
  } catch (e) {
    if (e.code === "CONCEPTO_RETENCION_INVALIDO") {
      return NextResponse.json(
        { error: `${e.message} Corrige el producto antes de facturar.` },
        { status: 400 }
      );
    }
    throw e;
  }

  // Los instrumentos de cobro deben cuadrar con el total a cobrar (cálculo autoritativo).
  const instrumentos = Array.isArray(body.instrumentos) ? body.instrumentos : [];
  if (instrumentos.length) {
    const suma = instrumentos.reduce((a, x) => a + (Number(x.valor) || 0), 0);
    if (Math.abs(suma - Number(calc.totalACobrar)) > 1) {
      return NextResponse.json(
        { error: "Los medios de pago registrados no cuadran con el total a cobrar." },
        { status: 400 }
      );
    }
  }

  try {
    const factura = await prisma.$transaction(async (tx) => {
      // Se relee dentro de la transacción: el consecutivo debe leerse e incrementarse de forma atómica.
      const cfg = await tx.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });
      if (!cfg || cfg.numeracionActual == null) {
        const e = new Error("SIN_CONFIG");
        e.code = "SIN_CONFIG";
        throw e;
      }
      // La numeración debe estar dentro del rango autorizado...
      if (cfg.numeracionHasta != null && cfg.numeracionActual > cfg.numeracionHasta) {
        const e = new Error("RANGO");
        e.code = "RANGO";
        throw e;
      }
      // ...y la fecha de emisión debe caer dentro de la vigencia de la resolución.
      // Falla CERRADO: si la config no tiene vigencia, no se emite. Tratar "falta el dato" como
      // "no hay nada que validar" es justo lo que permitía facturar con resolución vencida.
      if (!cfg.resFecha || !cfg.resVencimiento) {
        const e = new Error("SIN_VIGENCIA");
        e.code = "SIN_VIGENCIA";
        throw e;
      }
      if (fecha > cfg.resVencimiento) {
        const e = new Error("VENCIDA");
        e.code = "VENCIDA";
        e.vencimiento = cfg.resVencimiento;
        throw e;
      }
      if (fecha < cfg.resFecha) {
        const e = new Error("ANTES_DE_RESOLUCION");
        e.code = "ANTES_DE_RESOLUCION";
        e.desde = cfg.resFecha;
        throw e;
      }

      const numero = cfg.numeracionActual;
      // El prefijo es el autorizado en la resolución; si no hay, la numeración va sin prefijo.
      // Inventar uno emitiría un número fuera de la numeración autorizada.
      const prefijo = cfg.prefijo || "";
      const consecutivo = String(numero).padStart(5, "0");
      const numeroCompleto = prefijo ? `${prefijo}-${consecutivo}` : consecutivo;

      await tx.configFacturacion.update({
        where: { usuarioId: sesion.id },
        data: { numeracionActual: numero + 1 },
      });

      return tx.factura.create({
        data: {
          usuarioId: sesion.id,
          numero,
          prefijo,
          numeroCompleto,
          fecha,
          fechaVencimiento: body.fechaVencimiento || null,
          formaPago: body.formaPago || null,
          medioPago: body.medioPago || instrumentos[0]?.medio || null,
          instrumentos: instrumentos.length
            ? instrumentos.map((x) => ({
                medio: String(x.medio),
                banco: x.banco || null,
                referencia: x.referencia || null,
                valor: Number(x.valor) || 0,
              }))
            : null,
          observaciones: (body.observaciones || "").trim() || null,
          estado: "emitida",
          // Snapshot del cliente
          clienteId: cliente.id,
          clienteNombre: cliente.nombreCompleto,
          clienteTipo: cliente.tipo,
          clienteTipoDocumento: cliente.tipo === "natural" ? cliente.tipoDocumento : "NIT",
          clienteNumeroDocumento:
            cliente.tipo === "natural" ? cliente.numeroDocumento : cliente.nit,
          clienteDv: cliente.dv || null,
          clienteTelefono: cliente.telefono || null,
          clienteEmail: cliente.email || null,
          clienteDireccion: cliente.direccion || null,
          clienteEsAgenteRetenedor: cliente.esAgenteRetenedor,
          clienteEsAutorretenedor: cliente.esAutorretenedor,
          // Totales
          subtotal: calc.subtotal,
          // Desglose por tratamiento de IVA (renglones de la declaración)
          baseGravada: calc.baseGravada,
          baseExenta: calc.baseExenta,
          baseExcluida: calc.baseExcluida,
          baseNoResponsable: calc.baseNoResponsable,
          baseSinClasificar: calc.baseSinClasificar,
          totalDescuentos: calc.totalDescuentos,
          // IVA e INC separados: el INC no es IVA, no es descontable y se declara aparte.
          iva: calc.totalIva,
          inc: calc.totalInc,
          otrosImpuestos: calc.totalOtrosImpuestos,
          retenciones: calc.totalRetenciones,
          reteIva: calc.reteIva,
          reteIca: calc.reteIca,
          total: calc.total,
          totalACobrar: calc.totalACobrar,
          retencionesPorConcepto: calc.retencionesPorConcepto,
          retencionesFiscales: calc.retencionesFiscales,
          // Snapshot del emisor (debe permitir reconstruir la representación gráfica histórica)
          emisorRazonSocial: cfg.razonSocial,
          emisorNit: cfg.nit,
          emisorRegimen: cfg.regimen,
          emisorSnapshot: {
            razonSocial: cfg.razonSocial,
            nit: cfg.nit,
            regimen: cfg.regimen,
            responsableIva: cfg.responsableIva,
            direccion: cfg.direccion,
            ciudad: cfg.ciudad,
            telefono: cfg.telefono,
            email: cfg.email,
            actividadEconomica: cfg.actividadEconomica,
            resNumero: cfg.resNumero,
            resFecha: cfg.resFecha,
            resVencimiento: cfg.resVencimiento,
            prefijo: cfg.prefijo,
            numeracionDesde: cfg.numeracionDesde,
            numeracionHasta: cfg.numeracionHasta,
            pieFact: cfg.pieFact,
          },
          // Cada línea con sus impuestos como filas hijas (un `TaxSubtotal` de UBL por
          // impuesto), para poder emitir la factura electrónica sin reconstruir el cálculo.
          items: {
            create: calc.lineas.map(({ impuestos, ...linea }) => ({
              ...linea,
              impuestos: { create: impuestos },
            })),
          },
        },
        include: { items: { include: { impuestos: true } } },
      });
    });

    return NextResponse.json({ factura }, { status: 201 });
  } catch (e) {
    if (e.code === "SIN_CONFIG")
      return NextResponse.json(
        { error: "Configura la facturación (resolución DIAN) antes de emitir." },
        { status: 400 }
      );
    if (e.code === "RANGO")
      return NextResponse.json(
        { error: "Se agotó el rango de numeración de la resolución. Solicita una nueva resolución a la DIAN." },
        { status: 400 }
      );
    if (e.code === "VENCIDA")
      return NextResponse.json(
        {
          error: `La resolución DIAN venció el ${e.vencimiento}. No se puede emitir con una resolución vencida; solicita una nueva.`,
        },
        { status: 400 }
      );
    if (e.code === "SIN_VIGENCIA")
      return NextResponse.json(
        {
          error:
            "La configuración de facturación no tiene la vigencia de la resolución DIAN (fecha de expedición y vencimiento). Complétala antes de emitir.",
        },
        { status: 400 }
      );
    if (e.code === "ANTES_DE_RESOLUCION")
      return NextResponse.json(
        {
          error: `La fecha de emisión es anterior a la resolución DIAN (expedida el ${e.desde}). No se puede facturar antes de su vigencia.`,
        },
        { status: 400 }
      );
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "Conflicto de numeración, intente de nuevo." },
        { status: 409 }
      );
    throw e;
  }
}
