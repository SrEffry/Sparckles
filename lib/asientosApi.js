// Cliente de la API de asientos contables + búsqueda PUC.

export async function listarAsientos() {
  const res = await fetch("/api/asientos", { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).asientos || [];
}

export async function obtenerAsiento(id) {
  const res = await fetch(`/api/asientos/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()).asiento || null;
}

export async function crearAsiento(payload) {
  const res = await fetch("/api/asientos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar el asiento." };
  return { asiento: data.asiento };
}

export async function actualizarAsiento(id, payload) {
  const res = await fetch(`/api/asientos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al actualizar." };
  return { asiento: data.asiento };
}

export async function anularAsiento(id, motivo) {
  const res = await fetch(`/api/asientos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "anular", motivo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo anular." };
  return { asiento: data.asiento };
}

// Búsqueda de cuentas PUC (autocompletar)
export async function buscarCuentas(sector, q) {
  const params = new URLSearchParams({ sector, q: q || "", imputables: "1" });
  const res = await fetch(`/api/puc?${params}`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).cuentas || [];
}
