// Validación de comprobantes de tesorería.
import { esFechaISOValida, hoyBogota } from "@/lib/fechas";
import { buscarConcepto, tarifaOficial, tarifaVariable } from "@/lib/conceptosRetencion";

const T = (v) => (v ?? "").toString().trim();

// Devuelve 0 ante undefined, null o texto no numérico. Sin esta guarda, `r2(undefined)` da
// NaN, y un NaN en un campo Decimal hace que Prisma falle con un mensaje que no señala la
// causa real.
const r2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
};

export const TIPOS = ["ingreso", "egreso"];

/** Datos de cabecera. Las aplicaciones y el saldo se validan aparte, contra la BD. */
export function normalizarComprobante(body) {
  const errors = [];

  const tipo = TIPOS.includes(body.tipo) ? body.tipo : null;
  if (!tipo) errors.push("El tipo de comprobante debe ser 'ingreso' o 'egreso'.");

  // La fecha es la del MOVIMIENTO, no la de generación: fecharlo con "hoy" cuando el pago fue
  // otro día cambia el periodo contable y el de la declaración de retención.
  const fecha = T(body.fecha);
  if (!fecha) errors.push("La fecha del movimiento es obligatoria.");
  else if (!esFechaISOValida(fecha)) errors.push("La fecha no es válida.");
  else if (fecha > hoyBogota()) {
    // Un movimiento futuro no ocurrió: contabilizarlo adelanta el periodo y descuadra la
    // conciliación bancaria.
    errors.push("La fecha del movimiento no puede ser futura.");
  }

  const terceroNombre = T(body.terceroNombre);
  if (!terceroNombre) errors.push("El nombre del tercero es obligatorio.");

  const concepto = T(body.concepto);
  if (!concepto) errors.push("El concepto es obligatorio: es lo que explica el movimiento en los libros.");

  const aplicaciones = Array.isArray(body.aplicaciones) ? body.aplicaciones : [];
  const conValor = aplicaciones.filter((a) => Number(a.valorAplicado) > 0);
  if (conValor.length === 0) {
    errors.push("Agrega al menos un documento con valor aplicado.");
  }
  if (conValor.some((a) => Number(a.valorAplicado) < 0)) {
    errors.push("Los valores aplicados no pueden ser negativos.");
  }

  // El concepto de la ReteFuente es un CÓDIGO de la tabla oficial, no texto libre.
  //
  // Con la política de registrar las retenciones al pagar, estas son las filas VINCULANTES del
  // certificado. Aceptando texto libre, "honorarios" y "Honorarios" salían como dos conceptos
  // distintos, y el guardián del Art. 381 lit. f no los atrapaba porque solo miraba si el
  // campo estaba vacío. Aquí se valida igual que en compras y soportes.
  const retenciones = (Array.isArray(body.retenciones) ? body.retenciones : [])
    .filter((r) => Number(r.valor) > 0)
    .map((r) => {
      const tipo = T(r.tipo);
      let concepto = tipo === "retefuente" ? T(r.concepto) || null : null;
      let tarifa = Number(r.tarifa) || 0;

      if (tipo === "retefuente") {
        if (!concepto) {
          errors.push(
            "Elige el concepto de la ReteFuente: sin él no se le puede expedir el certificado al tercero (Art. 381 lit. f E.T.)."
          );
        } else if (!buscarConcepto(concepto)) {
          errors.push(`El concepto de retención "${concepto}" no existe en la tabla vigente.`);
          concepto = null;
        } else if (!tarifaVariable(concepto)) {
          // La tarifa la fija la norma, no el usuario.
          tarifa = tarifaOficial(concepto);
        }
      }

      const municipio = T(r.municipio) || null;
      if (tipo === "reteica" && !municipio) {
        errors.push("Indica el municipio de la ReteICA: se declara en el municipio donde se practicó.");
      }

      return {
        tipo,
        concepto,
        base: r2(r.base),
        tarifa,
        unidad: r.unidad === "‰" ? "‰" : "%",
        valor: r2(r.valor),
        municipio,
      };
    });

  if (retenciones.some((r) => !["retefuente", "reteiva", "reteica"].includes(r.tipo))) {
    errors.push("Tipo de retención no válido.");
  }

  const data = {
    tipo,
    fecha,
    ciudad: T(body.ciudad) || null,
    terceroNombre,
    terceroDocumento: T(body.terceroDocumento) || null,
    terceroDireccion: T(body.terceroDireccion) || null,
    medioPago: T(body.medioPago) || null,
    cuentaTesoreriaId: T(body.cuentaTesoreriaId) || null,
    bancoRef: T(body.bancoRef) || null,
    numTransaccion: T(body.numTransaccion) || null,
    chequeBanco: T(body.chequeBanco) || null,
    chequeFecha: T(body.chequeFecha) || null,
    concepto,
    observaciones: T(body.observaciones) || null,
    // `otrosDescuentos` NO se acepta todavía. Entraba en el neto pero el asiento lo ignoraba
    // y no hay contrapartida definida (el mapa tiene `descuentoProntoPago` y `ajusteAlPeso`
    // sin usar): en cuanto se expusiera, el impreso y los libros dejarían de coincidir en
    // silencio. Se completa cuando se decida el tratamiento contable de cada descuento —que
    // no es obvio: un pronto pago puede ser ingreso financiero o menor valor del ingreso.
    otrosDescuentos: 0,
  };

  return {
    data,
    aplicaciones: conValor.map((a) => ({
      facturaId: T(a.facturaId) || null,
      compraId: T(a.compraId) || null,
      valorAplicado: r2(a.valorAplicado),
    })),
    retenciones,
    errors,
  };
}

