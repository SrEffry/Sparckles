// Validación + cálculo de Documento Soporte (servidor).
// ReteFuente en % (÷100); ReteICA por mil ‰ (÷1000).
import { hoyBogota } from "@/lib/fechas";
import { buscarConcepto, tarifaOficial, tarifaVariable } from "@/lib/conceptosRetencion";

const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const TIPOS_DOCUMENTO = new Set(["NIT", "CC", "CE", "PA", "TI"]);

export function normalizarSoporte(body) {
  const errors = [];
  const proveedorNombre = T(body.proveedorNombre);
  const proveedorDocumento = T(body.proveedorDocumento);
  const concepto = T(body.concepto);
  const bruto = Number(body.bruto) || 0;
  let porcReteFuente = Number(body.porcReteFuente) || 0;
  const porcReteIca = Number(body.porcReteIca) || 0;

  if (!proveedorNombre) errors.push("El nombre del proveedor es obligatorio.");
  if (!concepto) errors.push("El concepto es obligatorio.");
  if (bruto <= 0) errors.push("El valor bruto debe ser mayor a cero.");

  // El certificado del Art. 381 agrupa POR CONCEPTO (lit. f) y el ICA se declara en el
  // municipio donde se practicó. Antes estos dos campos existían en el esquema pero NADIE los
  // escribía: la retención del soporte quedaba sin concepto y el certificado era imposible.
  let conceptoRetencion = T(body.conceptoRetencion) || null;
  if (porcReteFuente > 0) {
    if (!conceptoRetencion) {
      errors.push(
        "Elige el concepto de la ReteFuente: sin él no se le puede expedir el certificado al proveedor (Art. 381 lit. f E.T.)."
      );
    } else if (!buscarConcepto(conceptoRetencion)) {
      errors.push(`El concepto de retención "${conceptoRetencion}" no existe en la tabla vigente.`);
      conceptoRetencion = null;
    } else if (!tarifaVariable(conceptoRetencion)) {
      // La tarifa la fija la norma, no el usuario.
      porcReteFuente = tarifaOficial(conceptoRetencion);
    }
  }

  const municipioIca = T(body.municipioIca) || null;
  if (porcReteIca > 0 && !municipioIca) {
    errors.push("Indica el municipio de la ReteICA: se declara en el municipio donde se practicó.");
  }

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
    // Dar por hecho "NIT" convertía a una persona natural con cédula en una sociedad, y el
    // documento soporte es justamente para no obligados a facturar: casi siempre son cédulas.
    proveedorTipoDocumento: TIPOS_DOCUMENTO.has(T(body.proveedorTipoDocumento))
      ? T(body.proveedorTipoDocumento)
      : null,
    concepto,
    conceptoRetencion,
    municipioIca,
    bruto: r2(bruto),
    porcReteFuente,
    porcReteIca,
    reteFuente: r2(reteFuente),
    reteIca: r2(reteIca),
    neto: r2(neto),
  };

  return { data, errors };
}
