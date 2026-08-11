import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { proponerAsientoIngreso, proponerAsientoEgreso, balancear } from "@/lib/comprobanteCalc";

// GET /api/comprobantes/:id/propuesta
//
// Asiento que el sistema PROPONE para este comprobante. No contabiliza nada: la interfaz lo
// muestra editable y solo se registra cuando el usuario confirma. Es la diferencia entre un
// software que sugiere y uno que decide por el contador.
export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const comprobante = await prisma.comprobanteTesoreria.findUnique({
    where: { id },
    include: { aplicaciones: true, retenciones: true, cuentaTesoreria: true },
  });
  if (!comprobante || comprobante.usuarioId !== sesion.id) {
    return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });
  }

  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  if (!mapa) {
    return NextResponse.json(
      { error: "Configura el mapa de cuentas para que el sistema pueda proponer el asiento." },
      { status: 400 }
    );
  }

  let propuesta;
  try {
    const proponer = comprobante.tipo === "ingreso" ? proponerAsientoIngreso : proponerAsientoEgreso;
    propuesta = proponer({
      mapa,
      cuentaTesoreria: comprobante.cuentaTesoreria,
      aplicaciones: comprobante.aplicaciones,
      retenciones: comprobante.retenciones,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message, codigo: e.code }, { status: 400 });
  }

  // Se resuelven los nombres del catálogo: un código suelto no le dice nada al usuario que
  // tiene que revisar la propuesta.
  const codigos = [...new Set(propuesta.movimientos.map((m) => m.cuenta))];
  const cuentas = await prisma.cuentaPUC.findMany({
    where: { sector: mapa.sector, codigo: { in: codigos } },
    select: { codigo: true, nombre: true },
  });
  const nombres = new Map(cuentas.map((c) => [c.codigo, c.nombre]));

  const movimientos = propuesta.movimientos.map((m) => ({
    ...m,
    nombreCuenta: nombres.get(m.cuenta) || "(cuenta no encontrada en el catálogo)",
  }));

  return NextResponse.json({
    movimientos,
    balance: balancear(movimientos),
    // Lo que el usuario debe revisar sí o sí antes de confirmar.
    advertencias: advertencias(comprobante, mapa, propuesta),
  });
}

function advertencias(comprobante, mapa, propuesta) {
  const avisos = [];

  if (mapa.retencionesEnCausacion !== false && comprobante.retenciones.length > 0) {
    avisos.push(
      "Tu política dice que las retenciones se registran al causar el documento, así que este comprobante no las vuelve a mover. Si en realidad se registran al pagar, cámbialo en el mapa de cuentas: repetirlas duplica el saldo de retenciones."
    );
  }
  if (comprobante.tipo === "ingreso" && comprobante.retenciones.length > 0) {
    avisos.push(
      "Las retenciones no se prorratean entre abonos: el cliente las practica una sola vez. Si esta factura ya tuvo un recaudo con retención, deja este en cero."
    );
  }
  if (propuesta.gmf > 0) {
    avisos.push(
      `Se propone GMF por ${propuesta.gmf.toFixed(2)} porque la cuenta está marcada como gravada. Hay cuentas exentas y topes que el sistema no conoce: quítalo si no aplica.`
    );
  }
  if (!mapa.gmf && comprobante.tipo === "egreso") {
    avisos.push("No hay cuenta de GMF configurada, así que no se propone el 4x1000.");
  }
  return avisos;
}
