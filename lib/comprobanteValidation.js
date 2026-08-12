// Validación de comprobantes de tesorería.
import { esFechaISOValida } from "@/lib/fechas";

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

  const retenciones = (Array.isArray(body.retenciones) ? body.retenciones : [])
    .filter((r) => Number(r.valor) > 0)
    .map((r) => ({
      tipo: T(r.tipo),
      concepto: T(r.concepto) || null,
      base: r2(r.base),
      tarifa: Number(r.tarifa) || 0,
      unidad: r.unidad === "‰" ? "‰" : "%",
      valor: r2(r.valor),
      municipio: T(r.municipio) || null,
    }));

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
    otrosDescuentos: r2(body.otrosDescuentos),
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

      const yaAplicado = await aplicadoPrevio(tx, "facturaId", ap.facturaId, excluirComprobanteId);
      const total = Number(f.totalACobrar);
      const saldoAnterior = r2(total - yaAplicado);

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

  return { errors, aplicaciones: detalle };
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
