// Conceptos de retención en la fuente, en un solo sitio.
//
// El certificado del Art. 381 E.T. agrupa POR CONCEPTO (lit. f), así que el concepto tiene que
// ser un CÓDIGO de la tabla oficial y no texto libre: "Servicios" y "servicios prof." son el
// mismo concepto y saldrían como dos líneas del certificado.
//
// PAGOS LABORALES. Los conceptos de la categoría "Pagos Laborales" NO se certifican por el
// Art. 381: las rentas de trabajo van por los Arts. 378-379, que tienen formulario oficial
// (Formulario 220 de la DIAN) y no se pueden emitir con un formato libre. Se dejan disponibles
// para liquidar la retención, pero el certificado del 381 los excluye y lo advierte.

import { TABLA_RETEFUENTE_2026 } from "@/lib/data/tablaRetefuente";

export const CATEGORIA_LABORAL = "Pagos Laborales";

/** Todos los conceptos, agrupados por categoría, listos para un `<optgroup>`. */
export function conceptosPorCategoria({ incluirLaborales = true } = {}) {
  const grupos = new Map();
  for (const c of TABLA_RETEFUENTE_2026.conceptos) {
    if (!incluirLaborales && c.categoria === CATEGORIA_LABORAL) continue;
    if (!grupos.has(c.categoria)) grupos.set(c.categoria, []);
    grupos.get(c.categoria).push({
      id: c.id,
      nombre: c.nombre,
      tarifa: c.tarifa,
      baseMinimaP: c.baseMinimaP,
      aplicaA: c.aplicaA,
    });
  }
  return [...grupos.entries()].map(([categoria, conceptos]) => ({ categoria, conceptos }));
}

export function buscarConcepto(codigo) {
  if (!codigo) return null;
  return TABLA_RETEFUENTE_2026.conceptos.find((c) => c.id === codigo) || null;
}

export function esConceptoLaboral(codigo) {
  return buscarConcepto(codigo)?.categoria === CATEGORIA_LABORAL;
}

/**
 * Tarifa oficial del concepto, o null si la norma no fija una sola.
 *
 * Algunos conceptos traen la tarifa como texto ("Variable 19%-39%", la tabla progresiva del
 * Art. 383). `Number()` los convierte en NaN y, con el `|| 0` de rigor, en un 0% que el
 * certificado imprimiría como si no se hubiera retenido nada. Devolver null obliga a tratar
 * ese caso en vez de tragárselo.
 */
export function tarifaOficial(codigo) {
  const t = buscarConcepto(codigo)?.tarifa;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** true si la tarifa del concepto no es un número único (hay que digitarla). */
export function tarifaVariable(codigo) {
  const c = buscarConcepto(codigo);
  return !!c && !Number.isFinite(Number(c.tarifa));
}
