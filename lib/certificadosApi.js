// Cliente de la API de certificados de retención.

/** Terceros a los que se les retuvo en el año, con lo acumulado por tipo. */
export async function listarTercerosRetenidos(anio) {
  const res = await fetch(`/api/certificados?anio=${anio}`, { cache: "no-store" });
  if (!res.ok) return { anio, terceros: [] };
  return res.json();
}

/** Vista previa del certificado. No lo expide. */
export async function previsualizarCertificado({ anio, terceroDoc, tipo, periodo, municipio }) {
  const qs = new URLSearchParams({ anio: String(anio), terceroDoc });
  if (tipo) qs.set("tipo", tipo);
  if (periodo) qs.set("periodo", periodo);
  if (municipio) qs.set("municipio", municipio);
  const res = await fetch(`/api/certificados?${qs}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo cargar la información." };
  return data;
}

export async function expedirCertificado(payload) {
  const res = await fetch("/api/certificados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo expedir el certificado.", faltantes: data.faltantes };
  return data;
}

export async function anularCertificado(id, motivo) {
  const res = await fetch(`/api/certificados/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "anular", motivo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo anular el certificado." };
  return data;
}
