// Cliente de la API del catálogo de impuestos.

/**
 * Impuestos disponibles. Si se pasa `fecha`, el servidor filtra por vigencia: una tarifa
 * derogada no debe aparecer como opción en un documento posterior a su derogatoria.
 */
export async function listarImpuestos({ fecha, tipo } = {}) {
  const qs = new URLSearchParams();
  if (fecha) qs.set("fecha", fecha);
  if (tipo) qs.set("tipo", tipo);
  const res = await fetch(`/api/impuestos?${qs}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.impuestos || [];
}

/** Carga el catálogo del sistema. Con `migrar`, reclasifica los productos heredados. */
export async function sembrarImpuestos({ migrar = false } = {}) {
  const res = await fetch(`/api/impuestos/seed${migrar ? "?migrar=1" : ""}`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo cargar el catálogo de impuestos." };
  return data;
}
