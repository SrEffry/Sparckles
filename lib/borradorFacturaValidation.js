// Validación del borrador de factura (servidor).
//
// UN BORRADOR SE VALIDA DISTINTO A UNA FACTURA, y confundirlo rompe el módulo por los dos
// extremos:
//   · Exigirle lo mismo que a una factura lo vuelve inútil. El sentido de un borrador es poder
//     guardar a medias —el cliente todavía no lo confirmó, falta un producto por crear— y
//     seguir mañana. Si no deja guardar sin cliente, nadie lo usa.
//   · No validarlo en absoluto llena la tabla de basura que revienta al emitir: cantidades
//     negativas, descuentos del 400%, medios de pago inventados.
//
// La línea está en la diferencia entre INCOMPLETO y MAL FORMADO. Falta el cliente: incompleto,
// se guarda. Cantidad −5: mal formado, se rechaza. Lo que falta se reporta aparte con
// `pendientesParaEmitir`, para que la pantalla lo muestre como tarea y no como error.
//
// Toda la validación FISCAL (vigencia de la resolución, rango de numeración, concepto de
// retención, cuadre de los instrumentos) vive en `lib/emitirFactura.js` y corre al emitir,
// contra la configuración de ese momento. Aquí no se duplica: un borrador guardado hoy puede
// emitirse dentro de un mes, cuando esas respuestas ya sean otras.

import { esFechaISOValida, hoyBogota } from "@/lib/fechas";
import { MEDIOS_PAGO_CODIGOS } from "@/lib/data/mediosPago";

const enRango = (v, min, max) => {
  if (v == null || v === "") return true; // opcional
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max;
};

const texto = (v) => {
  const t = (v ?? "").toString().trim();
  return t || null;
};

/**
 * Valida y normaliza el cuerpo de un borrador.
 * @returns {{ errors: string[], datos: object }}
 */
export function validarBorradorFactura(body) {
  const errors = [];

  // ---- Ítems: se admite que no haya ninguno; los que haya deben ser coherentes ----
  const items = Array.isArray(body.items) ? body.items : [];
  const itemsNormalizados = [];

  items.forEach((it, i) => {
    const n = i + 1;
    // Una línea totalmente vacía no es un error: es una fila que el usuario todavía no llenó.
    // Se descarta en silencio en vez de obligarlo a borrarla para poder guardar.
    const vacia = !it.productoId && (it.cantidad == null || it.cantidad === "");
    if (vacia) return;

    const cantidad = it.cantidad === "" || it.cantidad == null ? null : Number(it.cantidad);
    if (cantidad != null && (!Number.isFinite(cantidad) || cantidad <= 0))
      errors.push(`Ítem ${n}: la cantidad debe ser mayor a cero.`);

    const bruto = it.descuentoPorcentaje;
    const descuento = bruto === "" || bruto == null ? 0 : Number(bruto);
    if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100)
      errors.push(`Ítem ${n}: el descuento debe estar entre 0% y 100%.`);

    // NO se guarda `precioUnitario`. El precio de la línea SIEMPRE sale del catálogo al emitir
    // (`facturaCalc.js` lee `producto.precioVenta`), así que aceptarlo aquí era un campo muerto
    // que prometía un "precio pactado" que el sistema no honra: quien lo mandara por API creería
    // haber congelado el precio de su cliente y facturaría al de catálogo del día de emisión.
    // Si algún día se quiere precio pactado de verdad, se implementa en `calcularFactura`
    // primero y se agrega aquí después, no al revés.
    itemsNormalizados.push({
      productoId: it.productoId || null,
      cantidad,
      descuentoPorcentaje: descuento,
    });
  });

  // ---- Fechas ----
  // La fecha de un borrador es una PREFERENCIA, no la fecha del documento: la fiscal se decide
  // al emitir. Por eso aquí se admite futura —se está preparando la factura de mañana— y solo
  // se exige que sea una fecha real. El "no futura" lo aplica `validarFactura` al emitir.
  const fecha = texto(body.fecha);
  if (fecha && !esFechaISOValida(fecha)) errors.push("La fecha no es una fecha válida.");

  const fechaVencimiento = texto(body.fechaVencimiento);
  if (fechaVencimiento && !esFechaISOValida(fechaVencimiento))
    errors.push("La fecha de vencimiento no es válida.");
  if (fecha && fechaVencimiento && fechaVencimiento < fecha)
    errors.push("La fecha de vencimiento no puede ser anterior a la fecha del documento.");

  // ---- Porcentajes ----
  if (!enRango(body.descuentoGlobalPorcentaje, 0, 100))
    errors.push("El descuento global debe estar entre 0% y 100%.");
  if (!enRango(body.reteIvaPorcentaje, 0, 100))
    errors.push("El porcentaje de ReteIVA debe estar entre 0% y 100%.");
  if (!enRango(body.reteIcaPorMil, 0, 1000))
    errors.push("La tarifa de ReteICA (por mil) no es válida.");

  // ---- Medios de pago ----
  if (body.medioPago && !MEDIOS_PAGO_CODIGOS.has(String(body.medioPago)))
    errors.push("El medio de pago no es válido.");

  const instrumentos = Array.isArray(body.instrumentos) ? body.instrumentos : [];
  const instrumentosNormalizados = instrumentos.map((ins, i) => {
    const n = i + 1;
    if (!MEDIOS_PAGO_CODIGOS.has(String(ins.medio)))
      errors.push(`Instrumento de pago ${n}: medio no válido.`);
    const v = Number(ins.valor);
    if (!Number.isFinite(v) || v <= 0)
      errors.push(`Instrumento de pago ${n}: el valor debe ser mayor a cero.`);
    return {
      medio: String(ins.medio),
      banco: texto(ins.banco),
      referencia: texto(ins.referencia),
      valor: Number.isFinite(v) ? v : 0,
    };
  });

  const datos = {
    clienteId: body.clienteId || null,
    fecha,
    fechaVencimiento,
    formaPago: texto(body.formaPago),
    medioPago: texto(body.medioPago),
    observaciones: texto(body.observaciones),
    descuentoGlobalPorcentaje: Number(body.descuentoGlobalPorcentaje) || 0,
    reteIvaPorcentaje: Number(body.reteIvaPorcentaje) || 0,
    reteIcaPorMil: Number(body.reteIcaPorMil) || 0,
    items: itemsNormalizados,
    instrumentos: instrumentosNormalizados.length ? instrumentosNormalizados : null,
  };

  return { errors, datos };
}

