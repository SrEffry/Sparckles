// Parámetros de liquidación de nómina — Colombia.
//
// ⚠️ DOS CLASES DE DATO, Y NO SE TRATAN IGUAL.
//
//   · Las TARIFAS las fija la ley y no cambian de un año a otro (Ley 100 de 1993, Ley 21 de
//     1982, CST). Están aquí como constantes.
//   · El SALARIO MÍNIMO y el AUXILIO DE TRANSPORTE cambian TODOS LOS AÑOS por decreto del
//     Gobierno. Los de abajo DEBEN CONFIRMARSE contra el decreto vigente antes de liquidar
//     una nómina real: de ellos dependen el derecho al auxilio de transporte (hasta 2 SMLMV)
//     y la exoneración del art. 114-1 E.T. (menos de 10 SMLMV).
//
// El sistema avisa en pantalla cuando liquida con parámetros de un año distinto al de la
// liquidación, en vez de usarlos en silencio.

/** Valores anuales. Añadir el año nuevo aquí, no tocar el código. */
export const VALORES_ANUALES = {
  2026: {
    smlmv: 1750905,
    auxilioTransporte: 249095,
    // El Decreto 1469, que fijó el salario mínimo de 2026, fue SUSPENDIDO por el Consejo de
    // Estado el 12 de febrero de 2026 y la suspensión fue RATIFICADA en abril. No está vigente.
    // Lo que rige el valor es el Decreto 0159 del 19 de febrero de 2026, transitorio hasta que
    // salga la sentencia de nulidad. El auxilio (Decreto 1470) nunca fue suspendido.
    // La cifra es la misma; lo que cambia es el sustento, y el sustento es lo que se le enseña
    // a la UGPP o a la revisoría.
    norma: "Decreto 0159 del 19 de febrero de 2026 (transitorio). Auxilio: Decreto 1470 del 29 de diciembre de 2025",
    confirmado: true,
    nota: "El salario mínimo de 2026 rige por decreto transitorio: el Decreto 1469 sigue suspendido por el Consejo de Estado y el valor puede cambiar cuando salga la sentencia de nulidad.",
  },
  2025: {
    smlmv: 1423500,
    auxilioTransporte: 200000,
    norma: "Decretos 1572 y 1573 del 24 de diciembre de 2024",
    confirmado: true,
  },
};

/** Tarifas fijadas por ley. No cambian anualmente. */
export const TARIFAS = {
  // Aportes del TRABAJADOR (se le descuentan del pago).
  trabajador: {
    salud: 0.04, // Art. 204 Ley 100/1993
    pension: 0.04, // Art. 20 Ley 100/1993
  },

  // Aportes del EMPLEADOR (son costo adicional, no se le descuentan a nadie).
  empleador: {
    salud: 0.085, // Art. 204 Ley 100/1993 — EXONERABLE por el art. 114-1 E.T.
    pension: 0.12, // Art. 20 Ley 100/1993 — nunca exonerable
    sena: 0.02, // Ley 21/1982 — EXONERABLE
    icbf: 0.03, // Ley 89/1988 — EXONERABLE
    cajaCompensacion: 0.04, // Ley 21/1982 — NUNCA exonerable, ni con el art. 114-1
  },

  // Prestaciones sociales. Son provisión mensual: se causan aunque se paguen después.
  //
  // Los factores van EXACTOS, no truncados a cuatro decimales. La fórmula legal es
  // `salario × días / 360`, que en un mes completo es 1/12 = 0,08333…: usar 0,0833 dejaba la
  // provisión anual unos $800 corta por cada $2.000.000 de salario, y esa diferencia se la
  // termina debiendo el empleador al trabajador.
  prestaciones: {
    cesantias: 1 / 12, // un mes de salario por año (art. 249 CST / Ley 50/1990)
    interesesCesantias: 0.12, // 12% ANUAL sobre las cesantías (art. 1 Ley 52/1975)
    prima: 1 / 12, // un mes de salario por año (art. 306 CST)
    vacaciones: 1 / 24, // 15 días hábiles por año = 15/360 (art. 186 CST)
  },
};