/**
 * Valida que no se aplique más de lo que se debe.
 *
 * Se ejecuta DENTRO de la transacción y releyendo los saldos: sin esto nada impide emitir
 * dos recibos del 50% y luego otro del 100% sobre la misma factura. La cartera nunca
 * cerraría y el comprobante impreso —que es prueba frente a terceros— contradiría los libros.
 */
export async function validarSaldos(tx, usuarioId, tipo, aplicaciones, excluirComprobanteId = null) {
  const errors = [];
  const detalle = [];
  const terceros = new Set();

  // Bloqueo de fila sobre los documentos involucrados. Sin él, dos emisiones simultáneas
  // sobre la misma factura leen ambas el mismo saldo, ambas pasan la validación y ambas
  // incrementan: se recauda el doble. El botón deshabilitado cubre el doble clic, no dos
  // pestañas ni dos usuarios.
  await bloquearDocumentos(tx, tipo, aplicaciones);

  for (const ap of aplicaciones) {
    if (tipo === "ingreso") {
      if (!ap.facturaId) {
        errors.push("Un comprobante de ingreso debe aplicarse a facturas de venta.");
        continue;
      }
      const f = await tx.factura.findUnique({ where: { id: ap.facturaId } });
      if (!f || f.usuarioId !== usuarioId) {
        errors.push("Alguna de las facturas no existe o no es tuya.");
        continue;
      }
      // No se recauda sobre un documento anulado: quedaría un ingreso huérfano.
      if (f.estado === "anulada") {
        errors.push(`La factura ${f.numeroCompleto} está anulada; no se puede recaudar sobre ella.`);
        continue;
      }

      terceros.add(T(f.clienteNumeroDocumento) || "sin-doc");

      const yaAplicado = await aplicadoPrevio(tx, "facturaId", ap.facturaId, excluirComprobanteId);
      // Mismo cálculo que usa el selector de pendientes: valor ajustado por notas, menos lo
      // ya cobrado al emitir (contado) y lo recaudado por comprobantes anteriores.
      const total = saldoCobrable(f);
      const saldoAnterior = r2(total - cobradoAlEmitir(f) - yaAplicado);

      if (ap.valorAplicado > saldoAnterior + 0.005) {
        errors.push(
          `La factura ${f.numeroCompleto} tiene un saldo de ${saldoAnterior.toFixed(2)} y se intenta aplicar ${ap.valorAplicado.toFixed(2)}.`
        );
        continue;
      }
      detalle.push({
        ...ap,
        docRef: f.numeroCompleto,
        valorDocumento: r2(total),
        saldoAnterior,
        saldoNuevo: r2(saldoAnterior - ap.valorAplicado),
      });
    } else {
      if (!ap.compraId) {
        errors.push("Un comprobante de egreso debe aplicarse a compras registradas.");
        continue;
      }
      const c = await tx.compra.findUnique({ where: { id: ap.compraId } });
      if (!c || c.usuarioId !== usuarioId) {
        errors.push("Alguna de las compras no existe o no es tuya.");
        continue;
      }

      terceros.add(T(c.proveedorNit) || "sin-doc");

      const yaAplicado = await aplicadoPrevio(tx, "compraId", ap.compraId, excluirComprobanteId);
      const total = Number(c.totalAPagar);
      const saldoAnterior = r2(total - yaAplicado);

      if (ap.valorAplicado > saldoAnterior + 0.005) {
        errors.push(
          `La compra ${c.numFactura} tiene un saldo de ${saldoAnterior.toFixed(2)} y se intenta aplicar ${ap.valorAplicado.toFixed(2)}.`
        );
        continue;
      }
      detalle.push({
        ...ap,
        docRef: c.numFactura,
        valorDocumento: r2(total),
        saldoAnterior,
        saldoNuevo: r2(saldoAnterior - ap.valorAplicado),
      });
    }
  }

  // Un comprobante es de UN tercero. Si se mezclan, el asiento marca todos los movimientos
  // con el mismo NIT y el auxiliar por tercero de cartera queda mal imputado — que es
  // justamente lo que alimenta la información exógena.
  if (terceros.size > 1) {
    errors.push(
      `Los documentos seleccionados son de ${terceros.size} terceros distintos. Un comprobante corresponde a un solo tercero: emite uno por cada uno.`
    );
  }

  return { errors, aplicaciones: detalle };
}

