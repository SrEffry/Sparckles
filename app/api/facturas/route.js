import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { calcularFactura } from "@/lib/facturaCalc";
import { validarFactura } from "@/lib/facturaValidation";
import { hoyBogota } from "@/lib/fechas";

// GET /api/facturas → historial del usuario
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const facturas = await prisma.factura.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ facturas });
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
  const productos = await prisma.producto.findMany({
    where: { id: { in: ids }, usuarioId: sesion.id },
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
          totalDescuentos: calc.totalDescuentos,
          iva: calc.totalIva,
          retenciones: calc.totalRetenciones,
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
          items: { create: calc.lineas },
        },
        include: { items: true },
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
