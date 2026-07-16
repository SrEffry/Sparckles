// Validación de la factura de venta (servidor). La UI limita los campos, pero la UI NO es un
// control: sin esta validación se pueden emitir facturas con valores negativos o en cero,
// consumiendo un consecutivo de la resolución DIAN.
import { esFechaISOValida, hoyBogota } from "@/lib/fechas";

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

  return { errors };
}
