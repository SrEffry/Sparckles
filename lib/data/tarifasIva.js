// Tarifas de IVA disponibles al registrar un producto.
//
// Fuente ÚNICA de verdad: la lista estaba repetida en la UI de productos, en la validación
// del servidor, en el cálculo de la factura y en el importador de Excel, cada una con su
// propio criterio. Un producto podía guardarse con una tarifa que el cálculo no reconocía.
//
// ⚠️ Advertencia fiscal — leer antes de tocar esta lista:
//
//   Tarifas de IVA vigentes en Colombia: 0%, 5% y 19% (general). El 19% rige desde 2017
//   (Ley 1819 de 2016, que subió el 16% anterior).
//
//   Las demás tarifas de esta lista NO son tarifas de IVA vigentes:
//     · 10%, 16%, 20% y 35% fueron tarifas de IVA históricas, derogadas por la Ley 1607
//       de 2012 y la Ley 1819 de 2016. Sirven para registrar documentos de años anteriores,
//       no para facturar hoy.
//     · 8% corresponde hoy al Impuesto Nacional al Consumo (restaurantes y bares, entre
//       otros), que NO es IVA: no es descontable para el comprador y se declara en su
//       propio formulario. Liquidarlo en el campo de IVA lo suma al IVA generado y
//       distorsiona la declaración de IVA.
//     · 2,5% y 40% no corresponden a ninguna tarifa de IVA que se haya podido verificar;
//       se incluyen por decisión del cliente.
//
//   Mientras no exista un campo separado de Impuesto al Consumo, cualquier tarifa que no
//   sea 5% o 19% se liquidará y se reportará COMO SI FUERA IVA. Ver `docs/modelo-datos.md`.
//
// El "0%" anterior se retiró a propósito: no es una categoría del régimen. Un producto sin
// IVA es exento (Art. 477 E.T., con derecho a IVA descontable) o excluido (Art. 476, sin
// derecho, y su IVA se lleva al costo). Los productos que quedaron con "0%" se marcan
// 'sin_clasificar' al facturar y el historial avisa hasta que se corrijan.

export const TARIFAS_IVA = [
  { valor: "2.5%", numero: 2.5, tipo: "gravado", grupo: "otras" },
  { valor: "5%", numero: 5, tipo: "gravado", grupo: "vigente" },
  { valor: "8%", numero: 8, tipo: "gravado", grupo: "otras" },
  { valor: "10%", numero: 10, tipo: "gravado", grupo: "otras" },
  { valor: "16%", numero: 16, tipo: "gravado", grupo: "otras" },
  { valor: "19%", numero: 19, tipo: "gravado", grupo: "vigente" },
  { valor: "20%", numero: 20, tipo: "gravado", grupo: "otras" },
  { valor: "35%", numero: 35, tipo: "gravado", grupo: "otras" },
  { valor: "40%", numero: 40, tipo: "gravado", grupo: "otras" },
  { valor: "Exento", numero: 0, tipo: "exento", grupo: "sinIva" },
  { valor: "Excluido", numero: 0, tipo: "excluido", grupo: "sinIva" },
];

export const GRUPOS_TARIFA = [
  { clave: "vigente", etiqueta: "IVA vigente" },
  { clave: "sinIva", etiqueta: "Sin IVA" },
  { clave: "otras", etiqueta: "Otras tarifas (históricas o de otros impuestos)" },
];

/** Valores admitidos al guardar un producto. */
export const VALORES_TARIFA = TARIFAS_IVA.map((t) => t.valor);

const PORCODIGO = new Map(TARIFAS_IVA.map((t) => [t.valor.toLowerCase(), t]));

/**
 * Tarifa numérica en porcentaje. Acepta los valores heredados ("0%") para no romper los
 * productos ya guardados.
 */
export function tarifaNumerica(valor) {
  if (typeof valor === "number") return valor;
  const s = String(valor ?? "").trim().toLowerCase();
  const t = PORCODIGO.get(s);
  if (t) return t.numero;
  if (s === "0%" || s === "0" || s === "") return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Tratamiento de IVA: 'gravado' | 'exento' | 'excluido' | 'sin_clasificar'.
 * Lo que la tarifa numérica no distingue — exento y excluido liquidan ambos en 0 y tienen
 * efectos opuestos sobre el IVA descontable.
 */
export function tratamientoIva(valor) {
  const s = String(valor ?? "").trim().toLowerCase();
  const t = PORCODIGO.get(s);
  if (t) return t.tipo;
  // "0%" heredado: no es una categoría, hay que decidir si es exento o excluido.
  return "sin_clasificar";
}