/**
 * Qué le falta al borrador para poder emitirse. NO son errores: son tareas pendientes, y la
 * pantalla las muestra como tal. Se usa para bloquear el paso a "revisado" —dar por bueno un
 * borrador que ni siquiera se puede emitir no significa nada— y para avisar en la lista.
 */
export function pendientesParaEmitir(borrador) {
  const faltan = [];
  if (!borrador.clienteId) faltan.push("Falta seleccionar el cliente.");

  const items = Array.isArray(borrador.items) ? borrador.items : [];
  if (items.length === 0) faltan.push("Falta agregar al menos un producto.");
  if (items.some((i) => !i.productoId)) faltan.push("Hay líneas sin producto seleccionado.");
  if (items.some((i) => i.productoId && !(Number(i.cantidad) > 0)))
    faltan.push("Hay líneas sin cantidad.");

  // Pago a crédito ⇒ la fecha de vencimiento es un dato obligatorio del XML de la factura.
  const esCredito = (borrador.formaPago || "").toLowerCase().includes("cr");
  if (esCredito && !borrador.fechaVencimiento)
    faltan.push("En pago a crédito debe indicarse la fecha de vencimiento.");

  return faltan;
}

/** Convierte el borrador en el `entrada` que espera `lib/emitirFactura.js`. */
export function entradaDesdeBorrador(borrador, sobreescribir = {}) {
  const items = (Array.isArray(borrador.items) ? borrador.items : []).map((i) => ({
    productoId: i.productoId,
    cantidad: i.cantidad,
    descuentoPorcentaje: i.descuentoPorcentaje,
  }));

  return {
    clienteId: borrador.clienteId,
    items,
    // La fecha NO se arrastra del borrador: por defecto es HOY. Ver el comentario del endpoint
    // de emisión. Se resuelve aquí y no se deja en `null` para que `validarFactura` tenga
    // contra qué comparar la fecha de vencimiento del pago a crédito.
    fecha: sobreescribir.fecha || hoyBogota(),
    fechaVencimiento: sobreescribir.fechaVencimiento ?? borrador.fechaVencimiento ?? null,
    formaPago: borrador.formaPago,
    medioPago: borrador.medioPago,
    observaciones: borrador.observaciones,
    descuentoGlobalPorcentaje: Number(borrador.descuentoGlobalPorcentaje) || 0,
    reteIvaPorcentaje: Number(borrador.reteIvaPorcentaje) || 0,
    reteIcaPorMil: Number(borrador.reteIcaPorMil) || 0,
    instrumentos: borrador.instrumentos || [],
  };
}
