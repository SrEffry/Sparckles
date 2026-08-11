// Catálogo semilla de impuestos. Se carga a la tabla `Impuesto` con POST /api/impuestos/seed.
//
// ⚠️ ORIGEN DE LOS DATOS Y NIVEL DE CERTEZA
//
// Los códigos de tributo (`codigoDian`) y las tarifas admitidas por impuesto los define la
// DIAN en las tablas 13.2.2 y 13.3.11 del anexo técnico de facturación electrónica. Esas
// tablas NO viven en el PDF del anexo: viven en el Excel de la "Caja de Herramientas" y se
// actualizan sin que cambie el anexo (ya hay versión 2026).
//
// **Antes de integrar con el proveedor tecnológico hay que recargar este catálogo desde ese
// Excel.** Es la única fuente que la validación previa reconoce. Lo de aquí es un punto de
// partida razonable, no la tabla oficial.
//
// Por qué importa la distinción entre rechazo y notificación:
//   · Un `codigoDian` que no esté en la tabla 13.2.2 → la DIAN RECHAZA el documento (FAX16).
//   · Una tarifa fuera de la tabla 13.3.11 → solo NOTIFICA (FAT12/FAX14): la factura se
//     valida igual, mal liquidada. Es decir, la DIAN no va a atrapar el error de tarifa.
//     El control tiene que estar aquí.
//
// Certeza por campo:
//   · IVA 19% y 5%, e INC 8%: ALTA. Son de conocimiento corriente y coinciden con la práctica.
//   · Código DIAN '01' para IVA y '04' para INC: MEDIA. Provienen de documentación de un
//     proveedor tecnológico, no del Excel oficial. Confirmar antes de emitir.
//   · IVA 16% de transición: MEDIA. Corresponde a contratos con entidades estatales
//     celebrados antes de la Ley 1819 de 2016; el alcance exacto lo debe confirmar un
//     contador público.
//   · Tarifas históricas 10%, 20% y 35%: existieron como tarifas diferenciales y fueron
//     desmontadas por la Ley 1607 de 2012 y la Ley 1819 de 2016. El articulado concreto de
//     las derogatorias está PENDIENTE DE CONFIRMAR. Se cargan con `vigenteHasta` para que no
//     puedan usarse en un documento con fecha posterior.
//
// No se incluyen 2,5% ni 40%: no se encontró ninguna fuente que las respalde como tarifas de
// IVA colombianas, ni vigentes ni históricas.

