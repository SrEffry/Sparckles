// Propuesta de asiento para un comprobante de tesorería.
//
// ALCANCE, decidido explícitamente: este generador cubre el escenario de documento YA
// CAUSADO. Es decir, la factura de venta o la compra ya está registrada en la contabilidad,
// y el comprobante solo mueve el dinero y cancela la cartera o la cuenta por pagar.
//
// El escenario de "causación + pago en un solo acto" (donde el egreso tendría que llevar
// además el gasto, el IVA descontable y las retenciones por pagar) NO se genera
// automáticamente: la cuenta de gasto la decide un contador y adivinarla es donde el
// software se equivoca. Para ese caso el usuario arma el asiento a mano en Asientos.
//
// El resultado es un BORRADOR editable. Nada se contabiliza hasta que el usuario confirma.

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Error con código, para que el endpoint responda un mensaje útil en vez de un 500. */
function fallo(codigo, mensaje) {
  const e = new Error(mensaje);
  e.code = codigo;
  return e;
}

/**
 * Comprobante de INGRESO: recaudo de facturas de venta.
 *
 *   D  cuenta de tesorería        neto recibido
 *   D  retenciones a favor        lo que el cliente nos retuvo   (solo si NO se causaron)
 *   C  cartera del cliente        valor aplicado (bruto)
 *
 * Sobre las retenciones: si la política del usuario dice que se registran al causar la
 * factura, ya están en la cuenta 1355 y el recibo NO debe volver a debitarlas. Hacerlo infla
 * el activo por retenciones y la declaración de renta. Por eso `mapa.retencionesEnCausacion`
 * gobierna este bloque en vez de asumirse.
 *
 * Las retenciones NO se prorratean entre abonos: el cliente las practica una sola vez,
 * normalmente en el primer pago. Se proponen completas la primera vez y en cero después.
 */
export function proponerAsientoIngreso({ mapa, cuentaTesoreria, aplicaciones, retenciones = [] }) {
  if (!mapa?.clientes) throw fallo("SIN_MAPA", "Configura la cuenta de cartera de clientes en el mapa de cuentas.");
  if (!cuentaTesoreria) throw fallo("SIN_TESORERIA", "Selecciona la caja o banco donde entró el dinero.");

  const bruto = r2(aplicaciones.reduce((a, x) => a + Number(x.valorAplicado || 0), 0));
  const totalRet = r2(retenciones.reduce((a, x) => a + Number(x.valor || 0), 0));
  const neto = r2(bruto - totalRet);

  const movimientos = [
    {
      cuenta: cuentaTesoreria.cuentaPuc,
      debito: neto,
      credito: 0,
      detalle: cuentaTesoreria.nombre,
    },
  ];

  if (totalRet > 0) {
    const cuentaPorTipo = {
      retefuente: mapa.reteFuenteFavor,
      reteiva: mapa.reteIvaFavor,
      reteica: mapa.reteIcaFavor,
    };
    for (const ret of retenciones) {
      if (!Number(ret.valor)) continue;
      const cuenta = cuentaPorTipo[ret.tipo];
      if (!cuenta) {
        throw fallo(
          "SIN_CUENTA_RETENCION",
          `Configura en el mapa de cuentas la cuenta de ${etiquetaRetencion(ret.tipo)} a favor.`
        );
      }
      movimientos.push({
        cuenta,
        debito: r2(ret.valor),
        credito: 0,
        detalle: `${etiquetaRetencion(ret.tipo)} practicada por el cliente`,
      });
    }
  }

  // La cartera se cancela por el BRUTO: el cliente pagó el neto pero canceló el total.
  movimientos.push({
    cuenta: mapa.clientes,
    debito: 0,
    credito: bruto,
    detalle: "Cancelación de cartera",
  });

  return { movimientos, bruto, totalRetenciones: totalRet, neto };
}

