// LEGADO. Interpreta la tarifa de IVA que se guardaba como texto en `Producto.tarifaIva`
// ("19%", "Exento", "0%") antes de que existiera el catálogo de impuestos.
//
// Ya NO se usa para calcular nada: las tarifas vienen de la tabla `Impuesto`, enlazada a
// cada producto, con tipo de tributo, código DIAN y vigencia. Este módulo sobrevive solo
// para la migración (`POST /api/impuestos/seed?migrar=1`), que traduce el texto viejo al
// modelo nuevo.
//
// Se puede borrar cuando esté confirmado que no queda ningún producto con `tarifaIva` sin
// clasificar y se elimine esa columna.

const EQUIVALENCIAS = new Map([
  ["19%", { numero: 19, tipo: "gravado" }],
  ["5%", { numero: 5, tipo: "gravado" }],
  ["2.5%", { numero: 2.5, tipo: "gravado" }],
  ["8%", { numero: 8, tipo: "gravado" }],
  ["10%", { numero: 10, tipo: "gravado" }],
  ["16%", { numero: 16, tipo: "gravado" }],
  ["20%", { numero: 20, tipo: "gravado" }],
  ["35%", { numero: 35, tipo: "gravado" }],
  ["40%", { numero: 40, tipo: "gravado" }],
  ["exento", { numero: 0, tipo: "exento" }],
  ["excluido", { numero: 0, tipo: "excluido" }],
]);

/** Tarifa numérica del texto heredado. */
export function tarifaNumerica(valor) {
  if (typeof valor === "number") return valor;
  const s = String(valor ?? "").trim().toLowerCase();
  const t = EQUIVALENCIAS.get(s);
  if (t) return t.numero;
  if (s === "0%" || s === "0" || s === "") return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Tratamiento que corresponde al texto heredado.
 *
 * "0%" devuelve 'sin_clasificar' a propósito: no es una categoría del régimen, y hay que
 * decidir si el producto era exento (Art. 477, con derecho a IVA descontable) o excluido
 * (Art. 476, sin derecho). Adivinar ahí rompe el prorrateo del Art. 490.
 */
export function tratamientoIva(valor) {
  const s = String(valor ?? "").trim().toLowerCase();
  return EQUIVALENCIAS.get(s)?.tipo || "sin_clasificar";
}
