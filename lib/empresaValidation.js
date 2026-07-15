// Validación + normalización de Empresa (servidor). Espeja el wizard de `nueva-empresa.js`.
// Devuelve { data, errors }. `data` está listo para Prisma (sin usuarioId).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const T = (v) => (v ?? "").toString().trim();

export function normalizarEmpresa(body) {
  const errors = [];
  const tipoEntidad = body.tipoEntidad === "natural" ? "natural" : "juridica";
  const data = {
    tipoEntidad,
    estado: body.estado === "Inactivo" ? "Inactivo" : "Activo",
  };

  if (tipoEntidad === "juridica") {
    const razonSocial = T(body.razonSocial);
    const nit = T(body.nit);
    const dv = T(body.dv);
    const telefono = T(body.telefono);
    const email = T(body.email);

    if (!razonSocial) errors.push("La razón social es obligatoria.");
    if (!nit) errors.push("El NIT es obligatorio.");
    if (dv.length !== 1) errors.push("El dígito de verificación debe ser 1 carácter.");
    if (!telefono) errors.push("El teléfono es obligatorio.");
    if (!EMAIL_RE.test(email)) errors.push("El correo de la empresa no es válido.");

    // Representante legal
    const repNombres = T(body.repNombres);
    const repApellidos = T(body.repApellidos);
    const repTipoDocumento = T(body.repTipoDocumento);
    const repNumeroDocumento = T(body.repNumeroDocumento);
    if (!repNombres) errors.push("Los nombres del representante legal son obligatorios.");
    if (!repApellidos) errors.push("Los apellidos del representante legal son obligatorios.");
    if (!repTipoDocumento) errors.push("El tipo de documento del representante es obligatorio.");
    if (!repNumeroDocumento) errors.push("El número de documento del representante es obligatorio.");

    Object.assign(data, {
      razonSocial,
      nit,
      dv,
      telefono,
      email,
      nombreCompleto: razonSocial,
      repNombres,
      repApellidos,
      repTipoDocumento,
      repNumeroDocumento,
      repTelefono: T(body.repTelefono) || null,
      repEmail: T(body.repEmail) || null,
      // limpiar campos de natural
      nombres: null,
      apellidos: null,
      tipoDocumento: null,
      numeroDocumento: null,
    });
  } else {
    const nombres = T(body.nombres);
    const apellidos = T(body.apellidos);
    const tipoDocumento = T(body.tipoDocumento);
    const numeroDocumento = T(body.numeroDocumento);
    const telefono = T(body.telefono);
    const email = T(body.email);

    if (!nombres) errors.push("Los nombres son obligatorios.");
    if (!apellidos) errors.push("Los apellidos son obligatorios.");
    if (!tipoDocumento) errors.push("El tipo de documento es obligatorio.");
    if (!numeroDocumento) errors.push("El número de documento es obligatorio.");
    if (!telefono) errors.push("El teléfono es obligatorio.");
    if (!EMAIL_RE.test(email)) errors.push("El correo no es válido.");

    Object.assign(data, {
      nombres,
      apellidos,
      nombreCompleto: `${nombres} ${apellidos}`.trim(),
      tipoDocumento,
      numeroDocumento,
      telefono,
      email,
      // limpiar campos de jurídica
      razonSocial: null,
      nit: null,
      dv: null,
      repNombres: null,
      repApellidos: null,
      repTipoDocumento: null,
      repNumeroDocumento: null,
      repTelefono: null,
      repEmail: null,
    });
  }

  // Ubicación
  const pais = T(body.pais);
  const departamento = T(body.departamento);
  const ciudad = T(body.ciudad);
  const direccion = T(body.direccion);
  if (!pais) errors.push("El país es obligatorio.");
  if (!departamento) errors.push("El departamento es obligatorio.");
  if (!ciudad) errors.push("La ciudad es obligatoria.");
  if (!direccion) errors.push("La dirección es obligatoria.");
  Object.assign(data, {
    pais,
    departamento,
    ciudad,
    direccion,
    codigoPostal: T(body.codigoPostal) || null,
  });

  // Tributario
  const tarifaIvaRetenido = T(body.tarifaIvaRetenido);
  if (!tarifaIvaRetenido) errors.push("Seleccione la tarifa de IVA retenido.");
  const aplicaIva = body.aplicaIva === true || body.aplicaIva === "Si";
  const caracteristicas = Array.isArray(body.caracteristicasTributarias)
    ? body.caracteristicasTributarias
    : [];
  Object.assign(data, {
    tarifaIvaRetenido,
    aplicaIva,
    caracteristicasTributarias: aplicaIva ? caracteristicas : [],
  });

  return { data, errors };
}
