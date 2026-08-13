// Generar un DOCUMENTO SOPORTE a partir de un comprobante de egreso ya emitido.
//
// EL CASO REAL. Se le paga a alguien no obligado a facturar —un transportador, un arrendador
// persona natural, un técnico— y después hay que legalizar ese pago con el documento que la
// DIAN exige para poder deducir el costo (Art. 771-2 E.T. y art. 1.6.1.4.12 del DUT 1625/2016).
// El pago ocurrió primero; el soporte lo legaliza.
//
// NO ES UNA CONVERSIÓN. El comprobante sigue existiendo: es la prueba del pago (medio, banco,
// número de transacción, firma). El soporte es un documento NUEVO que registra la operación.
// Cambiarle la naturaleza a un documento ya emitido sería falsearlo.
//
// LAS CUATRO TRAMPAS DE MAPEO. Los campos del comprobante se parecen a los del soporte pero no
// significan lo mismo, y copiarlos sin más produce errores silenciosos de hasta 10x. Cada una
// se valida y, si no cuadra, se RECHAZA en vez de ajustar: ajustar a ojo un documento fiscal
// es peor que no generarlo.

import { esFechaISOValida, hoyBogota } from "@/lib/fechas";

const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round((x + Number.EPSILON) * 100) / 100 : 0;
};

/**
 * Comprueba si un comprobante puede generar un documento soporte y prepara sus datos.
 *
 * Es una función pura: no toca la BD. Devuelve `{ datos, errors, avisos }`.
 *
 * @param comprobante     con `retenciones` incluidas
 * @param body            `{ fechaOperacion, concepto }` — lo que el usuario confirma
 * @param soporteExistente el soporte vivo que ya generó este comprobante, si lo hay
 */