/**
 * Fondo de solidaridad pensional (art. 27 Ley 100/1993 y su reglamento).
 *
 * Desde 4 SMLMV se aporta el 1% a la subcuenta de solidaridad. Desde 16 hay ADEMÁS un aporte
 * escalonado a la subcuenta de subsistencia, del 0,2% al 1%, hasta un 2% total. Antes solo se
 * avisaba de ese tramo y se cobraba el 1% raso: sobre un salario de 17 SMLMV faltaban 0,4
 * puntos cada mes, y el faltante se lo cobran al empleador.
 *
 * La Ley 2381 de 2024 cambiaría los rangos, pero está suspendida por la Corte Constitucional
 * salvo sus arts. 12 y 76: sigue rigiendo este esquema.
 *
 * `desde` y `hasta` van en SMLMV; `hasta: null` es el último tramo, abierto.
 */
export const TRAMOS_FSP = [
  { desde: 4, hasta: 16, tarifa: 0.01 },
  { desde: 16, hasta: 17, tarifa: 0.012 },
  { desde: 17, hasta: 18, tarifa: 0.014 },
  { desde: 18, hasta: 19, tarifa: 0.016 },
  { desde: 19, hasta: 20, tarifa: 0.018 },
  { desde: 20, hasta: null, tarifa: 0.02 },
];

/**
 * Tarifa del FSP según el IBC MENSUALIZADO.
 *
 * El umbral se compara siempre contra un mes completo: en un ingreso o retiro a mitad de mes el
 * IBC viene prorrateado, y compararlo así clasificaba al trabajador en el tramo equivocado
 * —normalmente uno más bajo— dejando de retener lo que sí se debía. La tarifa que sale de aquí
 * se aplica después sobre el IBC real, no sobre el mensualizado.
 */
export function tarifaFsp({ ibcMensualizado, smlmv }) {
  const enSmlmv = Number(ibcMensualizado) / Number(smlmv);
  const tramo = TRAMOS_FSP.find(
    (t) => enSmlmv >= t.desde && (t.hasta === null || enSmlmv < t.hasta)
  );
  return tramo?.tarifa ?? 0;
}

/**
 * Lleva un valor de un mes incompleto a su equivalente de mes completo, que es contra lo que se
 * comparan TODOS los umbrales de la nómina (FSP, art. 114-1, derecho al auxilio).
 */
export function mensualizar(valor, diasTrabajados = 30) {
  const dias = Math.min(Number(diasTrabajados) || 30, 30);
  if (dias <= 0) return 0;
  return (Number(valor) || 0) * (30 / dias);
}

/**
 * Clases de riesgo de la ARL (Decreto 1072 de 2015, art. 2.2.4.3.5).
 * La tarifa la determina la actividad económica del cargo, no el salario.
 */
export const CLASES_RIESGO_ARL = [
  { clase: "I", tarifa: 0.00522, ejemplo: "Oficinas, actividades administrativas" },
  { clase: "II", tarifa: 0.01044, ejemplo: "Comercio, algunas manufacturas" },
  { clase: "III", tarifa: 0.02436, ejemplo: "Manufactura, transporte" },
  { clase: "IV", tarifa: 0.0435, ejemplo: "Construcción liviana, metalmecánica" },
  { clase: "V", tarifa: 0.0696, ejemplo: "Construcción pesada, minería, alturas" },
];

export function tarifaArl(clase) {
  return CLASES_RIESGO_ARL.find((c) => c.clase === clase)?.tarifa ?? CLASES_RIESGO_ARL[0].tarifa;
}

/**
 * Parámetros del año de la liquidación, con el aviso cuando no hay datos de ese año.
 *
 * No se inventa un valor: si el año no está cargado se usa el más reciente y se dice, para que
 * nadie liquide con un salario mínimo viejo sin enterarse.
 */
