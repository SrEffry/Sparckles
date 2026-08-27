// Cliente de la API de Reportes.
//
// Hoy solo el diagnóstico de preparación para exógena. Cuando lleguen los formatos, sus
// descargas se agregan aquí y los componentes siguen sin tocar `fetch` directamente.

export async function obtenerPreparacionExogena(anio) {
  const qs = anio ? `?anio=${anio}` : "";
  const res = await fetch(`/api/reportes/exogena/preparacion${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
