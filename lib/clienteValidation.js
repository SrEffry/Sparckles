// Validación + normalización de Cliente (servidor). Espeja `Clientes.js` del sitio actual,
// incluida la lógica de agente retenedor / autorretenedor (que dirige las retenciones en factura).

const T = (v) => (v ?? "").toString().trim();

export function normalizarCliente(body) {
  const errors = [];
  const tipo = body.tipo === "empresa" ? "empresa" : "natural";

  const data = {
    tipo,
    telefono: T(body.telefono) || null,
    email: T(body.email) || null,
    direccion: T(body.direccion) || null,
    ciudad: T(body.ciudad) || null,
    departamento: T(body.departamento) || null,
  };

  if (tipo === "natural") {
    const nombres = T(body.nombres);
    const apellidos = T(body.apellidos);
    const tipoDocumento = T(body.tipoDocumento) || "CC";
    const numeroDocumento = T(body.numeroDocumento);

    if (!nombres) errors.push("Los nombres son obligatorios.");
    if (!apellidos) errors.push("Los apellidos son obligatorios.");
    if (!numeroDocumento) errors.push("El número de documento es obligatorio.");

    Object.assign(data, {
      nombres,
      apellidos,
      nombreCompleto: `${nombres} ${apellidos}`.trim(),
      tipoDocumento,
      numeroDocumento,
      // Personas naturales pueden ser agente retenedor, pero NO autorretenedoras
      esAgenteRetenedor: !!body.esAgenteRetenedor,
      esAutorretenedor: false,
      // limpiar campos de empresa
      razonSocial: null,
      nombreComercial: null,
      nit: null,
      dv: null,
      personaContacto: null,
    });
  } else {
    const razonSocial = T(body.razonSocial);
    const nit = T(body.nit);
    const dv = T(body.dv);

    if (!razonSocial) errors.push("La razón social es obligatoria.");
    if (!nit) errors.push("El NIT es obligatorio.");
    if (dv.length !== 1 || Number.isNaN(Number(dv)))
      errors.push("El DV debe ser un solo dígito numérico.");

    Object.assign(data, {
      razonSocial,
      nombreComercial: T(body.nombreComercial) || razonSocial,
      nombreCompleto: razonSocial,
      nit,
      dv,
      personaContacto: T(body.personaContacto) || null,
      // Empresas: por defecto agente retenedor
      esAgenteRetenedor:
        body.esAgenteRetenedor !== undefined ? !!body.esAgenteRetenedor : true,
      esAutorretenedor: !!body.esAutorretenedor,
      // limpiar campos de natural
      nombres: null,
      apellidos: null,
      tipoDocumento: null,
      numeroDocumento: null,
    });
  }

  return { data, errors };
}
