// Validación + cálculo de Documento Soporte (servidor). Espeja `documentos-soportes.js`.
// ReteFuente en % (÷100); ReteICA por mil ‰ (÷1000).
const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function normalizarSoporte(body) {
  const errors = [];
  const proveedorNombre = T(body.proveedorNombre);
  const proveedorDocumento = T(body.proveedorDocumento);
  const concepto = T(body.concepto);
  const bruto = Number(body.bruto) || 0;
  const porcReteFuente = Number(body.porcReteFuente) || 0;
  const porcReteIca = Number(body.porcReteIca) || 0;

  if (!proveedorNombre) errors.push("El nombre del proveedor es obligatorio.");
  if (!concepto) errors.push("El concepto es obligatorio.");
  if (bruto <= 0) errors.push("El valor bruto debe ser mayor a cero.");

  const reteFuente = bruto * (porcReteFuente / 100);
  const reteIca = bruto * (porcReteIca / 1000);
  const neto = bruto - reteFuente - reteIca;

  const data = {
    fecha: T(body.fecha) || new Date().toISOString().slice(0, 10),
    proveedorNombre,
    proveedorDocumento: proveedorDocumento || null,
    concepto,
    bruto: r2(bruto),
    porcReteFuente,
    porcReteIca,
    reteFuente: r2(reteFuente),
    reteIca: r2(reteIca),
    neto: r2(neto),
  };

  return { data, errors };
}
