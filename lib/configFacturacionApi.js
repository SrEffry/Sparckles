// Cliente de la API de configuración de facturación (1 por usuario).

export async function obtenerConfig() {
  const res = await fetch("/api/config-facturacion", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.config || null;
}

export async function guardarConfig(payload) {
  const res = await fetch("/api/config-facturacion", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar la configuración." };
  return { config: data.config };
}
