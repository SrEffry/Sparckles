// Propuesta de asiento para un comprobante de tesorería.
//
// ══ QUÉ SIGNIFICA `valorAplicado` ══
//
// Es EL DINERO QUE SE MUEVE, ya neto de retenciones. No es el valor bruto del documento.
//
// La razón está aguas arriba: `Factura.totalACobrar` es `total − retenciones` y
// `Compra.totalAPagar` es `bruto − retenciones`. Ambos ya vienen netos, y son los saldos
// contra los que se valida. Tratarlos como bruto y volver a restarles las retenciones
// descontaba dos veces: en una factura de 1.190.000 con 60.500 de retención, el asiento
// debitaba el banco por 1.069.000 cuando entraron 1.129.500.
//
// De ahí se sigue el resto:
//   · El banco (o la caja) siempre se mueve por `valorAplicado`: es lo que entró o salió.
//   · Lo que se cancela de cartera o de la cuenta por pagar depende de la POLÍTICA:
//       - retenciones registradas en la causación (lo estándar): la cartera ya quedó
//         rebajada por la retención, así que se cancela por `valorAplicado`. Las
//         retenciones del comprobante son informativas — alimentan el certificado, no
//         vuelven a moverse.
//       - registradas en el pago: la cartera está por el bruto, así que se cancela por
//         `valorAplicado + retenciones`, y estas se reconocen aquí.
//
// ══ ALCANCE ══
//
// Cubre el escenario de documento YA CAUSADO: la factura o la compra ya está registrada, y
// el comprobante solo mueve el dinero y cancela la cartera o la cuenta por pagar.
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
 * Retenciones registradas en la CAUSACIÓN (política estándar):
 *   D  tesorería   valorAplicado
 *   C  cartera     valorAplicado      ← ya venía rebajada por la retención al causar
 *   Las retenciones del comprobante son informativas: alimentan el certificado y quedan
 *   registradas, pero NO se vuelven a mover. Repetirlas infla el anticipo de impuestos.
 *
 * Retenciones registradas en el PAGO:
 *   D  tesorería            valorAplicado
 *   D  retenciones a favor  retenciones
 *   C  cartera              valorAplicado + retenciones
 *
 * Las retenciones NO se prorratean entre abonos: el cliente las practica una sola vez,
 * normalmente en el primer pago. Se proponen completas la primera vez y en cero después.
 */
export function proponerAsientoIngreso({ mapa, cuentaTesoreria, aplicaciones, retenciones = [] }) {
  if (!mapa?.clientes) throw fallo("SIN_MAPA", "Configura la cuenta de cartera de clientes en el mapa de cuentas.");
  if (!cuentaTesoreria) throw fallo("SIN_TESORERIA", "Selecciona la caja o banco donde entró el dinero.");

  // Lo aplicado ES el dinero que entró: `totalACobrar` ya viene neto de retenciones.
  const movido = r2(aplicaciones.reduce((a, x) => a + Number(x.valorAplicado || 0), 0));
  const totalRet = r2(retenciones.reduce((a, x) => a + Number(x.valor || 0), 0));
  const causadas = mapa.retencionesEnCausacion !== false;

  const movimientos = [
    {
      cuenta: cuentaTesoreria.cuentaPuc,
      debito: movido,
      credito: 0,
      detalle: cuentaTesoreria.nombre,
    },
  ];

  let cartera = movido;

  if (!causadas && totalRet > 0) {
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
    // Con esta política la cartera está por el bruto, así que se cancela por el bruto.
    cartera = r2(movido + totalRet);
  }

  movimientos.push({
    cuenta: mapa.clientes,
    debito: 0,
    credito: cartera,
    detalle: "Cancelación de cartera",
  });

  return {
    movimientos,
    neto: movido,
    totalRetenciones: totalRet,
    // Valor de cartera que se cancela. Con la política estándar coincide con lo movido.
    bruto: cartera,
    retencionesInformativas: causadas && totalRet > 0,
  };
}

/**
 * Comprobante de EGRESO: pago de compras a proveedores.
 *
 * Retenciones registradas en la CAUSACIÓN (política estándar):
 *   D  proveedores   valorAplicado      ← el pasivo ya venía rebajado por la retención
 *   C  tesorería     valorAplicado
 *
 * Retenciones registradas en el PAGO:
 *   D  proveedores            valorAplicado + retenciones
 *   C  retenciones por pagar  retenciones
 *   C  tesorería              valorAplicado
 *
 * Más el GMF (4x1000) sobre lo girado, si la cuenta está gravada.
 *
 * El valor en letras y el "recibí" son sobre lo efectivamente girado: la plantilla original
 * ponía el bruto, y un pago de servicios a una persona jurídica hecho por un agente
 * retenedor nunca sale por el bruto.
 */
