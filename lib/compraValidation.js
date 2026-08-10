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
const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const RETENCIONES = {
  retefuente: { baseDe: "subtotal", divisor: 100, unidad: "%" },
  reteiva: { baseDe: "totalIva", divisor: 100, unidad: "%" },
  reteica: { baseDe: "subtotal", divisor: 1000, unidad: "‰" },
};

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
    const tarifa = activa ? Number(r.tarifa) || 0 : 0;
    const base = bases[cfg.baseDe];
    retenciones[key] = {
      activa,
      tarifa,
      unidad: cfg.unidad,
      base: r2(base),
      valor: activa ? r2(base * (tarifa / cfg.divisor)) : 0,
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
