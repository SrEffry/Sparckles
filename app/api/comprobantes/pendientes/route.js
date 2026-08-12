import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
// Mismo cálculo que usa la validación al emitir: si cada lado calculara el suyo, el selector
// volvería a ofrecer saldos que la emisión rechaza.
import { saldoCobrable, cobradoAlEmitir } from "@/lib/comprobanteValidation";

const n = (v) => Number(v || 0);
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

// GET /api/comprobantes/pendientes?tipo=ingreso&terceroDoc=
//
// Documentos con saldo por cobrar (ingreso) o por pagar (egreso). Es lo que alimenta el
// selector al armar un comprobante: sin esto el usuario tendría que buscar la factura a mano
// y calcular el saldo de cabeza.
//
// El saldo sale de `totalRecaudado`/`totalPagado`, que se actualizan transaccionalmente al
// contabilizar. Las facturas anuladas quedan fuera: no se recauda sobre ellas.
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const tipo = sp.get("tipo") === "egreso" ? "egreso" : "ingreso";
  const doc = (sp.get("terceroDoc") || "").trim();
  const q = (sp.get("q") || "").trim();

  if (tipo === "ingreso") {
    const facturas = await prisma.factura.findMany({
      where: {
        usuarioId: sesion.id,
        estado: "emitida",
        ...(doc ? { clienteNumeroDocumento: { contains: doc } } : {}),
        ...(q
          ? {
              OR: [
                { numeroCompleto: { contains: q, mode: "insensitive" } },
                { clienteNombre: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ fecha: "asc" }],
      select: {
        id: true,
        numeroCompleto: true,
        fecha: true,
        fechaVencimiento: true,
        formaPago: true,
        instrumentos: true,
        clienteNombre: true,
        clienteNumeroDocumento: true,
        totalACobrar: true,
        totalRecaudado: true,
        saldoAplicadoNC: true,
        saldoAplicadoND: true,
        retenciones: true,
        reteIva: true,
        reteIca: true,
        retencionesPorConcepto: true,
      },
      take: 200,
    });

    const pendientes = facturas
      .map((f) => {
        // Valor ajustado por notas: una NC posterior reduce lo que el cliente debe, y sin
        // restarla el sistema ofrecía cancelar una cartera que ya no existía.
        const cobrable = saldoCobrable(f);
        // Las de contado ya se cobraron al emitirse: sus instrumentos de pago registran el
        // recaudo. Ofrecerlas como cartera metía el ingreso al banco por segunda vez.
        const enElActo = cobradoAlEmitir(f);
        const recaudado = r2(n(f.totalRecaudado) + enElActo);
        return {
          ...f,
          totalACobrar: cobrable,
          totalRecaudado: recaudado,
          cobradaAlEmitir: enElActo,
          notaCredito: n(f.saldoAplicadoNC),
          saldo: r2(cobrable - recaudado),
        };
      })
      .filter((f) => f.saldo > 0.005);

    return NextResponse.json({ tipo, documentos: pendientes });
  }

  const compras = await prisma.compra.findMany({
    where: {
      usuarioId: sesion.id,
      ...(doc ? { proveedorNit: { contains: doc } } : {}),
      ...(q
        ? {
            OR: [
              { numFactura: { contains: q, mode: "insensitive" } },
              { proveedorNombre: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ fecha: "asc" }],
    select: {
      id: true,
      numFactura: true,
      fecha: true,
      fechaVencimiento: true,
      proveedorNombre: true,
      proveedorNit: true,
      totalAPagar: true,
      totalPagado: true,
      retenciones: true,
    },
    take: 200,
  });

  const pendientes = compras
    .map((c) => ({
      ...c,
      totalAPagar: n(c.totalAPagar),
      totalPagado: n(c.totalPagado),
      saldo: r2(n(c.totalAPagar) - n(c.totalPagado)),
    }))
    .filter((c) => c.saldo > 0.005);

  return NextResponse.json({ tipo, documentos: pendientes });
}
