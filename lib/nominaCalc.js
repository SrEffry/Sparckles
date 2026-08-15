// Liquidación de nómina — Colombia.
//
// EL COSTO LABORAL NO ES EL SALARIO. Antes este módulo solo calculaba el devengo y las dos
// deducciones del trabajador, así que el gasto de nómina salía subestimado en torno al 38%:
// faltaban los aportes del EMPLEADOR (salud, pensión, ARL y parafiscales) y las PRESTACIONES
// SOCIALES (cesantías, sus intereses, prima y vacaciones), que son provisión mensual aunque se
// paguen después (NIC 19 / Sección 28 de NIIF para Pymes).
//
// LAS BASES NO SON LA MISMA, Y AHÍ ESTÁ EL ERROR MÁS COMÚN:
//
//   Seguridad social y parafiscales → salario + extras + comisiones.
//                                     El AUXILIO DE TRANSPORTE NO cotiza: no es salario
//                                     (art. 128 CST).
//   Cesantías, intereses y prima    → lo anterior MÁS el auxilio de transporte.
//                                     Sí entra en la base prestacional (art. 7 Ley 1ª/1963).
//   Vacaciones                      → salario + extras + comisiones, SIN auxilio: las
//                                     vacaciones se disfrutan y el auxilio compensa un
//                                     desplazamiento que no ocurre.
//
// LO QUE ESTE MÓDULO NO HACE: no liquida salario integral (art. 132 CST), ni retención en la
// fuente sobre rentas de trabajo (art. 383 E.T.), ni incapacidades o licencias. Se dice para
// que nadie asuma que sí.

import {
  TARIFAS,
  tarifaArl,
  parametrosDe,
  aplicaExoneracion,
  tieneAuxilioTransporte,
  ibcTopado,
} from "@/lib/data/parametrosNomina";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (n) => Number(n) || 0;

/**
 * @param empleado       { salarioBase, claseRiesgoArl }
 * @param exoneradoEmpleador  art. 114-1 E.T., de la configuración de la empresa
 * @param anio           año de la liquidación, para los parámetros del año
 */
