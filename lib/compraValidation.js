// Validación + cálculo AUTORITATIVO de Compra (servidor).
//
// Retenciones manuales. Cada una tiene SU base y SU unidad; no son intercambiables:
//   ReteFuente → sobre el subtotal (sin IVA), tarifa en %.
//   ReteIVA    → sobre el IVA, tarifa en %.
//   ReteICA    → sobre el subtotal (sin IVA), tarifa POR MIL (‰).
//
// El ICA grava el ingreso, que no incluye el IVA, y su tarifa municipal se expresa por mil.
// Liquidarlo sobre el bruto y en % daba ~11,9 veces de más: con 9,66‰ sobre $1.000.000 el
// valor es $9.660, no $114.954. Es la misma regla que ya aplican `facturaCalc.js` y
// `soporteValidation.js`.
//
// Se persiste `base` y `unidad` por retención: el comprobante de egreso y el certificado de
// retención al proveedor los necesitan, y recalcularlos después obligaría a reconstruir el
// contexto de la compra.
import { buscarConcepto, tarifaOficial, tarifaVariable } from "@/lib/conceptosRetencion";

const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const RETENCIONES = {
  retefuente: { baseDe: "subtotal", divisor: 100, unidad: "%" },
  reteiva: { baseDe: "totalIva", divisor: 100, unidad: "%" },
  reteica: { baseDe: "subtotal", divisor: 1000, unidad: "‰" },
};

const TIPOS_DOCUMENTO = new Set(["NIT", "CC", "CE", "PA", "TI"]);

export function normalizarCompra(body) {
  const errors = [];
  const numFactura = T(body.numFactura);
  const fecha = T(body.fecha);
  const proveedorNombre = T(body.proveedorNombre);

  if (!numFactura) errors.push("El número de factura del proveedor es obligatorio.");
  if (!fecha) errors.push("La fecha de compra es obligatoria.");
  if (!proveedorNombre) errors.push("El nombre del proveedor es obligatorio.");

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const itemsValidos = rawItems.filter((i) => T(i.descripcion));
  if (itemsValidos.length === 0) errors.push("Agrega al menos un ítem con descripción.");

  let subtotal = 0;
  let totalDescuentos = 0;
  let totalIva = 0;
  const items = itemsValidos.map((i) => {
    const cantidad = Number(i.cantidad) || 0;
    const precioUnitario = Number(i.precioUnitario) || 0;
    const descuento = Number(i.descuento) || 0;
    const iva = Number(i.iva) || 0;

    const base = cantidad * precioUnitario;
    const dto = base * (descuento / 100);
    const neto = base - dto;
    const ivaValor = neto * (iva / 100);

    subtotal += neto;
    totalDescuentos += dto;
    totalIva += ivaValor;

    return {
      descripcion: T(i.descripcion),
      cantidad,
      precioUnitario: r2(precioUnitario),
      descuento,
      iva,
      base: r2(neto),
      subtotalItem: r2(neto + ivaValor),
    };
  });

  const bruto = subtotal + totalIva;

  const rIn = body.retenciones || {};
  const bases = { subtotal, totalIva, bruto };
  const retenciones = {};
  for (const [key, cfg] of Object.entries(RETENCIONES)) {
    const r = rIn[key] || {};
    const activa = !!r.activa;
    const base = bases[cfg.baseDe];

    // El certificado del Art. 381 agrupa POR CONCEPTO (lit. f), y el ICA se declara en el
    // municipio donde se practicó. Sin estos dos, la retención no se puede certificar y no
    // expedir el certificado cuesta el 5% de los pagos (Art. 667 E.T.).
    let concepto = key === "retefuente" ? T(r.concepto) || null : null;
    let tarifa = activa ? Number(r.tarifa) || 0 : 0;

    if (activa && key === "retefuente") {
      if (!concepto) {
        errors.push(
          "Elige el concepto de la ReteFuente: sin él no se le puede expedir el certificado al proveedor (Art. 381 lit. f E.T.)."
        );
      } else if (!buscarConcepto(concepto)) {
        // Falla cerrado: un concepto desconocido no se guarda "por si acaso".
        errors.push(`El concepto de retención "${concepto}" no existe en la tabla vigente.`);
        concepto = null;
      } else if (!tarifaVariable(concepto)) {
        // La tarifa es un atributo de la norma, no un dato del usuario: se fuerza la oficial.
        tarifa = tarifaOficial(concepto);
      } else if (tarifa <= 0) {
        errors.push("Este concepto tiene tarifa variable: escribe la tarifa que aplicaste.");
      }
    }

    const municipio = key === "reteica" ? T(r.municipio) || null : null;
    if (activa && key === "reteica" && !municipio) {
      errors.push("Indica el municipio de la ReteICA: se declara en el municipio donde se practicó.");
    }

    retenciones[key] = {
      activa,
      tarifa,
      unidad: cfg.unidad,
      base: r2(base),
      // Valor de la operación gravada sin IVA. Solo lo lleva la ReteIVA, cuya base es el IVA:
      // el art. 1.6.1.12.13 del Dcto 1625 exige los dos por separado en el certificado.
      baseOperacion: key === "reteiva" ? r2(subtotal) : null,
      valor: activa ? r2(base * (tarifa / cfg.divisor)) : 0,
      concepto,
      municipio,
    };
  }
  const totalRetenciones =
    retenciones.retefuente.valor + retenciones.reteiva.valor + retenciones.reteica.valor;
  const totalAPagar = bruto - totalRetenciones;

  const data = {
    numFactura,
    fecha,
    fechaVencimiento: T(body.fechaVencimiento) || null,
    tipoDoc: T(body.tipoDoc) || null,
    condicionPago: T(body.condicionPago) || null,
    medioPago: T(body.medioPago) || null,
    proveedorNombre,
    proveedorNit: T(body.proveedorNit) || null,
    proveedorTipoDocumento: TIPOS_DOCUMENTO.has(T(body.proveedorTipoDocumento))
      ? T(body.proveedorTipoDocumento)
      : null,
    proveedorTel: T(body.proveedorTel) || null,
    subtotal: r2(subtotal),
    totalDescuentos: r2(totalDescuentos),
    totalIva: r2(totalIva),
    totalRetenciones: r2(totalRetenciones),
    totalBruto: r2(bruto),
    totalAPagar: r2(totalAPagar),
    retenciones,
    observaciones: T(body.observaciones) || null,
  };

  return { data, items, errors };
}
