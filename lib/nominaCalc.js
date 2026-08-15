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
  tarifaFsp,
  mensualizar,
} from "@/lib/data/parametrosNomina";
import { TABLA_RETEFUENTE_2026 } from "@/lib/data/tablaRetefuente";

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
  // Todo lo que entra se redondea AQUÍ, una sola vez. Si cada total se redondea por su cuenta,
  // el asiento descuadra por céntimos y la nómina no llega al libro diario.
  const sb = r2(num(salarioBase));
  const dias = num(diasTrabajados);
  const ex = r2(num(extras)); // horas extra: salario, pero EXCLUIDAS de la base de vacaciones
  const re = r2(num(recargos)); // nocturno, dominical ordinario: sí entran en vacaciones
  const co = r2(num(comisiones));
  const pr = r2(num(prestamos));
  const od = r2(num(otrasDeducciones));

  const params = parametrosDe(anio);
  const avisos = [...(params.avisos || [])];

  const salarioProporcional = r2((sb / 30) * dias);

  // El auxilio de transporte solo se debe hasta 2 SMLMV. Si el usuario lo digitó por encima de
  // ese tope no se le quita —puede ser un pago voluntario— pero se advierte, porque un auxilio
  // voluntario a alguien que no tiene derecho SÍ constituye salario y cambia todas las bases.
  const tr = r2(num(transporte));
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
  const salud = r2(ibc * TARIFAS.trabajador.salud);
  const pension = r2(ibc * TARIFAS.trabajador.pension);

  // Fondo de solidaridad pensional (art. 27 Ley 100/1993): 1% desde 4 SMLMV, con el escalón
  // adicional de subsistencia desde 16 y hasta el 2%.
  //
  // El umbral se compara contra el IBC MENSUALIZADO, nunca contra el prorrateado. Un salario de
  // 4,57 SMLMV con ingreso el día 16 devenga 2,3 SMLMV ese mes: comparado en crudo caía bajo el
  // umbral y no se retenía nada. Lo no descontado se lo cobran al empleador (art. 370 E.T.).
  // La TARIFA sale del mensualizado; la BASE sigue siendo el IBC real.
  const ibcMensualizado = mensualizar(ibc, dias);
  const fsp = r2(ibc * tarifaFsp({ ibcMensualizado, smlmv: params.smlmv }));

  const totalDeducciones = salud + pension + fsp + pr + od;
  // El neto se resta de componentes YA REDONDEADOS. Redondear la resta de valores sin redondear
  // dejaba diferencias de uno o dos centavos entre el neto y la suma de las líneas del asiento,
  // y el asiento no cuadraba: una de cada cuatro nóminas se quedaba fuera del libro diario sin
  // que faltara ninguna cuenta del mapa.
  const neto = totalDevengos - totalDeducciones;

  // ── Aportes del EMPLEADOR ──
  // El art. 114-1 dice "devenguen": se mide sobre lo devengado en el mes, no sobre el salario
  // del contrato. Y cuando se pierde, se pierde sobre TODO el IBC, no solo sobre el exceso.
  const exonerado = aplicaExoneracion({
    exoneradoEmpleador,
    devengadoMes: baseAportes,
    smlmv: params.smlmv,
    diasTrabajados: dias,
  });
  // En un mes incompleto el art. 114-1 tiene debate doctrinal: la norma habla de lo que el
  // trabajador "devengue", y no dice si eso se mensualiza. Aquí se mensualiza —el criterio
  // conservador, que liquida los aportes— pero se dice, porque la decisión es del contador.
  if (exoneradoEmpleador && dias < 30) {
    avisos.push(
      "Mes incompleto con exoneración del art. 114-1: el umbral de 10 SMLMV se comparó contra el mes completo, que es el criterio conservador. Confírmalo con tu contador."
    );
  }

  // La exoneración del art. 114-1 cubre salud, SENA e ICBF. La caja de compensación y la
  // pensión se pagan siempre.
  // Salud y pensión van sobre el IBC topado; los parafiscales sobre la nómina completa, que no
  // comparte el tope de 25 SMLMV.
  // Se redondea CADA componente aquí, no al presentarlo: son los mismos números que van al
  // asiento, y el asiento tiene que cuadrar contra sus propios totales.
  const saludPatronal = exonerado ? 0 : r2(ibc * TARIFAS.empleador.salud);
  const pensionPatronal = r2(ibc * TARIFAS.empleador.pension);
  const arl = r2(ibc * tarifaArl(claseRiesgoArl));
  const sena = exonerado ? 0 : r2(baseAportes * TARIFAS.empleador.sena);
  const icbf = exonerado ? 0 : r2(baseAportes * TARIFAS.empleador.icbf);
  const cajaCompensacion = r2(baseAportes * TARIFAS.empleador.cajaCompensacion);

  const totalAportesPatronales =
    saludPatronal + pensionPatronal + arl + sena + icbf + cajaCompensacion;

  // ── Prestaciones sociales (provisión del mes) ──
  const cesantias = r2(basePrestacional * TARIFAS.prestaciones.cesantias);
  // Los intereses son el 12% ANUAL sobre el saldo de cesantías (art. 1 Ley 52/1975). Las
  // cesantías del mes YA vienen prorrateadas por los días, así que multiplicar otra vez por
  // `dias/360` era una doble prorrata: provisionaba 1/12 de lo debido y a 31 de diciembre la
  // provisión cubría el 8,3% de la obligación — que además se sanciona con otro tanto si no se
  // paga a tiempo.
  const interesesCesantias = r2(cesantias * TARIFAS.prestaciones.interesesCesantias);
  const prima = r2(basePrestacional * TARIFAS.prestaciones.prima);
  const vacaciones = r2(baseVacaciones * TARIFAS.prestaciones.vacaciones);

  const totalPrestaciones = cesantias + interesesCesantias + prima + vacaciones;

  const costoTotal = totalDevengos + totalAportesPatronales + totalPrestaciones;

  // ── Retención en la fuente por rentas de trabajo: NO se liquida, pero SÍ se avisa ──
  //
  // El art. 383 E.T. necesita procedimiento 1 o 2, dependientes, medicina prepagada, intereses
  // de vivienda y el límite del 40% / 1.340 UVT del art. 336. Nada de eso está modelado, y
  // liquidarlo a medias sería peor que no liquidarlo.
  //
  // Pero el usuario no lee los comentarios del código: ve un "Neto a pagar" y lo paga. Y el
  // art. 370 dice que el agente que no retiene RESPONDE por la suma no retenida. Así que al
  // menos se calcula la base depurada de tanteo y se avisa cuando pasa del umbral.
  const baseDepurada = (totalDevengos - salud - pension - fsp) * 0.75; // 25% exento, art. 206 num. 10
  const uvt = TABLA_RETEFUENTE_2026.uvt;
  if (baseDepurada > 95 * uvt) {
    avisos.push(
      `Este pago está sujeto a RETENCIÓN EN LA FUENTE por rentas de trabajo (art. 383 E.T.): la base depurada de tanteo son ${Math.round(baseDepurada / uvt)} UVT y la tabla empieza en 95. Este módulo NO la liquida —requiere dependientes, deducciones y el límite del art. 336— así que hay que calcularla y descontarla aparte antes de pagar.`
    );
  }

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
