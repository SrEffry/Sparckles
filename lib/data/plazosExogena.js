// Plazos para presentar la información exógena, por año gravable.
//
// ESTOS VALORES NO SE INVENTAN, igual que el SMLMV en `lib/data/parametrosNomina.js`. Cada año
// la DIAN publica el calendario y cada año lo modifica: para el AG 2025 lo hizo cuatro veces.
// Un año sin datos cargados devuelve `null` y la pantalla lo DICE, en vez de calcular una fecha
// verosímil y falsa.
//
// Norma base: Res. DIAN 000227 del 23-sep-2025 (Resolución Única), modificada por las
// Res. 000233/2025, 000237/2025, 000012/2026 y 000021/2026.
//
// Sanción: art. 651 E.T. (modificado por el art. 289 de la Ley 1819/2016) — hasta 15.000 UVT,
// graduada según la información sea no suministrada, errónea o extemporánea. Como en los
// certificados de retención, el módulo AVISA y no bloquea: presentar tarde es mejor que no
// presentar, y la sanción se reduce si se subsana.

import { normalizarDocumento } from "@/lib/retencionesPracticadas";

const iso = (a, m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const PLAZOS_EXOGENA = {
  // ---- AÑO GRAVABLE 2025, presentado en 2026 ----
  // ⚠️ Ya vencido (el último plazo fue el 12-jun-2026). Se conserva como referencia histórica y
  // para poder mostrar plazos de un año pasado sin inventarlos.
  2025: {
    anioPresentacion: 2026,
    norma: "Res. DIAN 000227 de 2025, modificada por la Res. 000012 de 2026",
    // Por los DOS últimos dígitos del NIT. Verificado contra la norma.
    personasJuridicasYNaturales: [
      { desde: "01", hasta: "05", fecha: iso(2026, 5, 14) },
      { desde: "06", hasta: "10", fecha: iso(2026, 5, 15) },
      { desde: "11", hasta: "15", fecha: iso(2026, 5, 19) },
      { desde: "16", hasta: "20", fecha: iso(2026, 5, 20) },
      { desde: "21", hasta: "25", fecha: iso(2026, 5, 21) },
      { desde: "26", hasta: "30", fecha: iso(2026, 5, 22) },
      { desde: "31", hasta: "35", fecha: iso(2026, 5, 25) },
      { desde: "36", hasta: "40", fecha: iso(2026, 5, 26) },
      { desde: "41", hasta: "45", fecha: iso(2026, 5, 27) },
      { desde: "46", hasta: "50", fecha: iso(2026, 5, 28) },
      { desde: "51", hasta: "55", fecha: iso(2026, 5, 29) },
      { desde: "56", hasta: "60", fecha: iso(2026, 6, 1) },
      { desde: "61", hasta: "65", fecha: iso(2026, 6, 2) },
      { desde: "66", hasta: "70", fecha: iso(2026, 6, 3) },
      { desde: "71", hasta: "75", fecha: iso(2026, 6, 4) },
      { desde: "76", hasta: "80", fecha: iso(2026, 6, 5) },
      { desde: "81", hasta: "85", fecha: iso(2026, 6, 9) },
      { desde: "86", hasta: "90", fecha: iso(2026, 6, 10) },
      { desde: "91", hasta: "95", fecha: iso(2026, 6, 11) },
      { desde: "96", hasta: "00", fecha: iso(2026, 6, 12) },
    ],
    // Por el ÚLTIMO dígito del NIT.
    //
    // ⚠️ OJO: la Res. 000012 del 29-abr-2026 AMPLIÓ los plazos de los dígitos 1, 2 y 3, que
    // originalmente vencían el 28-abr, 29-abr y 4-may. Cualquier tabla anterior a esa resolución
    // —incluida la del libro de Excel que aportó el cliente— trae las fechas viejas. Los dígitos
    // 4 a 0 no se movieron; verificado en la revisión contable contra dos fuentes.
    //
    // Estas fechas caen HASTA CINCO SEMANAS ANTES que las de personas jurídicas, así que elegir
    // mal la tabla es peor que no mostrar nada.
    grandesContribuyentes: [
      { digito: "1", fecha: iso(2026, 5, 14), fuente: "Res. 000012/2026 (ampliado)" },
      { digito: "2", fecha: iso(2026, 5, 15), fuente: "Res. 000012/2026 (ampliado)" },
      { digito: "3", fecha: iso(2026, 5, 19), fuente: "Res. 000012/2026 (ampliado)" },
      { digito: "4", fecha: iso(2026, 5, 5), fuente: "Res. 000227/2025 (tabla original)" },
      { digito: "5", fecha: iso(2026, 5, 6), fuente: "Res. 000227/2025 (tabla original)" },
      { digito: "6", fecha: iso(2026, 5, 7), fuente: "Res. 000227/2025 (tabla original)" },
      { digito: "7", fecha: iso(2026, 5, 8), fuente: "Res. 000227/2025 (tabla original)" },
      { digito: "8", fecha: iso(2026, 5, 11), fuente: "Res. 000227/2025 (tabla original)" },
      { digito: "9", fecha: iso(2026, 5, 12), fuente: "Res. 000227/2025 (tabla original)" },
      { digito: "0", fecha: iso(2026, 5, 13), fuente: "Res. 000227/2025 (tabla original)" },
    ],
  },

  // ---- AÑO GRAVABLE 2026, a presentar en 2027 ----
  // NO SE CARGA HASTA QUE LA DIAN LO PUBLIQUE. Estimarlo "más o menos como el año pasado" sería
  // poner una fecha falsa en una pantalla que la gente usa para no pasarse del plazo.
};

/**
 * Últimos dos dígitos del NIT, como texto de 2 posiciones.
 *
 * ⚠️ El DÍGITO DE VERIFICACIÓN NO ES PARTE DEL NIT. `ConfigFacturacion.nit` es texto libre, así
 * que "900.123.456-7" es perfectamente posible; quitar todo lo que no sea dígito daría "67"
 * cuando lo correcto es "56" — dos días de diferencia en el plazo, que es todo lo que hace falta
 * para caer en extemporaneidad. Se usa `normalizarDocumento()`, que ya separa el DV cuando viene
 * con guion, en vez de un `replace` que se lo come.
 */
export function dosUltimosDigitos(nit) {
  const { numero } = normalizarDocumento(nit);
  if (!numero || numero.length < 2) return null;
  return numero.slice(-2);
}

/**
 * Fecha límite para un informante.
 *
 * @param anioGravable  el año que se reporta (no el de presentación)
 * @param nit           NIT del informante, con o sin puntos
 * @param esGranContribuyente
 * @returns {{fecha, norma, fuente, digitos}|null} — `null` si no hay plazos cargados para el año
 */
export function plazoDe(anioGravable, nit, esGranContribuyente = false) {
  const tabla = PLAZOS_EXOGENA[anioGravable];
  if (!tabla) return null;

  const dd = dosUltimosDigitos(nit);
  if (!dd) return null;

  if (esGranContribuyente) {
    const fila = tabla.grandesContribuyentes.find((f) => f.digito === dd.slice(-1));
    return fila
      ? { fecha: fila.fecha, norma: tabla.norma, fuente: fila.fuente, digitos: dd.slice(-1) }
      : null;
  }

  // El rango 96-00 cruza el cero: "00" es mayor que "96" como texto pero cierra el ciclo.
  const fila = tabla.personasJuridicasYNaturales.find((f) =>
    f.hasta === "00" ? dd >= f.desde || dd === "00" : dd >= f.desde && dd <= f.hasta
  );
  return fila ? { fecha: fila.fecha, norma: tabla.norma, fuente: null, digitos: dd } : null;
}

/** Días que faltan (negativo = ya venció). */
export function diasHasta(fechaISO, hoyISO) {
  const d = (s) => {
    const [y, m, dd] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  return Math.round((d(fechaISO) - d(hoyISO)) / 86400000);
}

/** Años gravables con plazos cargados, del más reciente al más viejo. */
export const ANIOS_CON_PLAZOS = Object.keys(PLAZOS_EXOGENA)
  .map(Number)
  .sort((a, b) => b - a);