/**
 * Comprobante de EGRESO: pago de compras a proveedores.
 *
 *   D  proveedores / cuentas por pagar   neto pagado
 *   C  cuenta de tesorería               neto pagado
 *   D  GMF                                4x1000, si la cuenta está gravada
 *   C  cuenta de tesorería                el propio GMF
 *
 * El valor en letras y el "recibí" son sobre el NETO: la plantilla original ponía el bruto,
 * y un pago de servicios a una persona jurídica hecho por un agente retenedor nunca sale por
 * el bruto.
 */
export function proponerAsientoEgreso({ mapa, cuentaTesoreria, aplicaciones, retenciones = [], gmfTarifaPorMil = 4 }) {
  if (!mapa?.proveedores) throw fallo("SIN_MAPA", "Configura la cuenta de proveedores en el mapa de cuentas.");
  if (!cuentaTesoreria) throw fallo("SIN_TESORERIA", "Selecciona la caja o banco de donde salió el dinero.");

  const bruto = r2(aplicaciones.reduce((a, x) => a + Number(x.valorAplicado || 0), 0));
  const totalRet = r2(retenciones.reduce((a, x) => a + Number(x.valor || 0), 0));
  const neto = r2(bruto - totalRet);

  const movimientos = [];

  // Si la compra ya fue causada, sus retenciones ya son un pasivo y el egreso paga el neto.
  // Si la política dice que se registran al pagar, se acreditan aquí como pasivo.
  const cuentaPorTipo = {
    retefuente: mapa.reteFuentePorPagar,
    reteiva: mapa.reteIvaPorPagar,
    reteica: mapa.reteIcaPorPagar,
  };
  const causadas = mapa.retencionesEnCausacion !== false;

  movimientos.push({
    cuenta: mapa.proveedores,
    debito: causadas ? neto : bruto,
    credito: 0,
    detalle: "Cancelación de cuenta por pagar",
  });

  if (!causadas && totalRet > 0) {
    for (const ret of retenciones) {
      if (!Number(ret.valor)) continue;
      const cuenta = cuentaPorTipo[ret.tipo];
      if (!cuenta) {
        throw fallo(
          "SIN_CUENTA_RETENCION",
          `Configura en el mapa de cuentas la cuenta de ${etiquetaRetencion(ret.tipo)} por pagar.`
        );
      }
      movimientos.push({
        cuenta,
        debito: 0,
        credito: r2(ret.valor),
        detalle: `${etiquetaRetencion(ret.tipo)} practicada al proveedor`,
      });
    }
  }

  movimientos.push({
    cuenta: cuentaTesoreria.cuentaPuc,
    debito: 0,
    credito: neto,
    detalle: cuentaTesoreria.nombre,
  });

  // GMF: solo si la cuenta está gravada y hay cuenta configurada. Se propone, y el usuario
  // puede quitarlo — hay cuentas exentas y topes que el sistema no conoce.
  let gmf = 0;
  if (cuentaTesoreria.gravadaGmf && mapa.gmf && neto > 0) {
    gmf = r2(neto * (Number(gmfTarifaPorMil) / 1000));
    if (gmf > 0) {
      movimientos.push({ cuenta: mapa.gmf, debito: gmf, credito: 0, detalle: "GMF 4x1000" });
      movimientos.push({
        cuenta: cuentaTesoreria.cuentaPuc,
        debito: 0,
        credito: gmf,
        detalle: "GMF 4x1000",
      });
    }
  }

  return { movimientos, bruto, totalRetenciones: totalRet, neto, gmf };
}

export function etiquetaRetencion(tipo) {
  return { retefuente: "ReteFuente", reteiva: "ReteIVA", reteica: "ReteICA" }[tipo] || tipo;
}

/** ¿Cuadra la partida doble? Se comprueba antes de contabilizar, nunca después. */
export function balancear(movimientos) {
  const debitos = r2(movimientos.reduce((a, m) => a + Number(m.debito || 0), 0));
  const creditos = r2(movimientos.reduce((a, m) => a + Number(m.credito || 0), 0));
  return { debitos, creditos, diferencia: r2(Math.abs(debitos - creditos)) };
}
