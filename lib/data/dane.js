// Códigos DANE de departamentos y municipios, y códigos DIAN de países.
//
// PARA QUÉ. La información exógena (Res. DIAN 000227/2025 y sus modificaciones) identifica la
// ubicación del tercero con CÓDIGOS, no con nombres: código de departamento de 2 dígitos y
// código de municipio de 3, en columnas separadas. Diez de los quince formatos los piden.
// Hasta ahora el sistema solo guardaba `departamento` y `ciudad` como texto libre, con lo cual
// ninguna de esas columnas se podía llenar.
//
// DE DÓNDE SALEN. De la hoja "Códigos dtos, mun, paises" del libro que aportó el cliente
// (`public/Formato Exógena 2025 Formatos informantes basicos.xlsx`, de Wiliam Dussán Salazar),
// extraída con `scripts/extraer_dane.py`. Son 33 departamentos, 1.122 municipios y 248 países.
// La extracción valida que no haya duplicados, que todo código de municipio tenga 5 dígitos y
// que su prefijo corresponda a un departamento real; los conteos por departamento cuadran con
// la división político-administrativa (Antioquia 125, Boyacá 123, Cundinamarca 116).
//
// ⚠️ DOS ADVERTENCIAS QUE NO HAY QUE PERDER DE VISTA:
//
// 1. El libro es material de un TERCERO, no la norma. Sirve como catálogo de trabajo; la fuente
//    oficial son los anexos técnicos de la DIAN y la codificación DANE vigente. Antes de que
//    una cifra salga hacia la DIAN, esto lo confirma un contador público.
// 2. La partición del código de 5 dígitos en departamento (2) + municipio (3) es la práctica
//    estándar del DANE y es coherente con todo el archivo, pero **está por confirmar contra el
//    anexo técnico** que sea así como lo espera cada formato. Por eso se guarda también el
//    código completo de 5: si la partición resultara ser otra, se cambia aquí y no en cada
//    consulta.
//
// Los municipios cambian: se crean, se fusionan y se renombran. Este catálogo lleva su año y se
// regenera con el script, igual que se hace con los parámetros de nómina.

import dane from "./dane.json";

export const DEPARTAMENTOS = dane.departamentos;
export const MUNICIPIOS = dane.municipios;
export const PAISES = dane.paises;

/** Colombia, para usarlo de valor por defecto donde el país es obligatorio. */
export const CODIGO_PAIS_COLOMBIA = "169";

const PORCODIGO = new Map(MUNICIPIOS.map((m) => [m.codigo, m]));
const DEPTO = new Map(DEPARTAMENTOS.map((d) => [d.codigo, d]));
const PAIS = new Map(PAISES.map((p) => [p.codigo, p]));

/** Municipios de un departamento, por su código de 2 dígitos. */
export function municipiosDe(codigoDepartamento) {
  const cod = (codigoDepartamento || "").padStart(2, "0");
  return MUNICIPIOS.filter((m) => m.departamento === cod);
}

export const buscarMunicipio = (codigo) => PORCODIGO.get((codigo || "").padStart(5, "0")) || null;
export const buscarDepartamento = (codigo) => DEPTO.get((codigo || "").padStart(2, "0")) || null;
export const buscarPais = (codigo) => PAIS.get((codigo || "").padStart(3, "0")) || null;

/**
 * Parte el código DANE de 5 dígitos en lo que piden los formatos: departamento (2) y municipio
 * (3). Se centraliza aquí a propósito — ver la advertencia 2 de arriba.
 */
export function partirCodigoMunicipio(codigo) {
  const c = (codigo || "").padStart(5, "0");
  if (!/^\d{5}$/.test(c)) return { departamento: null, municipio: null };
  return { departamento: c.slice(0, 2), municipio: c.slice(2) };
}

/**
 * Resuelve un municipio escrito a mano contra el catálogo, para poder migrar lo que ya está
 * guardado como texto. Compara sin tildes, sin mayúsculas y sin espacios de más.
 *
 * Devuelve `null` cuando hay AMBIGÜEDAD y no solo cuando no encuentra nada: hay nombres que se
 * repiten en varios departamentos y adivinar cuál es sería peor que dejarlo pendiente para que
 * lo resuelva una persona.
 */
const plano = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export function resolverMunicipio(nombre, codigoDepartamento = null) {
  const n = plano(nombre);
  if (!n) return null;
  let candidatos = MUNICIPIOS.filter((m) => plano(m.nombre) === n);
  if (codigoDepartamento) {
    const cod = codigoDepartamento.padStart(2, "0");
    candidatos = candidatos.filter((m) => m.departamento === cod);
  }
  return candidatos.length === 1 ? candidatos[0] : null;
}

export function resolverDepartamento(nombre) {
  const n = plano(nombre);
  if (!n) return null;
  const c = DEPARTAMENTOS.filter((d) => plano(d.nombre) === n);
  return c.length === 1 ? c[0] : null;
}
