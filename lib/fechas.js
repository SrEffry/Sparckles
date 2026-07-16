// Fechas en hora de Colombia. `new Date().toISOString()` usa UTC y Bogotá es UTC-5:
// entre las 19:00 y medianoche fecharía los documentos al día siguiente.
const FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Bogotá como 'YYYY-MM-DD'. */
export function hoyBogota() {
  return FMT.format(new Date());
}

/** true si es un 'YYYY-MM-DD' que además existe en el calendario (rechaza 2026-13-45). */
export function esFechaISOValida(v) {
  const s = (v ?? "").toString().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return (
    fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
  );
}
