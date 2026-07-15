export async function obtenerResumen() {
  const res = await fetch("/api/resumen", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.resumen || null;
}
