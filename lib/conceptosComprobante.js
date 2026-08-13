// Conceptos del comprobante en MODO IMPUTACIÓN.
//
// EL PROBLEMA. Un comprobante de egreso solo se podía aplicar a compras y uno de ingreso solo
// a facturas. Así, un pago de nómina, de impuestos, de servicios públicos o de caja menor —y
// un anticipo de cliente, un préstamo recibido o un aporte de socios— no tenían por dónde
// registrarse en NINGÚN módulo: la nota de contabilidad tampoco puede, porque está blindada
// contra las cuentas de tesorería.
//
// POR QUÉ NO SE ABRE EL PUC. La tentación es dejar que el usuario escriba la contrapartida.
// Eso convierte el comprobante en un asiento manual disfrazado, y el asiento manual se cerró
// a propósito: sin documento que lo soporte no cumple el art. 124 del Decreto 2649.
//
// LA REGLA. El usuario elige el QUÉ —un concepto de esta lista— y el sistema decide el DÓNDE,
// leyendo la cuenta del mapa. El usuario nunca teclea un código PUC. Es el mismo principio que
// ya rige la contabilización automática de las operaciones.

/**
 * @property clave         id del concepto
 * @property etiqueta      lo que ve el usuario
 * @property cuenta        campo de `MapaCuentas` del que sale la contrapartida
 * @property ayuda         por qué esa cuenta y cuándo se usa
 * @property requiereSoporte  el pago de un COSTO O GASTO a un tercero exige factura o
 *                            documento soporte para ser deducible (Art. 771-2 E.T.)
 */
const EGRESO = [
  {
    clave: "nomina",
    etiqueta: "Pago de nómina",
    cuenta: "salariosPorPagar",
    ayuda: "Cancela el neto que quedó por pagarle al trabajador cuando se liquidó la nómina.",
  },
  {
    clave: "salud",
    etiqueta: "Aportes de salud (EPS)",
    cuenta: "saludPorPagar",
    ayuda: "Consigna a la EPS lo descontado al trabajador.",
  },
  {
    clave: "pension",
    etiqueta: "Aportes de pensión",
    cuenta: "pensionPorPagar",
    ayuda: "Consigna al fondo lo descontado al trabajador.",
  },
  {
    clave: "retefuente",
    etiqueta: "Pago de ReteFuente a la DIAN",
    cuenta: "reteFuentePorPagar",
    ayuda: "Cancela lo retenido y declarado en el formulario 350.",
  },
  {
    clave: "reteiva",
    etiqueta: "Pago de ReteIVA a la DIAN",
    cuenta: "reteIvaPorPagar",
    ayuda: "Cancela la retención de IVA practicada.",
  },
  {
    clave: "reteica",
    etiqueta: "Pago de ReteICA al municipio",
    cuenta: "reteIcaPorPagar",
    ayuda: "Cancela la retención de industria y comercio del municipio donde se practicó.",
  },
  {
    clave: "iva",
    etiqueta: "Pago de IVA a la DIAN",
    cuenta: "ivaGenerado",
    ayuda: "Cancela el saldo a pagar de la declaración de IVA del periodo.",
  },
  {
    clave: "inc",
    etiqueta: "Pago de Impuesto al Consumo",
    cuenta: "incPorPagar",
    ayuda: "El INC se declara aparte del IVA y tiene su propio formulario.",
  },
  {
    clave: "gastos",
    etiqueta: "Gasto o servicio sin documento previo",
    cuenta: "gastosGenerales",
    ayuda:
      "Servicios públicos, arriendo, caja menor. Ojo: para que el gasto sea deducible necesitas la factura del proveedor o un documento soporte.",
    requiereSoporte: true,
  },
  {
    clave: "anticipo_proveedor",
    etiqueta: "Anticipo a proveedor",
    cuenta: "anticiposPorLegalizar",
    ayuda:
      "La plata sale antes de tener el bien, el servicio o el documento. Es un ACTIVO, no un gasto, hasta que se legalice.",
  },
  {
    clave: "prestamo_empleado",
    etiqueta: "Préstamo a un empleado",
    cuenta: "prestamosEmpleados",
    ayuda: "Crea la cuenta por cobrar que después se descuenta por nómina.",
  },
  {
    clave: "otras_deducciones",
    etiqueta: "Otras deducciones de nómina",
    cuenta: "otrasDeduccionesNomina",
    ayuda: "Embargos, libranzas, fondo de empleados: se consignan a quien corresponde.",
  },
  {
    clave: "gmf",
    etiqueta: "GMF (4x1000)",
    cuenta: "gmf",
    ayuda: "Gravamen a los movimientos financieros cobrado por el banco.",
  },
];

const INGRESO = [
  {
    clave: "anticipo_cliente",
    etiqueta: "Anticipo de un cliente",
    cuenta: "anticipoClientes",
    ayuda:
      "Dinero recibido que NO corresponde a una factura emitida. Es un PASIVO, no un ingreso: tratarlo como ingreso cambia el IVA del periodo.",
  },
  {
    clave: "prestamo_recibido",
    etiqueta: "Préstamo recibido",
    cuenta: "obligacionesFinancieras",
    ayuda: "Entra plata y nace una obligación con el banco o el prestamista. No es ingreso.",
  },
  {
    clave: "aporte_socios",
    etiqueta: "Aporte de socios",
    cuenta: "aportesSociales",
    ayuda: "Capitalización. Va al patrimonio, no al resultado del periodo.",
  },
  {
    clave: "devolucion_dian",
    etiqueta: "Devolución de saldo a favor",
    cuenta: "reteFuenteFavor",
    ayuda: "La DIAN devuelve un anticipo de impuesto que estaba a nuestro favor.",
  },
];

export const CONCEPTOS_COMPROBANTE = { ingreso: INGRESO, egreso: EGRESO };

export function conceptosDe(tipo) {
  return CONCEPTOS_COMPROBANTE[tipo] || [];
}

export function buscarConceptoComprobante(tipo, clave) {
  return conceptosDe(tipo).find((c) => c.clave === clave) || null;
}

/**
 * Conceptos utilizables: los que tienen su cuenta definida en el mapa.
 *
 * Se devuelven TODOS, marcando cuáles no se pueden usar todavía y por qué. Esconder los que
 * faltan dejaría al usuario buscando una opción que no aparece, sin saber que el problema es
 * su mapa de cuentas.
 */
export function conceptosDisponibles(tipo, mapa) {
  return conceptosDe(tipo).map((c) => ({
    ...c,
    cuentaPuc: mapa?.[c.cuenta] || null,
    disponible: !!mapa?.[c.cuenta],
  }));
}
