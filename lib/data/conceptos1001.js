// Conceptos del formato 1001 (pagos o abonos en cuenta y retenciones practicadas).
//
// Extraidos de la hoja "1001" del libro que aporto el cliente
// (`public/Formato Exogena 2025 Formatos informantes basicos.xlsx`). Material de un TERCERO,
// no la norma: la fuente son los anexos tecnicos de la DIAN, y la lista cambia con el anio — la
// Res. 000227/2025 agrego doce conceptos nuevos. Confirmar antes de presentar.

/** Catalogo de conceptos, tal como los nombra el layout. */
export const CONCEPTOS_1001 = {
  "5002": "Honorarios",
  "5003": "Comisiones",
  "5004": "Servicios",
  "5005": "Arrendamientos",
  "5006": "Intereses y rendimientos financieros causados",
  "5007": "Compra de activos movibles (E.T.Art 60)",
  "5008": "Compra de Activos Fijos (E.T. Art 60)",
  "5010": "Pagos o Abonos en cuenta por concepto de aportes parafiscales al SENA, a las Cajas de Compensación Familiar y al Instituto Colombiano de Bienestar Familiar",
  "5011": "Pagos o abonos en cuenta efectuado a las empresas promotoras de salud EPS y los aportes al Sistema de Riesgos Laborales, incluidos los aportes del trabajador",
  "5012": "Pagos o abonos en cuenta por concepto de aportes obligatorios para pensiones efectuados a los Fondos de Pensiones, incluidos los aportes del trabajador",
  "5013": "Donaciones en dinero efectuadas a las entidades señaladas en los artículos 125, 125-4,126-2 y 158-1 del Estatuto Tributario y la establecida en el artículo 16 de la Ley 814 de 2003, y demás que determine la ley",
  "5014": "Donaciones en activos diferentes a dinero efectuadas a las entidades señaladas en los artículos 125, 125-4,126-2 y 158-1 del Estatuto Tributario y la establecida en el artículo 16 de la Ley 814 de 2003, y demás que determine la ley",
  "5015": "El valor de los impuestos solicitados como deducción",
  "5016": "Los demás costos y deducciones",
  "5018": "Importe de las primas de reaseguros pagados o abonados en cuenta",
  "5019": "El monto de las amortizaciones realizadas",
  "5020": "Compra de activos fijos reales productivos sobre los cuales solicitó deducción, art. 158-3 E.T. No debe incluirse en concepto 5008.",
  "5023": "Valor acumulado de los pagos o abonos en cuenta al exterior por asistencia técnica",
  "5024": "Valor acumulado de los pagos o abonos en cuenta al exterior por marcas",
  "5025": "Valor acumulado de los pagos o abonos en cuenta al exterior por patentes",
  "5026": "valor acumulado de los pagos o abonos en cuenta al exterior por regalías",
  "5027": "Valor acumulado de los pagos o abonos en cuenta al exterior por servicios técnicos",
  "5028": "El valor acumulado de la devolución de pagos o abonos en cuenta y retenciones correspondientes a operaciones de años anteriores.",
  "5029": "Gastos pagados por anticipado por Compras",
  "5030": "Gastos pagados por anticipado por Honorarios",
  "5031": "Gastos pagados por anticipado por Comisiones",
  "5032": "Gastos pagados por anticipado por Servicios",
  "5033": "Gastos pagados por anticipado por Arrendamientos",
  "5034": "Gastos pagados por anticipado por intereses y rendimientos financieros",
  "5035": "Gastos pagados por anticipado por otros conceptos",
  "5044": "El pago por loterías, rifas, apuestas y similares",
  "5045": "Retención sobre ingresos de tarjetas débito y crédito",
  "5046": "Enajenación de activos fijos de personas naturales ante oficinas de tránsito y otras entidades autorizadas",
  "5047": "Importe de los siniestros por lucro cesante pagados o abonados en cuenta",
  "5048": "Importe de los siniestros por daño emergente pagados o abonados en cuenta",
  "5053": "Retenciones practicas a titulo de timbre",
  "5054": "La devolución de retenciones a título de impuesto de timbre, correspondientes a operaciones de años anteriores",
  "5055": "Viaticos",
  "5056": "Gastos de representacion",
  "5058": "Valor de los Aportes, Tasas y Contribuciones solicitado como deducción",
  "5059": "El pago o abono en cuenta realizado a cada uno de los cooperados, del valor del Fondo para revalorización de aportes",
  "5060": "Redención de inversiones en lo que corresponde al reembolso del capital por titulos de capitalizacion",
  "5061": "Utilidades Pagadas o abonadas en cuenta, cuando el beneficiario es diferente al fideicomitente",
  "5063": "Intereses y rendimientos financieros efectivamente pagados",
  "5064": "Devoluciones de saldos de aportes pensionales pagados (Aplica sólamente a los Fondos de Pensiones Obligatorias)",
  "5065": "Excedentes pensionales de libre disponibilidad componente de capital pagados (Aplica sólamente a los Fondos de Pensiones Obligatorias)",
  "5066": "El valor del impuesto nacional al consumo",
  "5067": "El valor acumulado de los pagos o abonos en cuenta al exterior por consultoría",
  "5068": "Participaciones o dividendos pagados o abonados en cuenta en calidad de exigibles correspondientes a 2016 y anteriores, parágrafo 2 artículo 49 E.T.",
  "5069": "Participaciones o dividendos pagados o abonados en cuenta en calidad de exigibles correspondientes a 2016 y anteriores, numeral 3 del artículo 49 E.T.",
  "5070": "Participaciones o dividendos pagados o abonados en cuenta en calidad de exigibles correspondientes a 2017 y siguientes, parágrafo 2 artículo 49 E.T.",
  "5071": "Participaciones o dividendos pagados o abonados en cuenta en calidad de exigibles correspondientes a 2017 y siguientes, numeral 3 del artículo 49 E.T.",
  "5072": "El importe de los siniestros por seguros de vida pagados o abonados en cuenta",
  "5073": "Desembolsos por depósitos judiciales. Se debe identificar al beneficiario",
  "5074": "Desembolsos por reintegros de depósitos judiciales. Se debe identificar al beneficiario",
  "5075": "Regalías y explotación de la propiedad intelectual",
  "5076": "Valor de utilidades distribuidas provenientes de diferimiento de ingresos, inciso 4 del art. 23-1 del E.T.",
  "5079": "Intereses por deuda a vinculados en subcapitalización art.118-1 E.T.",
  "5080": "El valor acumulado de los pagos o abonos efectuados a proveedores del exterior por servicios audiovisuales digitales (entre otros, de música, videos, películas y juegos de cualquier tipo, así como la radiodifusión de cualquier tipo de evento).Art.437-2 num.8 E.T.",
  "5081": "El valor acumulado de los pagos o abonos efectuados a proveedores del exterior por servicios prestados a través de plataformas digitales. Art.437-2 num.8 E.T.",
  "5082": "El valor acumulado de los pagos o abonos efectuados a proveedores del exterior por suministro de servicios de publicidad online. Art.437-2 num.8 E.T.",
  "5083": "El valor acumulado de los pagos o abonos efectuados a proveedores del exterior por suministro de enseñanza o entrenamiento a distancia. Art.437-2 num.8 E.T.",
  "5084": "El valor acumulado de los pagos o abonos efectuados a proveedores del exterior por suministro de derechos de uso o explotación de intangibles. Art.437-2 num.8 E.T.",
  "5085": "El valor acumulado de los pagos o abonos efectuados a proveedores del exterior por Otros servicios electrónicos o digitales con destino a usuarios ubicados en Colombia. Art.437-2 num.8 E.T.",
  "5086": "Valor retención en la fuente trasladada a terceros por participaciones o dividendos recibidos de sociedades nacionales E.T. art. 242-1 par.1",
  "5087": "Valor de los puntos premio redimidos en el período que afectan el gasto directamente, procedentes de programas de fidelización.",
  "5088": "Costos y gastos por diferencia en cambio.Se debe repoortar con el NIT del informante",
  "5089": "Valor compra de acciones, cuotas o partes de interés social o aportes de sociedades que no cotizan en bolsa",
  "5090": "Valor donación de acciones, cuotas o partes de interés social o aportes de sociedades que no cotizan en bolsa",
  "5091": "Valor cesión de acciones, cuotas o partes de interés social o aportes de sociedades que no cotizan en bolsa",
  "5092": "Valor del pago que constituye ingreso en especie para el beneficio Art 29-1E. T",
  "5093": "Donaciones de bebidas ultraprocesadas y azucaradas a los bancos de alimentos por los responsables del impuesto a estos bienes ET art 513-1, par 5 adicionado por el art 54 L 2277/2022",
  "5094": "Donaciones de productos comestibles ultraprocesados industrialmente y/o con alto contenido de azucares añadidos, sodio o grasas saturadas a los bancos de alimentos por los responsables del impuesto a estos bienes ET art 513-1, par 5 adicionado por el art 54 L 2277/2022",
  "5095": "Pago por concepto de regalías pagadas a la Nación u otros entes territoriales por la explotación de hidrocarburos por entes diferentes a los organismos descentralizados. ET art 115 par 1",
  "5096": "Pago por concepto de regalías pagadas a la Nación u otros entes territoriales por la explotación de gas por entes diferentes a los organismos descentralizados. ET art 115 par 1",
  "5097": "Pago por concepto de regalías pagadas a la nación u otros entes territoriales por la explotación de carbón por entes diferentes a los organismos descentralizados. ET art 115 par 1",
  "5098": "Pago por concepto de regalías pagadas a la Nación u otros entes territoriales por la explotación de otros minerales y piedras preciosas por entes diferentes a los organismos descentralizados. ET art 115 par 1",
  "5099": "Pago por concepto de regalías pagadas a la Nación u otros entes territoriales por la explotación de sal y materiales de construcción por entes diferentes a los organismos descentralizados. ET art 115 par 1",
};

