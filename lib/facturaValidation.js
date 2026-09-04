// Validación de la factura de venta (servidor). La UI limita los campos, pero la UI NO es un
// control: sin esta validación se pueden emitir facturas con valores negativos o en cero,
// consumiendo un consecutivo de la resolución DIAN.
import { esFechaISOValida, hoyBogota } from "@/lib/fechas";
import { MEDIOS_PAGO_CODIGOS } from "@/lib/data/mediosPago";

const enRango = (v, min, max) => {
  if (v == null || v === "") return true; // opcional
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max;
};

export function validarFactura(body) {
  const errors = [];

  if (!body.clienteId) errors.push("Seleccione un cliente.");

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) errors.push("Agregue al menos un producto.");

  items.forEach((it, i) => {
    const n = i + 1;
    if (!it.productoId) errors.push(`Ítem ${n}: producto no válido.`);

    const cantidad = Number(it.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      errors.push(`Ítem ${n}: la cantidad debe ser mayor a cero.`);
    }

    const bruto = it.descuentoPorcentaje;
    const descuento = bruto === "" || bruto == null ? 0 : Number(bruto);
    if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100) {
      errors.push(`Ítem ${n}: el descuento debe estar entre 0% y 100%.`);
    }

    // PRECIO PACTADO. Vacío significa "usa el del catálogo" y es válido. Lo que no se admite es
    // un precio NEGATIVO, que no significa nada en una factura de venta: una devolución se hace
    // con nota crédito, no facturando en negativo.
    if (it.precioUnitario !== "" && it.precioUnitario != null) {
      const precio = Number(it.precioUnitario);
      if (!Number.isFinite(precio) || precio < 0)
        errors.push(`Ítem ${n}: el precio no puede ser negativo.`);
    }
  });

  // La fecha se persiste en un documento inmutable: debe ser una fecha real (no "2026-02-31")
  // y no puede ser futura (no se factura por anticipado).
  const fecha = (body.fecha || "").toString().trim();
  if (fecha) {
    if (!esFechaISOValida(fecha)) {
      errors.push("La fecha de emisión no es una fecha válida.");
    } else if (fecha > hoyBogota()) {
      errors.push("La fecha de emisión no puede ser futura.");
    }
  }

  // Descuento de cabecera y retenciones fiscales manuales dentro de rango.
  if (!enRango(body.descuentoGlobalPorcentaje, 0, 100))
    errors.push("El descuento global debe estar entre 0% y 100%.");
  if (!enRango(body.reteIvaPorcentaje, 0, 100))
    errors.push("El porcentaje de ReteIVA debe estar entre 0% y 100%.");
  if (!enRango(body.reteIcaPorMil, 0, 1000))
    errors.push("La tarifa de ReteICA (por mil) no es válida.");

  // Medio de pago (si viene) debe ser un código DIAN conocido.
  if (body.medioPago && !MEDIOS_PAGO_CODIGOS.has(String(body.medioPago)))
    errors.push("El medio de pago no es válido.");

  // Instrumentos de cobro (cheque/transferencia/…): medio válido y valor > 0. El CUADRE con el
  // total se valida en el endpoint (necesita el cálculo autoritativo).
  const instrumentos = Array.isArray(body.instrumentos) ? body.instrumentos : [];
  instrumentos.forEach((ins, i) => {
    const n = i + 1;
    if (!MEDIOS_PAGO_CODIGOS.has(String(ins.medio)))
      errors.push(`Instrumento de pago ${n}: medio no válido.`);
    const v = Number(ins.valor);
    if (!Number.isFinite(v) || v <= 0)
      errors.push(`Instrumento de pago ${n}: el valor debe ser mayor a cero.`);
  });

  // Pago a crédito ⇒ la fecha de vencimiento es obligatoria (dato del XML) y no puede ser
  // anterior a la emisión.
  const esCredito = (body.formaPago || "").toLowerCase().includes("cr");
  const fv = (body.fechaVencimiento || "").toString().trim();
  if (esCredito) {
    if (!fv) errors.push("En pago a crédito debe indicar la fecha de vencimiento.");
    else if (!esFechaISOValida(fv)) errors.push("La fecha de vencimiento no es válida.");
    else if (fecha && fv < fecha)
      errors.push("La fecha de vencimiento no puede ser anterior a la fecha de emisión.");
  }

  return { errors };
}
