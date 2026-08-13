// Cliente del atajo: legalizar un comprobante de egreso con un documento soporte.

/** Vista previa: qué heredaría, qué falta y qué advertir. No crea nada. */
export async function previsualizarSoporte(comprobanteId) {
  const res = await fetch(`/api/comprobantes/${comprobanteId}/soporte`, { cache: "no-store" });
  if (!res.ok) return { errores: ["No se pudo cargar la información."], avisos: [] };
  return res.json();
}

export async function generarSoporte(comprobanteId, payload) {
  const res = await fetch(`/api/comprobantes/${comprobanteId}/soporte`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo generar el documento soporte.", errores: data.errores };
  return data;
}