/**
 * Mapa CUENTA PUC → CONCEPTO 1001, por prefijo, del más específico al más general.
 *
 * POR QUÉ EL 1001 SE DERIVA DE LA CUENTA Y NO DE LA RETENCIÓN. Son dos taxonomías distintas: el
 * concepto de retención dice *por qué se retiene* —y muchas veces no se retiene nada—, mientras
 * el del 1001 dice *qué naturaleza tuvo el pago*, y hay que reportarlo se haya retenido o no.
 * Una compra de $400.000 a un proveedor declarante no llega a la base mínima y no genera
 * retención, pero supera las 3 UVT y **sí se reporta**. Derivarlo de `RetencionPracticada` la
 * perdería entera.
 *
 * Por eso se arma desde el LIBRO AUXILIAR: `AsientoMovimiento` ya guarda `cuenta` y `tercero`
 * (normalizado), que es exactamente lo que el formato agrupa.
 *
 * ⚠️ ESTE MAPA ES UN PUNTO DE PARTIDA, NO UNA VERDAD. Está hecho sobre la estructura del PUC
 * comercial y del ESAL cargados; una empresa con su propio plan de cuentas necesitará ajustarlo,
 * y ese ajuste todavía NO tiene pantalla. Lo que no encaje cae en `5016` (los demás costos y
 * deducciones), que es el cajón previsto por el propio formato, y el extracto lo AVISA con el
 * conteo en vez de dejar creer que la clasificación está completa.
 */
