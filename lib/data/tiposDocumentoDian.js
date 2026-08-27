// Tipos de documento de identificación según la DIAN.
//
// Son los códigos que exige la columna "Tipo de documento" de la información exógena
// (Res. 000227/2025) y los mismos que usa la factura electrónica. Tomados de la hoja 1001 del
// libro que aportó el cliente.
//
// POR QUÉ UN CATÁLOGO Y NO TEXTO LIBRE. Hoy `Cliente.tipoDocumento` guarda cadenas como
// "CC" o "Cédula": ninguna de las dos sirve para llenar la columna, que espera "13". Y la
// exógena se reporta POR IDENTIFICACIÓN, así que el par (tipo, número) tiene que ser exacto o
// el cruce de la DIAN no encuentra al tercero.

export const TIPOS_DOCUMENTO_DIAN = [
  { codigo: "11", nombre: "Registro civil de nacimiento", persona: "natural" },
  { codigo: "12", nombre: "Tarjeta de identidad", persona: "natural" },
  { codigo: "13", nombre: "Cédula de ciudadanía", persona: "natural" },
  { codigo: "21", nombre: "Tarjeta de extranjería", persona: "natural" },
  { codigo: "22", nombre: "Cédula de extranjería", persona: "natural" },
  { codigo: "31", nombre: "NIT", persona: "juridica" },
  { codigo: "41", nombre: "Pasaporte", persona: "natural" },
  { codigo: "42", nombre: "Documento de identificación extranjero", persona: "natural" },
  {
    codigo: "43",
    nombre: "Sin identificación del exterior o para uso definido por la DIAN",
    persona: "natural",
    // Es el que acompaña al NIT 222222222 con el que se acumulan las cuantías menores y los
    // terceros del exterior sin identificar. No se elige a mano en un formulario.
    interno: true,
  },
  { codigo: "47", nombre: "Permiso Especial de Permanencia", persona: "natural" },
  { codigo: "48", nombre: "Permiso por Protección Temporal", persona: "natural" },
];

export const CODIGOS_DOCUMENTO_DIAN = new Set(TIPOS_DOCUMENTO_DIAN.map((t) => t.codigo));

/** Los que se ofrecen en un formulario (sin el 43, que es de uso interno del reporte). */
export const TIPOS_DOCUMENTO_SELECCIONABLES = TIPOS_DOCUMENTO_DIAN.filter((t) => !t.interno);

export const nombreTipoDocumento = (codigo) =>
  TIPOS_DOCUMENTO_DIAN.find((t) => t.codigo === codigo)?.nombre || null;

/**
 * NIT con el que la exógena acumula lo que no alcanza la cuantía mínima y los terceros del
 * exterior sin identificar, con su tipo de documento. No es un tercero real.
 */
export const NIT_CUANTIAS_MENORES = "222222222";
export const TIPO_DOC_CUANTIAS_MENORES = "43";

/**
 * Traduce las abreviaturas que el sistema viene guardando como texto ("CC", "NIT", "CE"…) al
 * código DIAN. Devuelve `null` cuando no lo reconoce: es para MIGRAR lo que ya está guardado, y
 * ahí adivinar mal es peor que dejar el campo pendiente para que lo revise una persona.
 */
const EQUIVALENCIAS = {
  RC: "11",
  TI: "12",
  CC: "13",
  CEDULA: "13",
  "CÉDULA": "13",
  TE: "21",
  CE: "22",
  NIT: "31",
  PA: "41",
  PASAPORTE: "41",
  PEP: "47",
  PPT: "48",
};

export function codigoDianDesdeTexto(texto) {
  const t = (texto || "").toString().trim().toUpperCase();
  if (!t) return null;
  if (CODIGOS_DOCUMENTO_DIAN.has(t)) return t; // ya venía en código
  return EQUIVALENCIAS[t] || null;
}
