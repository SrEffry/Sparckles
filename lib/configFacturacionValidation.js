// Validación + normalización de ConfigFacturacion (servidor). Espeja `Config-facturacion.js`.
// `numeracionActual` NO se fija aquí: lo maneja el endpoint (preserva el consecutivo vigente).

const T = (v) => (v ?? "").toString().trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarConfig(body) {
  const errors = [];

  const razonSocial = T(body.razonSocial);
  const nit = T(body.nit);
  const regimen = T(body.regimen);
  const direccion = T(body.direccion);
  const ciudad = T(body.ciudad);
  const telefono = T(body.telefono);
  const email = T(body.email);

  if (!razonSocial || !nit || !regimen || !direccion || !ciudad || !telefono || !email) {
    errors.push("Complete todos los campos obligatorios del emisor.");
  }
  if (email && !EMAIL_RE.test(email)) errors.push("El correo del emisor no es válido.");

  const resNumero = T(body.resNumero);
  const resFecha = T(body.resFecha);
  const numeracionDesde =
    body.numeracionDesde !== "" && body.numeracionDesde != null
      ? parseInt(body.numeracionDesde, 10)
      : null;
  const numeracionHasta =
    body.numeracionHasta !== "" && body.numeracionHasta != null
      ? parseInt(body.numeracionHasta, 10)
      : null;

  if (!resNumero || !resFecha || numeracionDesde == null || numeracionHasta == null) {
    errors.push("Complete la información de la resolución DIAN.");
  }
  if (
    numeracionDesde != null &&
    numeracionHasta != null &&
    numeracionDesde >= numeracionHasta
  ) {
    errors.push('La numeración "Hasta" debe ser mayor que "Desde".');
  }

  const data = {
    logo: body.logo ? String(body.logo) : null,
    razonSocial,
    nit,
    regimen,
    direccion,
    ciudad,
    telefono,
    email,
    actividadEconomica: T(body.actividadEconomica) || null,
    pieFact: T(body.pieFact) || null,
    observaciones: T(body.observaciones) || null,
    resNumero,
    resFecha: resFecha || null,
    prefijo: T(body.prefijo) || null,
    numeracionDesde,
    numeracionHasta,
    resVencimiento: T(body.resVencimiento) || null,
  };

  return { data, errors };
}
