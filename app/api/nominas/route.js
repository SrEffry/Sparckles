import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { calcularLiquidacion } from "@/lib/nominaCalc";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const nominas = await prisma.nomina.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ nominas });
}

// POST /api/nominas → liquida la nómina de un empleado (cálculo autoritativo + snapshot)
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: body.empleadoId } });
  if (!empleado || empleado.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Empleado no válido." }, { status: 400 });

  const dias = Number(body.diasTrabajados);
  if (Number.isNaN(dias) || dias <= 0 || dias > 31)
    return NextResponse.json({ error: "Los días trabajados deben estar entre 1 y 31." }, { status: 400 });

  const calc = calcularLiquidacion({
    salarioBase: empleado.salarioBase,
    diasTrabajados: dias,
    transporte: body.transporte,
    extras: body.extras,
    comisiones: body.comisiones,
    prestamos: body.prestamos,
    otrasDeducciones: body.otrasDeducciones,
  });

  const nomina = await prisma.nomina.create({
    data: {
      usuarioId: sesion.id,
      empleadoId: empleado.id,
      empleadoNombre: `${empleado.nombres} ${empleado.apellidos}`,
      empleadoDocumento: empleado.documento,
      empleadoCargo: empleado.cargo,
      salarioBase: empleado.salarioBase,
      ...calc,
      totalDevengos: calc.totalDevengos,
      totalDeducciones: calc.totalDeducciones,
      neto: calc.neto,
      estado: "Pendiente",
    },
  });

  return NextResponse.json({ nomina }, { status: 201 });
}
