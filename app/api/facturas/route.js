import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { calcularFactura } from "@/lib/facturaCalc";

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

  const clienteId = body.clienteId;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!clienteId) return NextResponse.json({ error: "Seleccione un cliente." }, { status: 400 });
  if (items.length === 0)
    return NextResponse.json({ error: "Agregue al menos un producto." }, { status: 400 });

  // Cliente y productos deben pertenecer al usuario
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente || cliente.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Cliente no válido." }, { status: 400 });

  const ids = [...new Set(items.map((i) => i.productoId).filter(Boolean))];
  const productos = await prisma.producto.findMany({
    where: { id: { in: ids }, usuarioId: sesion.id },
  });
  const productosPorId = Object.fromEntries(productos.map((p) => [p.id, p]));
  if (items.some((i) => !productosPorId[i.productoId]))
    return NextResponse.json({ error: "Algún producto no es válido." }, { status: 400 });

  const calc = calcularFactura({ cliente, productosPorId, items });

  try {
    const factura = await prisma.$transaction(async (tx) => {
      const config = await tx.configFacturacion.findUnique({
        where: { usuarioId: sesion.id },
      });
      if (!config || config.numeracionActual == null) {
        const e = new Error("SIN_CONFIG");
        e.code = "SIN_CONFIG";
        throw e;
      }
      if (config.numeracionHasta != null && config.numeracionActual > config.numeracionHasta) {
        const e = new Error("RANGO");
        e.code = "RANGO";
        throw e;
      }

      const numero = config.numeracionActual;
      const prefijo = config.prefijo || "FACT";
      const numeroCompleto = `${prefijo}-${String(numero).padStart(5, "0")}`;

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
          fecha: body.fecha || new Date().toISOString().slice(0, 10),
          fechaVencimiento: body.fechaVencimiento || null,
          formaPago: body.formaPago || null,
          medioPago: body.medioPago || null,
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
          retencionesPorConcepto: calc.lineas
            .filter((l) => l.extra.retencion.valor > 0)
            .map((l) => ({
              descripcion: l.descripcion,
              concepto: l.extra.retencion.nombre,
              tarifa: l.extra.retencion.tarifa,
              valor: l.extra.retencion.valor,
            })),
          // Snapshot del emisor
          emisorRazonSocial: config.razonSocial,
          emisorNit: config.nit,
          emisorRegimen: config.regimen,
          emisorSnapshot: {
            razonSocial: config.razonSocial,
            nit: config.nit,
            regimen: config.regimen,
            direccion: config.direccion,
            ciudad: config.ciudad,
            telefono: config.telefono,
            email: config.email,
            resNumero: config.resNumero,
            prefijo: config.prefijo,
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
        { error: "Se agotó el rango de numeración de la resolución." },
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