export function parametrosDe(anio) {
  const exacto = VALORES_ANUALES[anio];
  if (exacto) return { ...exacto, anio, avisos: avisosDe(exacto, anio) };

  const anios = Object.keys(VALORES_ANUALES).map(Number).sort((a, b) => b - a);
  const usado = anios[0];
  return {
    ...VALORES_ANUALES[usado],
    anio: usado,
    avisos: [
      `No hay parámetros cargados para ${anio}. Se está liquidando con los de ${usado}: confirma el salario mínimo y el auxilio de transporte del año antes de usar esta nómina.`,
    ],
  };
}

function avisosDe(v, usado) {
  const avisos = [];
  if (!v.confirmado) {
    avisos.push(
      `El salario mínimo y el auxilio de transporte de ${usado} están pendientes de confirmar contra el decreto vigente. De ellos dependen el derecho al auxilio de transporte y la exoneración del art. 114-1 E.T.`
    );
  }
  if (v.nota) avisos.push(v.nota);
  return avisos;
}

/**
 * ¿Aplica la exoneración de aportes del art. 114-1 E.T.?
 *
 * Exonera al empleador de SALUD (8,5%), SENA (2%) e ICBF (3%) por los trabajadores que
 * DEVENGUEN, individualmente considerados, MENOS DE 10 SMLMV. La CAJA DE COMPENSACIÓN (4%)
 * nunca se exonera, y la PENSIÓN (12%) tampoco.
 *
 * SE MIDE SOBRE LO DEVENGADO EN EL MES, no sobre el salario del contrato. La norma dice
 * "devenguen": un trabajador con salario de 9 SMLMV que un mes cobra comisiones y llega a
 * 10,4 SMLMV NO está exonerado ese mes, y la exoneración se pierde sobre TODO el IBC, no solo
 * sobre el exceso. Medirlo por el salario contractual dejaba de liquidar aportes que sí se
 * debían, con la mora y la sanción de la UGPP detrás.
 *
 * Quién califica —sociedades y personas jurídicas declarantes de renta, y personas naturales
 * empleadoras con dos o más trabajadores— es decisión del contador, no del software: por eso
 * viene de la configuración de la empresa y no se deduce.
 */
export function aplicaExoneracion({ exoneradoEmpleador, devengadoMes, smlmv, diasTrabajados = 30 }) {
  if (!exoneradoEmpleador) return false;
  // El umbral se compara contra un MES COMPLETO. Con 15 días trabajados, un salario de 11,4
  // SMLMV devenga 5,7 en el mes: comparado en crudo daba "exonerado" y se dejaban de liquidar
  // salud, SENA e ICBF de alguien que no califica.
  return mensualizar(devengadoMes, diasTrabajados) < 10 * Number(smlmv);
}

/** ¿Tiene derecho al auxilio de transporte? Hasta 2 SMLMV (art. 2 Ley 15 de 1959). */
export function tieneAuxilioTransporte({ salarioBase, smlmv }) {
  return Number(salarioBase) <= 2 * Number(smlmv);
}

/**
 * Ingreso base de cotización, con el piso y el techo de ley.
 *
 * Art. 18 de la Ley 100 (mod. art. 5 de la Ley 797/2003): el IBC no puede ser inferior a 1
 * SMLMV ni superior a 25. Sin el techo se le descontaba de más al trabajador —y el empleador
 * pagaba de más— sobre la parte que no cotiza.
 *
 * OJO: el tope de 25 SMLMV es de SALUD, PENSIÓN y FSP. Los parafiscales (SENA, ICBF y caja) se
 * liquidan sobre la nómina completa y NO comparten ese tope.
 */
export function ibcTopado({ base, smlmv, diasTrabajados = 30 }) {
  const b = Number(base) || 0;
  // El piso y el techo son mensuales: con menos de un mes se prorratean.
  const proporcion = Math.min(Number(diasTrabajados) || 30, 30) / 30;
  const piso = Number(smlmv) * proporcion;
  const techo = 25 * Number(smlmv) * proporcion;
  if (b < piso) return { ibc: piso, ajustado: "piso" };
  if (b > techo) return { ibc: techo, ajustado: "techo" };
  return { ibc: b, ajustado: null };
}
