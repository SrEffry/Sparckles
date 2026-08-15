import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { calcularLiquidacion } from "@/lib/nominaCalc";
import { contabilizarYEnlazar } from "@/lib/asientoAutomatico";

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

  // La exoneración del art. 114-1 E.T. es un atributo de la EMPRESA, no del trabajador.
  const cfgEmpresa = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });

  const calc = calcularLiquidacion({
    salarioBase: empleado.salarioBase,
    diasTrabajados: dias,
    transporte: body.transporte,
    extras: body.extras,
    comisiones: body.comisiones,
    prestamos: body.prestamos,
    otrasDeducciones: body.otrasDeducciones,
    // El costo laboral depende de la clase de riesgo del cargo y de si la empresa está
    // exonerada por el art. 114-1 E.T. Ninguno de los dos se puede deducir del salario.
    claseRiesgoArl: empleado.claseRiesgoArl || "I",
    exoneradoEmpleador: cfgEmpresa?.exoneradoParafiscales === true,
    anio: Number((body.fecha || "").slice(0, 4)) || new Date().getFullYear(),
  });

  const nomina = await prisma.$transaction(async (tx) => {
    const creada = await tx.nomina.create({
      data: {
        usuarioId: sesion.id,
        empleadoId: empleado.id,
        empleadoNombre: `${empleado.nombres} ${empleado.apellidos}`,
        empleadoDocumento: empleado.documento,
        empleadoCargo: empleado.cargo,
        salarioBase: empleado.salarioBase,
        // `parametros` y `avisos` son contexto de la liquidación, no columnas de la tabla.
        ...(({ parametros, avisos, ...columnas }) => columnas)(calc),
        totalDevengos: calc.totalDevengos,
        totalDeducciones: calc.totalDeducciones,
        neto: calc.neto,
        estado: "Pendiente",
      },
    });

    // La nómina entra al libro. El catálogo NIIF cargado no trae cuentas de salud y pensión
    // por pagar, así que lo normal es que quede pendiente hasta que el usuario elija las
    // suyas en el mapa: aparece en Contabilidad con el resto de pendientes.
    const contab = await contabilizarYEnlazar(tx, {
      usuarioId: sesion.id,
      tipo: "nomina",
      documento: creada,
      mapa: await tx.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } }),
    });
    return { ...creada, asientoId: contab.asiento?.id || null };
  });

  return NextResponse.json({ nomina, avisos: calc.avisos, parametros: calc.parametros }, { status: 201 });
}