export function prepararSoporteDesdeEgreso(comprobante, body = {}, soporteExistente = null) {
  const errors = [];
  const avisos = [];

  if (comprobante.tipo !== "egreso") {
    errors.push("Solo un comprobante de egreso puede generar un documento soporte.");
    return { errors, avisos };
  }
  if (comprobante.estado !== "emitido") {
    errors.push(
      `El comprobante está en estado "${comprobante.estado}". Solo uno emitido puede legalizarse con un documento soporte.`
    );
    return { errors, avisos };
  }
  if (soporteExistente) {
    errors.push(
      `Este comprobante ya se legalizó con el documento soporte ${soporteExistente.numero}. Anúlalo antes de generar otro.`
    );
    return { errors, avisos };
  }
  if (!T(comprobante.terceroDocumento)) {
    errors.push(
      "El comprobante no tiene el documento del tercero, y el soporte debe identificar al proveedor."
    );
  }

  const retenciones = comprobante.retenciones || [];

  // TRAMPA 1. Una línea de ReteIVA significa que la operación fue con un responsable de IVA.
  // El documento soporte es para NO obligados a facturar, que no son responsables: esa
  // operación necesita una factura del proveedor, no un soporte. Y `DocumentoSoporte` ni
  // siquiera tiene dónde guardar la ReteIVA, así que copiarla la perdería en silencio.
  if (retenciones.some((r) => r.tipo === "reteiva")) {
    errors.push(
      "Este pago tiene ReteIVA, lo que indica que el proveedor es responsable de IVA. Esa operación se soporta con su factura, no con un documento soporte."
    );
  }

  // TRAMPA 2. La unidad del ReteICA. El validador del soporte divide SIEMPRE entre 1000 (por
  // mil), pero el comprobante admite guardar la tarifa en '%'. Con 9,66 la diferencia entre
  // interpretarlo como % o como ‰ es de 10 veces, y no habría nada que lo delatara.
  const ica = retenciones.find((r) => r.tipo === "reteica");
  if (ica && ica.unidad !== "‰") {
    errors.push(
      `La ReteICA del comprobante está en "${ica.unidad}" y el documento soporte la liquida por mil (‰). Corrige la tarifa en el comprobante antes de generarlo.`
    );
  }

  // TRAMPA 3. `valorBruto` del comprobante NO es el bruto de la operación: con la política
  // estándar es el neto que se movió. El bruto se reconstruye desde el neto y las retenciones.
  const neto = r2(comprobante.neto);
  const totalRet = r2(comprobante.totalRetenciones);
  const bruto = r2(neto + totalRet);
  if (bruto <= 0) errors.push("El comprobante no tiene valor que soportar.");

  // TRAMPA 4. No recalcular la retención sobre el bruto. Si la base del comprobante no es el
  // bruto de la operación, el soporte liquidaría un valor distinto y su asiento dejaría de
  // amarrar con el del comprobante. Se rechaza; no se ajusta.
  const rf = retenciones.find((r) => r.tipo === "retefuente");
  for (const r of [rf, ica].filter(Boolean)) {
    if (Math.abs(r2(r.base) - bruto) > 0.01) {
      errors.push(
        `La base de la ${r.tipo === "retefuente" ? "ReteFuente" : "ReteICA"} (${r2(r.base)}) no coincide con el valor de la operación (${bruto}). Revisa el comprobante: el soporte liquidaría una retención distinta.`
      );
    }
  }

  // La FECHA es la de la OPERACIÓN, no la del pago. Se propone la del comprobante porque pagar
  // contra entrega es el caso común, pero es un dato aparte y editable.
  const fechaOperacion = T(body.fechaOperacion) || comprobante.fecha;
  if (!esFechaISOValida(fechaOperacion)) {
    errors.push("La fecha de la operación no es válida. Usa el formato AAAA-MM-DD.");
  } else {
    if (fechaOperacion > hoyBogota()) errors.push("La fecha de la operación no puede ser futura.");
    if (fechaOperacion > comprobante.fecha) {
      errors.push(
        `La operación (${fechaOperacion}) no puede ser posterior al pago (${comprobante.fecha}): no se paga algo que todavía no ha ocurrido.`
      );
    }
    // El gasto pertenece al mes de la operación y el pago al suyo. No es un error, pero si
    // caen en meses distintos hay que decirlo: afecta a qué periodo va cada declaración.
    if (fechaOperacion.slice(0, 7) !== comprobante.fecha.slice(0, 7)) {
      avisos.push(
        `La operación es de ${fechaOperacion.slice(0, 7)} y el pago de ${comprobante.fecha.slice(0, 7)}: el gasto y el pago quedan en periodos distintos.`
      );
    }
  }

  // El concepto del comprobante explica el movimiento de dinero ("Pago a Juan Pérez"), y el
  // DUT exige la descripción específica del bien o servicio. Se propone, pero se pide confirmar.
  const concepto = T(body.concepto) || T(comprobante.concepto);
  if (!concepto) errors.push("Describe el bien o servicio adquirido: es requisito del documento soporte.");
  else if (concepto.length < 10) {
    errors.push("La descripción del bien o servicio es demasiado corta para identificar la operación.");
  }

  if (errors.length) return { errors, avisos };

  return {
    errors,
    avisos,
    datos: {
      fecha: fechaOperacion,
      proveedorNombre: comprobante.terceroNombre,
      proveedorDocumento: T(comprobante.terceroDocumento) || null,
      proveedorTipoDocumento: null, // el comprobante no lo distingue; lo confirma el usuario
      concepto,
      conceptoRetencion: rf ? T(rf.concepto) || null : null,
      municipioIca: ica ? T(ica.municipio) || null : null,
      bruto,
      porcReteFuente: rf ? Number(rf.tarifa) : 0,
      porcReteIca: ica ? Number(ica.tarifa) : 0,
      // Los valores se COPIAN, no se recalculan: son los que ya se practicaron y consignaron.
      reteFuente: rf ? r2(rf.valor) : 0,
      reteIca: ica ? r2(ica.valor) : 0,
      neto,
      generadoDesdeComprobanteId: comprobante.id,
      // El pago ya ocurrió: el soporte nace saldado.
      totalPagado: neto,
      emisorSnapshot: comprobante.emisorSnapshot || null,
    },
  };
}
