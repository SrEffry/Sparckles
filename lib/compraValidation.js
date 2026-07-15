// Validación + cálculo AUTORITATIVO de Compra (servidor). Espeja `Compras.js`.
// Retenciones manuales: ReteFuente sobre subtotal, ReteIVA sobre IVA, ReteICA sobre bruto.
const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

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
  const ret = (key, base) => {
    const r = rIn[key] || {};
    const activa = !!r.activa;
    const tarifa = activa ? Number(r.tarifa) || 0 : 0;
    return { activa, tarifa, valor: activa ? r2(base * (tarifa / 100)) : 0 };
  };
  const retenciones = {
    retefuente: ret("retefuente", subtotal),
    reteiva: ret("reteiva", totalIva),
    reteica: ret("reteica", bruto),
  };
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
