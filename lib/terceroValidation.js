// Validación del tercero (servidor).
//
// Un tercero se valida como una FICHA DE IDENTIDAD, no como un documento fiscal: lo único
// indispensable es el documento —que es su clave— y un nombre con el que reconocerlo. Todo lo
// demás son columnas de exógena que se completan cuando se tengan, y que el tablero de
// preparación reclama a tiempo. Exigirlas aquí impediría dar de alta a un proveedor por un dato
// que solo hace falta en abril.

import { normalizarDocumento } from "@/lib/retencionesPracticadas";
import { CODIGOS_DOCUMENTO_DIAN } from "@/lib/data/tiposDocumentoDian";
import { buscarDepartamento, buscarPais, MUNICIPIOS } from "@/lib/data/dane";

const T = (v) => (v ?? "").toString().trim() || null;

export function validarTercero(body) {
  const errors = [];

  const { numero, dv } = normalizarDocumento(body.documento);
  if (!numero) errors.push("El número de identificación es obligatorio.");

  const tipo = body.tipo === "natural" ? "natural" : "juridica";

  const primerApellido = T(body.primerApellido);
  const primerNombre = T(body.primerNombre);
  const razonSocial = T(body.razonSocial);

  // El nombre para mostrar se ARMA de los campos DIAN cuando están, en vez de pedirlo aparte y
  // arriesgar que diga una cosa distinta de lo que se va a reportar.
  const nombreArmado =
    tipo === "natural"
      ? [primerNombre, T(body.otrosNombres), primerApellido, T(body.segundoApellido)]
          .filter(Boolean)
          .join(" ")
      : razonSocial;
  const nombre = nombreArmado || T(body.nombre);
  if (!nombre) errors.push("Indique la razón social o el nombre del tercero.");

  const tipoDocumentoDian = T(body.tipoDocumentoDian);
  if (tipoDocumentoDian && !CODIGOS_DOCUMENTO_DIAN.has(tipoDocumentoDian))
    errors.push("El tipo de documento no es un código válido de la DIAN.");

  // Los códigos de ubicación se validan contra el catálogo: un código inventado produce una
  // columna que la DIAN rechaza, y es el tipo de error que no se ve hasta que se presenta.
  const codigoDepartamento = T(body.codigoDepartamento);
  const codigoMunicipio = T(body.codigoMunicipio);
  if (codigoDepartamento && !buscarDepartamento(codigoDepartamento))
    errors.push("El código de departamento no existe en el catálogo DANE.");
  if (codigoMunicipio) {
    if (!codigoDepartamento) {
      errors.push("El código de municipio necesita también el de departamento.");
    } else {
      const completo = `${codigoDepartamento.padStart(2, "0")}${codigoMunicipio.padStart(3, "0")}`;
      if (!MUNICIPIOS.some((m) => m.codigo === completo))
        errors.push(
          `El municipio ${codigoMunicipio} no pertenece al departamento ${codigoDepartamento}.`
        );
    }
  }

  const codigoPais = T(body.codigoPais);
  if (codigoPais && !buscarPais(codigoPais))
    errors.push("El código de país no existe en el catálogo de la DIAN.");

  const datos = {
    documento: numero,
    dv: T(body.dv) || dv || null,
    tipoDocumentoDian,
    tipo,
    nombre,
    razonSocial: tipo === "juridica" ? razonSocial || nombre : null,
    primerApellido: tipo === "natural" ? primerApellido : null,
    segundoApellido: tipo === "natural" ? T(body.segundoApellido) : null,
    primerNombre: tipo === "natural" ? primerNombre : null,
    otrosNombres: tipo === "natural" ? T(body.otrosNombres) : null,
    direccion: T(body.direccion),
    telefono: T(body.telefono),
    email: T(body.email),
    codigoDepartamento,
    codigoMunicipio,
    codigoPais,
    activo: body.activo !== false,
  };

  return { errors, datos };
}
