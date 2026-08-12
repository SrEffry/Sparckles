// Validación + cálculo de Documento Soporte (servidor).
// ReteFuente en % (÷100); ReteICA por mil ‰ (÷1000).
import { hoyBogota } from "@/lib/fechas";

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
    // `hoyBogota()` y no `toISOString()`: este último devuelve la fecha UTC, así que después
    // de las 19:00 en Colombia fechaba el documento al día siguiente — y con él, el periodo
    // de la declaración de retención.
    fecha: T(body.fecha) || hoyBogota(),
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
