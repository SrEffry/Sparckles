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

/** Año gravable que cubre la tabla cargada. Hoy solo hay una; el campo `vigencia` la fecha. */
export const ANIO_TABLA_RETEFUENTE = TABLA_RETEFUENTE_2026.año;

/**
 * Aviso si el documento NO cae en el año que cubre la tabla de retención cargada.
 *
 * La tabla trae `año`, `vigencia` y una UVT —todo del año 2026— y **nadie los consultaba**: un
 * documento fechado en otro año se liquidaba con la UVT y las bases mínimas equivocadas sin que
 * nada avisara. Las bases mínimas están en UVT y la UVT cambia cada año por resolución, así que
 * el error no es de redondeo: con la UVT de 2026 ($52.374) una base de 2 UVT son $104.748, y con
 * la del año siguiente será otra cifra.
 *
 * NO bloquea: dejar de facturar el 1 de enero porque todavía no se cargó la tabla del año sería
 * peor que avisar. Es la misma regla que el SMLMV en nómina y que los plazos de exógena: **lo que
 * no se puede calcular con certeza, se avisa; no se rellena con un valor verosímil.**
 *
 * @returns {string|null} el aviso, o null si la fecha cae en el año cubierto.
 */
export function avisoDeVigenciaRetefuente(fecha) {
  const anio = parseInt(String(fecha || "").slice(0, 4), 10);
  if (!Number.isFinite(anio) || anio === ANIO_TABLA_RETEFUENTE) return null;
  return (
    `La tabla de retención en la fuente cargada es la del año ${ANIO_TABLA_RETEFUENTE} ` +
    `(UVT ${TABLA_RETEFUENTE_2026.uvt.toLocaleString("es-CO")}, ${TABLA_RETEFUENTE_2026.decretoActualizacion}) ` +
    `y este documento es del ${anio}: las bases mínimas y las tarifas pueden no ser las vigentes. ` +
    `Verifícalas contra el decreto del año antes de darlo por bueno.`
  );
}

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