export function calcularLiquidacion({
  salarioBase,
  diasTrabajados,
  transporte,
  extras,
  recargos,
  comisiones,
  prestamos,
  otrasDeducciones,
  claseRiesgoArl = "I",
  exoneradoEmpleador = false,
  anio = new Date().getFullYear(),
}) {
  const sb = num(salarioBase);
  const dias = num(diasTrabajados);
  const ex = num(extras); // horas extra: salario, pero EXCLUIDAS de la base de vacaciones
  const re = num(recargos); // nocturno, dominical ordinario: sí entran en vacaciones
  const co = num(comisiones);
  const pr = num(prestamos);
  const od = num(otrasDeducciones);

  const params = parametrosDe(anio);
  const avisos = [...(params.avisos || [])];

  const salarioProporcional = (sb / 30) * dias;

  // El auxilio de transporte solo se debe hasta 2 SMLMV. Si el usuario lo digitó por encima de
  // ese tope no se le quita —puede ser un pago voluntario— pero se advierte, porque un auxilio
  // voluntario a alguien que no tiene derecho SÍ constituye salario y cambia todas las bases.
  const tr = num(transporte);
  if (tr > 0 && !tieneAuxilioTransporte({ salarioBase: sb, smlmv: params.smlmv })) {
    avisos.push(
      `Este salario supera 2 SMLMV, así que no da derecho al auxilio de transporte legal. Si el pago es voluntario, constituye salario y debe entrar en las bases de aportes.`
    );
  }

  const totalDevengos = salarioProporcional + tr + ex + re + co;

  // ── Bases ──
  // Cada una es distinta, y confundirlas es el error más común del dominio.
  const baseAportes = salarioProporcional + ex + re + co; // sin auxilio de transporte
  const basePrestacional = baseAportes + tr; // con auxilio (art. 7 Ley 1ª/1963)
  // Las VACACIONES excluyen el trabajo suplementario: el art. 192 num. 2 del CST dice que se
  // computa el salario ordinario "exceptuando el valor del trabajo en días de descanso
  // obligatorio y el valor del trabajo suplementario o de horas extras". Incluirlas
  // sobreprovisionaba el pasivo y, si se pagaban así, se pagaba de más.
  const baseVacaciones = salarioProporcional + re + co;

  // El IBC tiene piso (1 SMLMV) y techo (25 SMLMV) — art. 18 Ley 100, mod. art. 5 Ley 797/2003.
  // Solo para salud, pensión y FSP: los parafiscales van sobre la nómina completa.
  const { ibc, ajustado } = ibcTopado({ base: baseAportes, smlmv: params.smlmv, diasTrabajados: dias });
  if (ajustado === "piso") {
    avisos.push(
      `La base de aportes quedó por debajo del salario mínimo, así que se cotiza sobre el mínimo legal (art. 18 Ley 100).`
    );
  } else if (ajustado === "techo") {
    avisos.push(
      `La base supera el tope de 25 SMLMV: salud, pensión y FSP se liquidan sobre el tope. Los parafiscales van sobre la nómina completa, que no tiene ese tope.`
    );
  }

  // ── Deducciones del TRABAJADOR ──
  const salud = ibc * TARIFAS.trabajador.salud;
  const pension = ibc * TARIFAS.trabajador.pension;

  // Fondo de solidaridad pensional: 1% adicional desde 4 SMLMV (art. 27 Ley 100/1993). Los
  // aportes adicionales por encima de 16 SMLMV NO se liquidan aquí: son escalonados y
  // requieren la tabla completa.
  // El umbral se mide sobre el INGRESO BASE DE COTIZACIÓN del mes, no sobre el salario del
  // contrato: un salario de 3,9 SMLMV con comisiones puede superar los 4 SMLMV ese mes, y ahí
  // sí se debe el 1%.
  const fsp = ibc >= 4 * params.smlmv ? ibc * 0.01 : 0;
  if (ibc >= 16 * params.smlmv) {
    avisos.push(
      "Este salario supera 16 SMLMV: el fondo de solidaridad pensional tiene un aporte adicional escalonado que este módulo todavía no liquida."
    );
  }

  const totalDeducciones = salud + pension + fsp + pr + od;
  const neto = totalDevengos - totalDeducciones;

  // ── Aportes del EMPLEADOR ──
  // El art. 114-1 dice "devenguen": se mide sobre lo devengado en el mes, no sobre el salario
  // del contrato. Y cuando se pierde, se pierde sobre TODO el IBC, no solo sobre el exceso.
  const exonerado = aplicaExoneracion({
    exoneradoEmpleador,
    devengadoMes: baseAportes,
    smlmv: params.smlmv,
  });

  // La exoneración del art. 114-1 cubre salud, SENA e ICBF. La caja de compensación y la
  // pensión se pagan siempre.
  // Salud y pensión van sobre el IBC topado; los parafiscales sobre la nómina completa, que no
  // comparte el tope de 25 SMLMV.
  const saludPatronal = exonerado ? 0 : ibc * TARIFAS.empleador.salud;
  const pensionPatronal = ibc * TARIFAS.empleador.pension;
  const arl = ibc * tarifaArl(claseRiesgoArl);
  const sena = exonerado ? 0 : baseAportes * TARIFAS.empleador.sena;
  const icbf = exonerado ? 0 : baseAportes * TARIFAS.empleador.icbf;
  const cajaCompensacion = baseAportes * TARIFAS.empleador.cajaCompensacion;

  const totalAportesPatronales =
    saludPatronal + pensionPatronal + arl + sena + icbf + cajaCompensacion;

  // ── Prestaciones sociales (provisión del mes) ──
  const cesantias = basePrestacional * TARIFAS.prestaciones.cesantias;
  // Los intereses son el 12% ANUAL sobre el saldo de cesantías (art. 1 Ley 52/1975). Las
  // cesantías del mes YA vienen prorrateadas por los días, así que multiplicar otra vez por
  // `dias/360` era una doble prorrata: provisionaba 1/12 de lo debido y a 31 de diciembre la
  // provisión cubría el 8,3% de la obligación — que además se sanciona con otro tanto si no se
  // paga a tiempo.
  const interesesCesantias = cesantias * TARIFAS.prestaciones.interesesCesantias;
  const prima = basePrestacional * TARIFAS.prestaciones.prima;
  const vacaciones = baseVacaciones * TARIFAS.prestaciones.vacaciones;

  const totalPrestaciones = cesantias + interesesCesantias + prima + vacaciones;

  const costoTotal = totalDevengos + totalAportesPatronales + totalPrestaciones;

  return {
    diasTrabajados: dias,
    salarioProporcional: r2(salarioProporcional),
    transporte: r2(tr),
    extras: r2(ex),
    recargos: r2(re),
    comisiones: r2(co),

    salud: r2(salud),
    pension: r2(pension),
    fsp: r2(fsp),
    prestamos: r2(pr),
    otrasDeducciones: r2(od),

    saludPatronal: r2(saludPatronal),
    pensionPatronal: r2(pensionPatronal),
    arl: r2(arl),
    sena: r2(sena),
    icbf: r2(icbf),
    cajaCompensacion: r2(cajaCompensacion),
    exonerado,

    cesantias: r2(cesantias),
    interesesCesantias: r2(interesesCesantias),
    prima: r2(prima),
    vacaciones: r2(vacaciones),

    totalDevengos: r2(totalDevengos),
    totalDeducciones: r2(totalDeducciones),
    totalAportesPatronales: r2(totalAportesPatronales),
    totalPrestaciones: r2(totalPrestaciones),
    costoTotal: r2(costoTotal),
    neto: r2(neto),

    // Contexto de la liquidación, para el impreso y para poder auditarla después.
    parametros: { anio: params.anio, smlmv: params.smlmv, claseRiesgoArl, ibc: r2(ibc) },
    avisos,
  };
}