/**
 * Valor que el cliente realmente debe, ajustado por las notas aplicadas: una nota crédito lo
 * reduce y una débito lo aumenta.
 *
 * FUENTE ÚNICA. La usan tanto el selector de documentos pendientes como la validación de
 * saldos. Que cada uno calculara el suyo fue exactamente el bug que dejó una factura
 * irrecaudable tras reversarla: el selector ofrecía un saldo que la emisión rechazaba.
 */
export function saldoCobrable(factura) {
  return r2(
    Number(factura.totalACobrar) -
      Number(factura.saldoAplicadoNC || 0) +
      Number(factura.saldoAplicadoND || 0)
  );
}

/**
 * Lo ya cobrado al emitir la factura. `Factura.instrumentos` registra los medios con los que
 * se recaudó en el acto (el endpoint de facturas valida que cuadren contra el total), así que
 * ese dinero ya entró: una factura de contado no es cartera pendiente.
 */
export function cobradoAlEmitir(factura) {
  const ins = factura?.instrumentos;
  if (!Array.isArray(ins)) return 0;
  return r2(ins.reduce((a, x) => a + (Number(x?.valor) || 0), 0));
}

/**
 * Bloquea las filas de los documentos hasta el final de la transacción (`FOR UPDATE`), para
 * que dos emisiones concurrentes se serialicen en vez de leer ambas el mismo saldo.
 */
async function bloquearDocumentos(tx, tipo, aplicaciones) {
  const ids = aplicaciones
    .map((a) => (tipo === "ingreso" ? a.facturaId : a.compraId))
    .filter(Boolean);
  if (ids.length === 0) return;

  const tabla = tipo === "ingreso" ? "facturas" : "compras";
  // `$queryRawUnsafe` solo para el nombre de tabla, que es un literal del código; los ids
  // van parametrizados.
  const marcadores = ids.map((_, i) => `$${i + 1}`).join(", ");
  await tx.$queryRawUnsafe(
    `SELECT id FROM "${tabla}" WHERE id IN (${marcadores}) FOR UPDATE`,
    ...ids
  );
}

/**
 * Cuánto se ha aplicado ya a un documento por comprobantes que afectaron libros.
 *
 * Los borradores NO cuentan: todavía no movieron nada. Los reversados SÍ siguen contando en
 * positivo, y su comprobante de reversión aporta el mismo valor en NEGATIVO, de modo que la
 * suma vuelve a cero. Excluir sin más los reversados dejaría este contador desalineado con
 * `totalRecaudado` (que la reversión decrementa), y la factura quedaba irrecaudable: el
 * selector ofrecía el saldo completo y la emisión lo rechazaba.
 */
async function aplicadoPrevio(tx, campo, id, excluirComprobanteId) {
  const agg = await tx.comprobanteAplicacion.aggregate({
    where: {
      [campo]: id,
      comprobante: { estado: { in: ["emitido", "reversado"] } },
      ...(excluirComprobanteId ? { NOT: { comprobanteId: excluirComprobanteId } } : {}),
    },
    _sum: { valorAplicado: true },
  });
  return Number(agg._sum.valorAplicado || 0);
}
