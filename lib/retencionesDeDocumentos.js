// Adaptadores: traducen la forma que cada documento le da a sus retenciones a las líneas que
// espera `registrarRetenciones`. Viven juntos para que la lógica de "qué es vinculante" no se
// disperse por los endpoints.
//
// LA POLÍTICA DE CAUSACIÓN ES UN INTERRUPTOR DE DOS RAMAS. La retención se practica en el pago
// o abono en cuenta, lo que ocurra PRIMERO. Si el usuario las causa (`retencionesEnCausacion`,
// lo estándar), la fila que cuenta es la de la compra o el soporte y la del comprobante de
// pago es informativa. Si NO las causa, es al revés. Las dos ramas tienen que estar cableadas:
// con `vinculante: true` fijo en la compra, la política "no causar" hacía que contaran AMBAS y
// el certificado salía al doble.
import { registrarRetenciones } from "@/lib/retencionesPracticadas";

/**
 * Compra. Vinculante cuando la política es causar.
 * @param causadas política `MapaCuentas.retencionesEnCausacion` (true por defecto)
 */
export async function registrarRetencionesDeCompra(tx, usuarioId, compra, causadas = true) {
  const r = compra.retenciones || {};
  const lineas = ["retefuente", "reteiva", "reteica"]
    .filter((k) => r[k]?.activa && Number(r[k].valor) > 0)
    .map((k) => ({
      tipo: k,
      conceptoCodigo: r[k].concepto || null,
      base: r[k].base,
      baseOperacion: r[k].baseOperacion ?? (k === "reteiva" ? compra.subtotal : null),
      tarifa: r[k].tarifa,
      unidad: r[k].unidad,
      valor: r[k].valor,
      municipio: r[k].municipio || null,
    }));

  return registrarRetenciones(tx, {
    usuarioId,
    origen: "compra",
    documento: {
      id: compra.id,
      docRef: compra.numFactura,
      fecha: compra.fecha,
      terceroNombre: compra.proveedorNombre,
      terceroTipoDocumento: compra.proveedorTipoDocumento || null,
      terceroNumeroDocumento: compra.proveedorNit,
    },
    lineas,
    vinculante: causadas,
  });
}

/** Documento soporte: también es causación, así que sigue la misma política que la compra. */
export async function registrarRetencionesDeSoporte(tx, usuarioId, soporte, causadas = true) {
  const lineas = [];
  if (Number(soporte.reteFuente) > 0) {
    lineas.push({
      tipo: "retefuente",
      conceptoCodigo: soporte.conceptoRetencion || null,
      base: soporte.bruto,
      tarifa: soporte.porcReteFuente,
      unidad: "%",
      valor: soporte.reteFuente,
    });
  }
  if (Number(soporte.reteIca) > 0) {
    lineas.push({
      tipo: "reteica",
      base: soporte.bruto,
      tarifa: soporte.porcReteIca,
      unidad: "‰",
      valor: soporte.reteIca,
      municipio: soporte.municipioIca || null,
    });
  }

  return registrarRetenciones(tx, {
    usuarioId,
    origen: "documento_soporte",
    documento: {
      id: soporte.id,
      docRef: soporte.numero,
      fecha: soporte.fecha,
      terceroNombre: soporte.proveedorNombre,
      terceroTipoDocumento: soporte.proveedorTipoDocumento || null,
      terceroNumeroDocumento: soporte.proveedorDocumento,
    },
    lineas,
    vinculante: causadas,
  });
}

/**
 * Comprobante de egreso: vinculante SOLO si la política dice que las retenciones se registran
 * al pagar. Con la política estándar la compra o el soporte ya las registró y esta fila es
 * informativa — sumarla certificaría el doble.
 *
 * Un comprobante de INGRESO no practica retenciones: las que aparecen ahí son las que el
 * cliente nos practicó a nosotros, y esas no se certifican, se reciben.
 */
export async function registrarRetencionesDeComprobante(tx, usuarioId, comprobante, causadas = true) {
  if (comprobante.tipo !== "egreso") return 0;

  const lineas = (comprobante.retenciones || []).map((r) => ({
    tipo: r.tipo,
    conceptoCodigo: r.concepto || null,
    base: r.base,
    tarifa: r.tarifa,
    unidad: r.unidad,
    valor: r.valor,
    municipio: r.municipio || null,
  }));

  return registrarRetenciones(tx, {
    usuarioId,
    origen: "comprobante",
    documento: {
      id: comprobante.id,
      docRef: comprobante.numero || "(borrador)",
      fecha: comprobante.fecha,
      terceroNombre: comprobante.terceroNombre,
      terceroNumeroDocumento: comprobante.terceroDocumento,
    },
    lineas,
    vinculante: !causadas,
  });
}

/**
 * Borra las retenciones de un documento que dejó de practicarlas: anulado o reversado.
 *
 * Un documento anulado no practicó retención, así que certificarla afirma algo que la
 * declaración mensual del agente contradice. `registrarRetenciones` ya borra antes de
 * reinsertar, pero anular no vuelve a pasar por ahí.
 */
export async function borrarRetencionesDe(tx, { compraId, documentoSoporteId, comprobanteId }) {
  const where = compraId
    ? { compraId }
    : documentoSoporteId
      ? { documentoSoporteId }
      : comprobanteId
        ? { comprobanteId }
        : null;
  if (!where) return 0;
  const { count } = await tx.retencionPracticada.deleteMany({ where });
  return count;
}