export const MAPA_CUENTA_1001 = [
  // --- Gastos de personal y aportes (el tercero es la EPS, el fondo o la caja, no el empleado) ---
  ["510527", "5011"], // salud empleador → EPS
  ["510528", "5012"], // pensión empleador → fondo
  ["510529", "5011"], // ARL: entidad de seguridad social
  ["510531", "5010"], // parafiscales → SENA / ICBF / caja
  ["510540", "5011"],
  ["510545", "5010"],
  ["2370", "5011"],
  ["2380", "5010"],

  // --- Conceptos con retención propia ---
  ["5110", "5002"], // honorarios
  ["511005", "5002"],
  ["5120", "5005"], // arrendamientos
  ["512005", "5005"],
  ["5135", "5004"], // servicios
  ["513505", "5004"],
  ["5115", "5015"], // impuestos solicitados como deducción
  ["511505", "5015"],
  ["5305", "5006"], // gastos financieros → intereses y rendimientos
  ["530520", "5006"],
  ["5165", "5019"], // amortizaciones
  ["516505", "5019"],

  // --- Compras: activos MOVIBLES (art. 60 E.T.) ---
  ["1435", "5007"],
  ["1420", "5007"],
  ["14", "5007"], // resto de inventarios
  ["62", "5007"], // compras (método periódico)
  ["6", "5007"], // costo de ventas

  // --- Activos FIJOS (art. 60 E.T.) ---
  ["15", "5008"],

  // --- Impuesto al consumo pagado ---
  ["249505", "5066"],
  ["2495", "5066"],

  // --- Cajón del propio formato para lo que no encaja ---
  ["51", "5016"],
  ["52", "5016"],
  ["53", "5016"],
  ["54", "5016"],
  ["55", "5016"],
  ["5", "5016"],
  ["7", "5016"],
];

/** Concepto por defecto: "los demás costos y deducciones". */
export const CONCEPTO_1001_POR_DEFECTO = "5016";

/**
 * Resuelve el concepto de una cuenta. Recorre el mapa por prefijo más largo primero, así que el
 * orden del array no importa y agregar un auxiliar específico no obliga a reordenar nada.
 */
export function concepto1001DeCuenta(cuenta) {
  const c = (cuenta || "").toString();
  if (!c) return null;
  let mejor = null;
  for (const [prefijo, concepto] of MAPA_CUENTA_1001) {
    if (c.startsWith(prefijo) && (!mejor || prefijo.length > mejor[0].length)) {
      mejor = [prefijo, concepto];
    }
  }
  return mejor ? mejor[1] : null;
}

/**
 * Categoría interna de retención → concepto 1001, para poder imputar la retención practicada a
 * la fila que le corresponde. Se usa solo cuando la retención no encuentra una fila del libro
 * con la que casar.
 */
export const CATEGORIA_RETENCION_A_1001 = {
  Honorarios: "5002",
  Comisiones: "5003",
  Servicios: "5004",
  Arrendamientos: "5005",
  "Rendimientos Financieros": "5006",
  Compras: "5007",
  Transportes: "5004",
  Construcción: "5004",
  "Loterías y Juegos": "5044",
  "Pagos Laborales": "5016",
  "Venta de Activos": "5046",
};
