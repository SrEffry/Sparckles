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
  comisiones,
  prestamos,
  otrasDeducciones,
  claseRiesgoArl = "I",
  exoneradoEmpleador = false,
  anio = new Date().getFullYear(),
}) {
  const sb = num(salarioBase);
  const dias = num(diasTrabajados);
  const ex = num(extras);
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

  const totalDevengos = salarioProporcional + tr + ex + co;

  // ── Bases ──
  const baseAportes = salarioProporcional + ex + co; // sin auxilio de transporte
  const basePrestacional = baseAportes + tr; // con auxilio
  const baseVacaciones = baseAportes; // sin auxilio

  // ── Deducciones del TRABAJADOR ──
  const salud = baseAportes * TARIFAS.trabajador.salud;
  const pension = baseAportes * TARIFAS.trabajador.pension;

  // Fondo de solidaridad pensional: 1% adicional desde 4 SMLMV (art. 27 Ley 100/1993). Los
  // aportes adicionales por encima de 16 SMLMV NO se liquidan aquí: son escalonados y
  // requieren la tabla completa.
  const fsp = sb >= 4 * params.smlmv ? baseAportes * 0.01 : 0;
  if (sb >= 16 * params.smlmv) {
    avisos.push(
      "Este salario supera 16 SMLMV: el fondo de solidaridad pensional tiene un aporte adicional escalonado que este módulo todavía no liquida."
    );
  }

  const totalDeducciones = salud + pension + fsp + pr + od;
  const neto = totalDevengos - totalDeducciones;

  // ── Aportes del EMPLEADOR ──
  const exonerado = aplicaExoneracion({
    exoneradoEmpleador,
    salarioBase: sb,
    smlmv: params.smlmv,
  });

  // La exoneración del art. 114-1 cubre salud, SENA e ICBF. La caja de compensación y la
  // pensión se pagan siempre.
  const saludPatronal = exonerado ? 0 : baseAportes * TARIFAS.empleador.salud;
  const sena = exonerado ? 0 : baseAportes * TARIFAS.empleador.sena;
  const icbf = exonerado ? 0 : baseAportes * TARIFAS.empleador.icbf;
  const pensionPatronal = baseAportes * TARIFAS.empleador.pension;
  const cajaCompensacion = baseAportes * TARIFAS.empleador.cajaCompensacion;
  const arl = baseAportes * tarifaArl(claseRiesgoArl);

  const totalAportesPatronales =
    saludPatronal + pensionPatronal + arl + sena + icbf + cajaCompensacion;

  // ── Prestaciones sociales (provisión del mes) ──
  const cesantias = basePrestacional * TARIFAS.prestaciones.cesantias;
  // Los intereses son el 12% ANUAL sobre las cesantías: en un mes corresponde la parte
  // proporcional a los días liquidados, no el 12% completo.
  const interesesCesantias = cesantias * TARIFAS.prestaciones.interesesCesantias * (dias / 360);
  const prima = basePrestacional * TARIFAS.prestaciones.prima;
  const vacaciones = baseVacaciones * TARIFAS.prestaciones.vacaciones;

  const totalPrestaciones = cesantias + interesesCesantias + prima + vacaciones;

  const costoTotal = totalDevengos + totalAportesPatronales + totalPrestaciones;

  return {
    diasTrabajados: dias,
    salarioProporcional: r2(salarioProporcional),
    transporte: r2(tr),
    extras: r2(ex),
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
    parametros: { anio: params.anio, smlmv: params.smlmv, claseRiesgoArl },
    avisos,
  };
}
