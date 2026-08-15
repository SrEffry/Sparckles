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
    // ⚠️ PENDIENTE DE CONFIRMAR contra el decreto de salario mínimo para 2026.
    smlmv: 1623500,
    auxilioTransporte: 200000,
    confirmado: false,
  },
  2025: {
    smlmv: 1423500,
    auxilioTransporte: 200000,
    confirmado: false,
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
  prestaciones: {
    cesantias: 0.0833, // un mes de salario por año (art. 249 CST / Ley 50/1990)
    interesesCesantias: 0.12, // 12% ANUAL sobre las cesantías (art. 1 Ley 52/1975)
    prima: 0.0833, // un mes de salario por año (art. 306 CST)
    vacaciones: 0.0417, // 15 días hábiles por año (art. 186 CST)
  },
};

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
  if (exacto) return { ...exacto, anio, avisos: avisosDe(exacto, anio, anio) };

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

function avisosDe(v, usado, pedido) {
  const avisos = [];
  if (!v.confirmado) {
    avisos.push(
      `El salario mínimo y el auxilio de transporte de ${usado} están pendientes de confirmar contra el decreto vigente. De ellos dependen el derecho al auxilio de transporte y la exoneración del art. 114-1 E.T.`
    );
  }
  return avisos;
}

/**
 * ¿Aplica la exoneración de aportes del art. 114-1 E.T.?
 *
 * Exonera al empleador de SALUD (8,5%), SENA (2%) e ICBF (3%) por los trabajadores que
 * devenguen MENOS DE 10 SMLMV. La CAJA DE COMPENSACIÓN (4%) nunca se exonera, y la PENSIÓN
 * (12%) tampoco.
 *
 * Quién califica —sociedades y personas jurídicas declarantes de renta, y personas naturales
 * empleadoras con dos o más trabajadores— es una decisión del contador, no del software: por
 * eso viene de la configuración de la empresa y no se deduce.
 */
export function aplicaExoneracion({ exoneradoEmpleador, salarioBase, smlmv }) {
  if (!exoneradoEmpleador) return false;
  return Number(salarioBase) < 10 * Number(smlmv);
}

/** ¿Tiene derecho al auxilio de transporte? Hasta 2 SMLMV (art. 2 Ley 15 de 1959). */
export function tieneAuxilioTransporte({ salarioBase, smlmv }) {
  return Number(salarioBase) <= 2 * Number(smlmv);
}
