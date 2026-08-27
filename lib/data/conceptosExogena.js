// Conceptos de la información exógena y su correspondencia con los conceptos internos.
//
// SON DOS TAXONOMÍAS DISTINTAS, y confundirlas es el error caro del módulo. El concepto de
// RETENCIÓN clasifica *por qué se retiene*; el concepto de EXÓGENA clasifica *qué naturaleza
// tuvo el pago o el ingreso*, y hay que reportarlo se haya retenido o no. Esta tabla traduce
// una en otra donde la correspondencia es 1:1 y real; donde no lo es, cae en "otros conceptos"
// en vez de forzar una equivalencia que no existe.
//
// Tomados de las hojas 1003 y 1007 del libro del cliente. ⚠️ Material de un tercero, no la
// norma: la fuente son los anexos técnicos de la DIAN.

/** Formato 1003 — retenciones en la fuente que NOS practicaron. */
export const CONCEPTOS_1003 = {
  "1301": "Retenciones por salarios y demás pagos laborales",
  "1302": "Retenciones por ventas",
  "1303": "Retenciones por servicios",
  "1304": "Retenciones por honorarios",
  "1305": "Retenciones por comisiones",
  "1306": "Retenciones por intereses y rendimientos financieros",
  "1307": "Retenciones por arrendamientos",
  "1308": "Retención por otros conceptos",
  "1309": "Retención en la fuente en el impuesto a las ventas",
  "1310": "Retención por dividendos y participaciones",
  "1311": "Retención por enajenación de activos fijos de personas naturales",
  "1312": "Retención por ingresos de tarjetas débito y crédito",
  "1313": "Retención por loterías, rifas, apuestas y similares",
  "1314": "Retención por impuesto de timbre",
  "1320": "Retención por dividendos y participaciones recibidas por sociedades nacionales",
};

/**
 * Categoría interna de `lib/data/tablaRetefuente.js` → concepto del 1003.
 *
 * Las que caen en 1308 lo hacen a propósito: el 1003 no tiene un concepto propio para
 * transporte, construcción, emolumentos ni exportaciones, y meterlas en el concepto de otra
 * cosa sería reportar mal. "Venta de activos" tampoco se manda a 1311 automáticamente: ese
 * concepto es específico de la enajenación de activos fijos DE PERSONAS NATURALES, y el sistema
 * no sabe si se cumple esa condición.
 */
export const CATEGORIA_A_1003 = {
  "Pagos Laborales": "1301",
  Compras: "1302",
  Servicios: "1303",
  Honorarios: "1304",
  Comisiones: "1305",
  "Rendimientos Financieros": "1306",
  Arrendamientos: "1307",
  // ⚠️ Puede tener que ser 1320 y el mapeo no lo puede saber. El 1310 es dividendos y
  // participaciones; el 1320 es el mismo hecho pero RECIBIDO POR SOCIEDADES NACIONALES
  // (art. 242-1 E.T.). Depende de la naturaleza del INFORMANTE, no del pago. Rama poco
  // transitada —los dividendos no se facturan— pero queda dicho para no fingir certeza.
  Dividendos: "1310",
  "Loterías y Juegos": "1313",
  // El TRANSPORTE (de carga y de pasajeros) y la CONSTRUCCIÓN son SERVICIOS, aunque tengan
  // tarifa de retención propia. El pagador los reporta en su 1001 bajo el concepto de servicios
  // y la DIAN cruza el 1001 contra el 1003: si el pagador dice "servicios" y nosotros decimos
  // "otros conceptos", el cruce no cuadra. El 1308 es para lo que no encaja en NINGUNA
  // categoría, no para lo que no tiene tarifa propia.
  Transportes: "1303",
  Construcción: "1303",

  // Estos sí caen en 1308 con fundamento: el 1003 no tiene concepto para ellos.
  "Emolumentos Eclesiásticos": "1308",
  Exportaciones: "1308",
  // Rama muerta: si nos retienen por un pago al exterior es que el beneficiario del exterior
  // somos nosotros, y entonces no somos un informante colombiano.
  "Pagos al Exterior": "1308",
  // NO se manda al 1311. El texto completo de ese concepto es "enajenación de activos fijos de
  // personas naturales ANTE OFICINAS DE TRÁNSITO Y OTRAS ENTIDADES AUTORIZADAS": es la retención
  // del 1% del art. 398 E.T., que practica el notario o la oficina de tránsito y solo aplica
  // cuando el enajenante es persona natural. Para un informante sociedad nunca aplica.
  "Venta de Activos": "1308",
  Otros: "1308",
};

/** ReteIVA tiene concepto propio en el 1003. */
export const CONCEPTO_RETEIVA_1003 = "1309";

/**
 * ⚠️ La ReteICA NO va en el 1003. Es un tributo MUNICIPAL: se declara ante el municipio que la
 * estableció, no ante la DIAN, y el 1003 no tiene ningún concepto para ella. Incluirla sería
 * inflar el reporte con un impuesto que no le corresponde.
 */
export const RETEICA_NO_VA_EN_1003 = true;

/** Formato 1007 — ingresos recibidos. Solo los que este módulo puede originar. */
export const CONCEPTOS_1007 = {
  "4001": "Ingresos brutos de actividades ordinarias",
  "4002": "Otros ingresos brutos",
  "4003": "Ingresos por intereses y rendimientos financieros",
  "4019": "Ingresos brutos constitutivos de ganancia ocasional",
};

/**
 * Concepto por defecto del 1007 para una factura de venta.
 *
 * 4001 "actividades ordinarias" es lo que corresponde a la facturación normal de un negocio. Un
 * ingreso que NO sea de la actividad ordinaria —un rendimiento financiero, una ganancia
 * ocasional— no sale por el módulo de facturación, así que aquí no hay nada que adivinar. Si
 * algún día se factura algo distinto, esto tiene que dejar de ser una constante.
 */
export const CONCEPTO_1007_POR_DEFECTO = "4001";