export const IMPUESTOS_SISTEMA = [
  // ---------------- IVA ----------------
  {
    codigo: "IVA_19",
    nombre: "IVA 19% general",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 19,
    vigenteDesde: "2017-01-01",
    vigenteHasta: null,
  },
  {
    codigo: "IVA_5",
    nombre: "IVA 5% reducida",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 5,
    vigenteDesde: "2013-01-01",
    vigenteHasta: null,
  },
  {
    codigo: "IVA_0",
    nombre: "IVA 0% (bienes exentos)",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 0,
    vigenteDesde: "2013-01-01",
    vigenteHasta: null,
    notas:
      "Para bienes exentos (Art. 477 E.T.), que son gravados a tarifa cero y dan derecho a IVA descontable. Los EXCLUIDOS (Art. 476) no llevan grupo de impuesto en absoluto: el anexo técnico lo prohíbe (regla FAX01).",
  },
  {
    codigo: "IVA_16_TRANSICION",
    nombre: "IVA 16% — régimen de transición",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 16,
    vigenteDesde: "2017-01-01",
    vigenteHasta: null,
    notas:
      "No es la tarifa general derogada: aplica a contratos con entidades estatales celebrados antes de la Ley 1819 de 2016, y por eso la DIAN la mantiene en su tabla. El alcance exacto debe confirmarlo un contador público antes de usarla.",
  },

  // ---------------- IVA — tarifas históricas ----------------
  // Con vigencia cerrada: sirven para consultar o registrar documentos de su época, y el
  // sistema impide seleccionarlas en un documento con fecha posterior.
  {
    codigo: "IVA_16_HIST",
    nombre: "IVA 16% general (hasta 2016)",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 16,
    vigenteDesde: "2006-01-01",
    vigenteHasta: "2016-12-31",
    notas: "Tarifa general anterior a la Ley 1819 de 2016, que la subió al 19%.",
  },
  {
    codigo: "IVA_10_HIST",
    nombre: "IVA 10% (histórica)",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 10,
    vigenteDesde: "2006-01-01",
    vigenteHasta: "2012-12-31",
    notas: "Tarifa diferencial desmontada por la Ley 1607 de 2012. Articulado a confirmar.",
  },
  {
    codigo: "IVA_20_HIST",
    nombre: "IVA 20% (histórica)",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 20,
    vigenteDesde: "2006-01-01",
    vigenteHasta: "2012-12-31",
    notas: "Tarifa diferencial desmontada por la Ley 1607 de 2012. Articulado a confirmar.",
  },
  {
    codigo: "IVA_35_HIST",
    nombre: "IVA 35% (histórica)",
    tipo: "IVA",
    codigoDian: "01",
    nombreDian: "IVA",
    tarifa: 35,
    vigenteDesde: "2006-01-01",
    vigenteHasta: "2012-12-31",
    notas: "Tarifa diferencial desmontada por la Ley 1607 de 2012. Articulado a confirmar.",
  },

  // ---------------- Impuesto Nacional al Consumo ----------------
  // NO es IVA: tiene formulario propio y no es descontable para el comprador (es mayor valor
  // del costo o gasto). Antes se liquidaba en el campo de IVA y terminaba en el IVA generado.
  {
    codigo: "INC_8",
    nombre: "INC 8% — restaurantes y bares",
    tipo: "INC",
    codigoDian: "04",
    nombreDian: "INC",
    tarifa: 8,
    vigenteDesde: "2013-01-01",
    vigenteHasta: null,
    notas: "No es descontable para el comprador: es mayor valor del costo o gasto.",
  },
  {
    codigo: "INC_4",
    nombre: "INC 4% — telefonía, datos e internet",
    tipo: "INC",
    codigoDian: "04",
    nombreDian: "INC",
    tarifa: 4,
    vigenteDesde: "2013-01-01",
    vigenteHasta: null,
    notas: "Tarifa a confirmar contra la norma vigente y la tabla DIAN.",
  },
  {
    codigo: "INC_16",
    nombre: "INC 16% — vehículos y otros",
    tipo: "INC",
    codigoDian: "04",
    nombreDian: "INC",
    tarifa: 16,
    vigenteDesde: "2013-01-01",
    vigenteHasta: null,
    notas: "Tarifa a confirmar contra la norma vigente y la tabla DIAN.",
  },
];

/** Tratamientos frente al IVA. Es una categoría, no una tarifa. */
export const TRATAMIENTOS_IVA = [
  {
    valor: "gravado",
    etiqueta: "Gravado",
    ayuda: "Lleva IVA a la tarifa que corresponda.",
  },
  {
    valor: "exento",
    etiqueta: "Exento (Art. 477 E.T.)",
    ayuda:
      "Gravado a tarifa 0%. Da derecho a IVA descontable y a devolución. Se reporta con IVA al 0%.",
  },
  {
    valor: "excluido",
    etiqueta: "Excluido (Art. 476 E.T.)",
    ayuda:
      "No causa IVA y no da derecho a descontable: el IVA de sus insumos se lleva al costo. El anexo técnico prohíbe reportarle grupo de impuesto.",
  },
  {
    valor: "no_gravado",
    etiqueta: "No gravado",
    ayuda: "Operación que no está sujeta al impuesto.",
  },
];

export const TIPOS_IMPUESTO = ["IVA", "INC", "IC", "ICA", "BOLSAS", "OTRO"];

/** ¿Puede usarse este impuesto en un documento con esta fecha? */
export function vigenteEn(impuesto, fecha) {
  if (!fecha) return true;
  if (impuesto.vigenteDesde && fecha < impuesto.vigenteDesde) return false;
  if (impuesto.vigenteHasta && fecha > impuesto.vigenteHasta) return false;
  return true;
}