export function proponerAsientoEgreso({ mapa, cuentaTesoreria, aplicaciones, retenciones = [], gmfTarifaPorMil = 4 }) {
  if (!mapa?.proveedores) throw fallo("SIN_MAPA", "Configura la cuenta de proveedores en el mapa de cuentas.");
  if (!cuentaTesoreria) throw fallo("SIN_TESORERIA", "Selecciona la caja o banco de donde salió el dinero.");

  // Lo aplicado ES el dinero que salió: `totalAPagar` ya viene neto de retenciones.
  const movido = r2(aplicaciones.reduce((a, x) => a + Number(x.valorAplicado || 0), 0));
  const totalRet = r2(retenciones.reduce((a, x) => a + Number(x.valor || 0), 0));
  const causadas = mapa.retencionesEnCausacion !== false;

  const cuentaPorTipo = {
    retefuente: mapa.reteFuentePorPagar,
    reteiva: mapa.reteIvaPorPagar,
    reteica: mapa.reteIcaPorPagar,
  };

  const movimientos = [];
  const porPagar = causadas ? movido : r2(movido + totalRet);

  movimientos.push({
    cuenta: mapa.proveedores,
    debito: porPagar,
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
    credito: movido,
    detalle: cuentaTesoreria.nombre,
  });

  // GMF: solo si la cuenta está gravada y hay cuenta configurada. Se propone, y el usuario
  // puede quitarlo — hay cuentas exentas y topes que el sistema no conoce.
  let gmf = 0;
  if (cuentaTesoreria.gravadaGmf && mapa.gmf && movido > 0) {
    gmf = r2(movido * (Number(gmfTarifaPorMil) / 1000));
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

  return {
    movimientos,
    neto: movido,
    totalRetenciones: totalRet,
    bruto: porPagar,
    gmf,
    retencionesInformativas: causadas && totalRet > 0,
  };
}

/**
 * Asiento del comprobante en MODO IMPUTACIÓN.
 *
 * No hay documento previo que cancelar: el movimiento de tesorería tiene enfrente las cuentas
 * de los conceptos que el usuario eligió. La cuenta ya viene resuelta desde el mapa por
 * `normalizarComprobante`; aquí no se decide ninguna.
 *
 *   · EGRESO  → DR cada concepto, CR la cuenta de tesorería (sale la plata).
 *   · INGRESO → DR la cuenta de tesorería, CR cada concepto (entra la plata).
 *
 * Las retenciones también se reconocen si las hay: un pago de servicios por caja menor puede
 * llevar ReteFuente, y ese pasivo con la DIAN nace aquí.
 */
export function proponerAsientoImputacion({ mapa, cuentaTesoreria, tipo, imputaciones, retenciones = [] }) {
  if (!mapa) fallo("SIN_MAPA", "Configura el mapa de cuentas antes de contabilizar.");
  if (!cuentaTesoreria) fallo("SIN_CUENTA", "Indica de qué caja o banco salió o entró el dinero.");
  if (!imputaciones?.length) fallo("SIN_IMPUTACION", "Agrega al menos un concepto con valor.");

  const esIngreso = tipo === "ingreso";
  const totalConceptos = r2(imputaciones.reduce((a, i) => a + Number(i.valor), 0));
  const totalRet = r2(retenciones.reduce((a, r) => a + Number(r.valor), 0));
  // El dinero que se mueve va NETO de las retenciones practicadas: son un pasivo que se
  // consigna después, no plata que salió de la cuenta.
  const movido = r2(totalConceptos - (esIngreso ? 0 : totalRet));

  const movimientos = [];
  const linea = (cuenta, nombreCuenta, debito, credito) => {
    if (r2(debito) <= 0 && r2(credito) <= 0) return;
    movimientos.push({ cuenta, nombreCuenta, debito: r2(debito), credito: r2(credito) });
  };

  for (const i of imputaciones) {
    linea(i.cuentaPuc, i.etiqueta, esIngreso ? 0 : i.valor, esIngreso ? i.valor : 0);
  }

  if (!esIngreso) {
    for (const r of retenciones) {
      const cuenta =
        r.tipo === "retefuente"
          ? mapa.reteFuentePorPagar
          : r.tipo === "reteiva"
            ? mapa.reteIvaPorPagar
            : mapa.reteIcaPorPagar;
      if (!cuenta) {
        fallo("SIN_CUENTA_RET", `Falta la cuenta de ${etiquetaRetencion(r.tipo)} por pagar en el mapa.`);
      }
      linea(cuenta, `${etiquetaRetencion(r.tipo)} por pagar`, 0, r.valor);
    }
  }

  linea(
    cuentaTesoreria.cuentaPuc,
    cuentaTesoreria.nombre,
    esIngreso ? movido : 0,
    esIngreso ? 0 : movido
  );

  return {
    movimientos,
    advertencias: [],
    valorBruto: totalConceptos,
    totalRetenciones: totalRet,
    neto: movido,
  };
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
