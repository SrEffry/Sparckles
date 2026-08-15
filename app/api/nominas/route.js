import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { calcularLiquidacion } from "@/lib/nominaCalc";
import { contabilizarYEnlazar } from "@/lib/asientoAutomatico";
import { CONTRATOS_SIN_NOMINA } from "@/lib/empleadoValidation";
import { parametrosDe, tieneAuxilioTransporte } from "@/lib/data/parametrosNomina";
import { hoyBogota } from "@/lib/fechas";

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Fecha de causación de un periodo: su último día, que es cuando se devenga la nómina del mes.
 * Nunca en el futuro — si el mes va corriendo, se causa hoy.
 */
function cierreDe(periodo) {
  const [a, m] = periodo.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0, 12)); // día 0 del mes siguiente = último del actual
  const hoy = new Date(`${hoyBogota()}T12:00:00.000Z`);
  return ultimo > hoy ? hoy : ultimo;
}

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

  // Una prestación de servicios NO se liquida por nómina: no hay relación laboral. Hacerlo deja
  // por escrito la subordinación y el pago de prestaciones, que es justo la prueba de un
  // contrato realidad (art. 23 CST) frente a la UGPP o a un juez laboral.
  if (CONTRATOS_SIN_NOMINA.has(empleado.tipoContrato || "")) {
    return NextResponse.json(
      {
        error:
          "Un contrato de prestación de servicios no se liquida por nómina: no es una relación laboral. El contratista emite cuenta de cobro o factura y el pago se registra como compra o documento soporte, con retención por honorarios o servicios.",
      },
      { status: 400 }
    );
  }

  // El mes liquidado, no la fecha en que se digita. Con él la nómina se fecha y se parametriza
  // por el periodo al que pertenece, y la restricción de la base impide liquidarlo dos veces.
  const periodo = (body.periodo || "").toString().trim() || hoyBogota().slice(0, 7);
  if (!PERIODO.test(periodo))
    return NextResponse.json({ error: "El periodo debe tener el formato AAAA-MM." }, { status: 400 });
  if (periodo > hoyBogota().slice(0, 7))
    return NextResponse.json({ error: "No se puede liquidar un periodo que aún no ha ocurrido." }, { status: 400 });

  // El tope son 30 días: el mes laboral colombiano son 30 días para todo efecto salarial y
  // prestacional (art. 134 CST), incluso en los meses de 31.
  const dias = Number(body.diasTrabajados);
  if (Number.isNaN(dias) || dias <= 0 || dias > 30)
    return NextResponse.json({ error: "Los días trabajados deben estar entre 1 y 30." }, { status: 400 });

  // La exoneración del art. 114-1 E.T. es un atributo de la EMPRESA, no del trabajador.
  const cfgEmpresa = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });

  const anio = Number(periodo.slice(0, 4));
  const calc = calcularLiquidacion({
    salarioBase: empleado.salarioBase,
    diasTrabajados: dias,
    transporte: body.transporte,
    extras: body.extras,
    recargos: body.recargos,
    comisiones: body.comisiones,
    prestamos: body.prestamos,
    otrasDeducciones: body.otrasDeducciones,
    // El costo laboral depende de la clase de riesgo del cargo y de si la empresa está
    // exonerada por el art. 114-1 E.T. Ninguno de los dos se puede deducir del salario.
    claseRiesgoArl: empleado.claseRiesgoArl || "I",
    exoneradoEmpleador: cfgEmpresa?.exoneradoParafiscales === true,
    anio,
  });

  // El auxilio de transporte no es opcional para quien gana hasta 2 SMLMV: no pagarlo es una
  // deuda laboral y desfinancia además cesantías y prima, que lo llevan en su base. Se avisa en
  // vez de imponerlo, porque quien vive en el sitio de trabajo no tiene derecho (art. 4 Ley
  // 15/1959) y eso el sistema no lo sabe.
  const params = parametrosDe(anio);
  if (
    Number(body.transporte || 0) === 0 &&
    tieneAuxilioTransporte({ salarioBase: empleado.salarioBase, smlmv: params.smlmv })
  ) {
    const propuesto = Math.round((params.auxilioTransporte / 30) * dias);
    calc.avisos.push(
      `Este salario da derecho al auxilio de transporte y se liquidó en cero. Por ${dias} días corresponderían ${propuesto.toLocaleString("es-CO")}. Solo se omite si el trabajador reside en el lugar de trabajo.`
    );
  }
  if (empleado.tipoContrato === "Aprendizaje") {
    calc.avisos.push(
      "Contrato de aprendizaje: la Ley 789/2002 le da apoyo de sostenimiento, sin prestaciones ni parafiscales, y en la etapa lectiva solo cotiza salud. Esta liquidación es de nómina ordinaria: revísala antes de pagarla."
    );
  }

  // Una nómina anulada no ocupa el periodo: si se anuló fue para rehacerla. La restricción de la
  // base no distingue estados, así que el periodo se libera renombrándolo al anular
  // (`app/api/nominas/[id]`), y aquí solo se comprueba lo que siga vivo.
  const yaLiquidada = await prisma.nomina.findFirst({
    where: { empleadoId: empleado.id, periodo, estado: { not: "Anulada" } },
  });
  if (yaLiquidada) {
    return NextResponse.json(
      {
        error: `${empleado.nombres} ${empleado.apellidos} ya tiene la nómina de ${periodo} liquidada. Anúlala primero si necesitas rehacerla: liquidarla dos veces duplica el gasto y el pasivo de seguridad social.`,
      },
      { status: 409 }
    );
  }

  const nomina = await prisma.$transaction(async (tx) => {
    const creada = await tx.nomina.create({
      data: {
        usuarioId: sesion.id,
        empleadoId: empleado.id,
        empleadoNombre: `${empleado.nombres} ${empleado.apellidos}`,
        empleadoDocumento: empleado.documento,
        empleadoCargo: empleado.cargo,
        salarioBase: empleado.salarioBase,
        periodo,
        // La nómina se fecha en el periodo que liquida, no en el día en que se digita: una
        // nómina de diciembre grabada en enero se causa en diciembre, que es el ejercicio al
        // que pertenece el gasto.
        fechaLiquidacion: cierreDe(periodo),
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
