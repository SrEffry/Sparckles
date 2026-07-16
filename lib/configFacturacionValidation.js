// Validación + normalización de ConfigFacturacion (servidor). Espeja `Config-facturacion.js`.
// `numeracionActual` NO se fija aquí: lo maneja el endpoint (preserva el consecutivo vigente).

import { esFechaISOValida } from "@/lib/fechas";

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

  const resVencimiento = T(body.resVencimiento);

  if (!resNumero || !resFecha || numeracionDesde == null || numeracionHasta == null) {
    errors.push("Complete la información de la resolución DIAN.");
  }
  // La vigencia es obligatoria: si queda vacía no habría contra qué validar al emitir y se
  // podría facturar indefinidamente con una resolución vencida.
  if (!resVencimiento) {
    errors.push("La fecha de vencimiento de la resolución DIAN es obligatoria.");
  }
  if (resFecha && !esFechaISOValida(resFecha)) {
    errors.push("La fecha de la resolución no es válida.");
  }
  if (resVencimiento && !esFechaISOValida(resVencimiento)) {
    errors.push("La fecha de vencimiento de la resolución no es válida.");
  }
  if (
    resFecha &&
    resVencimiento &&
    esFechaISOValida(resFecha) &&
    esFechaISOValida(resVencimiento) &&
    resVencimiento <= resFecha
  ) {
    errors.push("El vencimiento de la resolución debe ser posterior a su fecha de expedición.");
  }
  if (
    numeracionDesde != null &&
    numeracionHasta != null &&
    numeracionDesde >= numeracionHasta
  ) {
    errors.push('La numeración "Hasta" debe ser mayor que "Desde".');
  }

  // Un emisor no responsable de IVA no puede cobrarlo: esto condiciona el cálculo de la factura.
  let responsableIva = body.responsableIva === undefined ? true : !!body.responsableIva;
  // El régimen manda sobre la bandera: evita guardar combinaciones contradictorias vía API.
  if (regimen === "Responsable de IVA") responsableIva = true;
  if (regimen === "No responsable de IVA") responsableIva = false;

  const data = {
    logo: body.logo ? String(body.logo) : null,
    razonSocial,
    nit,
    regimen,
    responsableIva,
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
    resVencimiento: resVencimiento || null,
  };

  return { data, errors };
}
