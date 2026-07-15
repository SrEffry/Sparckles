// Formato de moneda abreviado ($18.5M) — portado tal cual de recursos.js / finanzas.js
// para mantener paridad visual con el sitio actual.
export function formatearAbreviado(valor) {
  if (!valor || valor === 0) return "$0";
  if (valor >= 1000000) {
    return "$" + (valor / 1000000).toFixed(1) + "M";
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
