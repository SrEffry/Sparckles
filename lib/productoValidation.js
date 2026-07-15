// Validación + normalización de Producto (servidor). Espeja `Mis-productos.js`.
// La retención se guarda como snapshot (categoria, concepto, tarifa); el detalle completo
// (baseMinima, baseCalculo…) se resuelve desde la tabla de retefuente por `retConcepto`.

const T = (v) => (v ?? "").toString().trim();

export function normalizarProducto(body) {
  const errors = [];

  const codigo = T(body.codigo);
  const descripcion = T(body.descripcion);
  const precioNum = Number(body.precioVenta);

  if (!codigo) errors.push("El código es obligatorio.");
  if (!descripcion) errors.push("La descripción es obligatoria.");
  if (body.precioVenta === "" || body.precioVenta == null) {
    errors.push("El precio de venta es obligatorio.");
  } else if (Number.isNaN(precioNum) || precioNum <= 0) {
    errors.push("El precio debe ser mayor a cero.");
  }

  const retAplica = !!body.retAplica;
  const retTarifa =
    retAplica && body.retTarifa !== "" && body.retTarifa != null
      ? Number(body.retTarifa)
      : null;

  const data = {
    codigo,
    descripcion,
    unidad: T(body.unidad) || "Unidad",
    comoCompra: T(body.comoCompra) || null,
    comoVende: T(body.comoVende) || null,
    tarifaIva: T(body.tarifaIva) || "0%",
    precioVenta: Number.isNaN(precioNum) ? 0 : precioNum,
    linea: T(body.linea) || null,
    retAplica,
    retNombre: retAplica ? T(body.retNombre) || null : null,
    retTarifa: retAplica ? retTarifa : null,
    retCategoria: retAplica ? T(body.retCategoria) || null : null,
    retConcepto: retAplica ? T(body.retConcepto) || null : null,
  };

  if (retAplica && !data.retConcepto) {
    errors.push("Seleccione el concepto de retención.");
  }

  return { data, errors };
}
