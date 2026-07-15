import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

const n = (v) => Number(v || 0);

// GET /api/resumen → agregados del usuario para los hubs (Dashboard/Operaciones/Finanzas)
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const uid = sesion.id;

  const [
    facturasAgg,
    facturasCount,
    facturasAnuladas,
    clientesCount,
    productosCount,
    empleadosActivos,
    comprasAgg,
    comprasCount,
    notasCount,
    asientosCount,
    empresasCount,
    soportesAgg,
    ultimasFacturas,
  ] = await Promise.all([
    prisma.factura.aggregate({
      where: { usuarioId: uid, estado: "emitida" },
      _sum: { totalACobrar: true, iva: true, retenciones: true, subtotal: true },
    }),
    prisma.factura.count({ where: { usuarioId: uid } }),
    prisma.factura.count({ where: { usuarioId: uid, estado: "anulada" } }),
    prisma.cliente.count({ where: { usuarioId: uid } }),
    prisma.producto.count({ where: { usuarioId: uid } }),
    prisma.empleado.count({ where: { usuarioId: uid, activo: true } }),
    prisma.compra.aggregate({
      where: { usuarioId: uid },
      _sum: { totalAPagar: true, totalIva: true, totalRetenciones: true },
    }),
    prisma.compra.count({ where: { usuarioId: uid } }),
    prisma.nota.count({ where: { usuarioId: uid } }),
    prisma.asiento.count({ where: { usuarioId: uid } }),
    prisma.empresa.count({ where: { usuarioId: uid } }),
    prisma.documentoSoporte.aggregate({
      where: { usuarioId: uid, estado: "Emitido" },
      _sum: { neto: true, reteFuente: true, reteIca: true },
      _count: true,
    }),
    prisma.factura.findMany({
      where: { usuarioId: uid },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, numeroCompleto: true, clienteNombre: true, fecha: true, totalACobrar: true, estado: true },
    }),
  ]);

  const ivaGenerado = n(facturasAgg._sum.iva);
  const ivaDescontable = n(comprasAgg._sum.totalIva);

  return NextResponse.json({
    resumen: {
      // conteos
      empresas: empresasCount,
      clientes: clientesCount,
      productos: productosCount,
      empleadosActivos,
      facturas: facturasCount,
      facturasAnuladas,
      compras: comprasCount,
      notas: notasCount,
      asientos: asientosCount,
      soportes: soportesAgg._count,
      totalSoportes: n(soportesAgg._sum.neto),
      retencionesSoportes: n(soportesAgg._sum.reteFuente) + n(soportesAgg._sum.reteIca),
      // dinero
      totalFacturado: n(facturasAgg._sum.totalACobrar),
      totalVentas: n(facturasAgg._sum.subtotal),
      totalCompras: n(comprasAgg._sum.totalAPagar),
      ivaGenerado,
      ivaDescontable,
      ivaPorPagar: ivaGenerado - ivaDescontable,
      retencionesVentas: n(facturasAgg._sum.retenciones),
      retencionesCompras: n(comprasAgg._sum.totalRetenciones),
      // recientes
      ultimasFacturas: ultimasFacturas.map((f) => ({ ...f, totalACobrar: n(f.totalACobrar) })),
    },
  });
}
