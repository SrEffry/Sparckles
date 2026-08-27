// Cliente de la API de terceros.

export async function listarTerceros({ q = "", pendientes = false } = {}) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (pendientes) qs.set("pendientes", "1");
  const res = await fetch(`/api/terceros?${qs}`, { cache: "no-store" });
  if (!res.ok) return { terceros: [] };
  return res.json();
}

export async function obtenerTercero(id) {
  const res = await fetch(`/api/terceros/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const d = await res.json();
  return d.tercero || null;
}

export async function crearTercero(payload) {
  const res = await fetch("/api/terceros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return { error: d.error || "No se pudo crear el tercero." };
  return { tercero: d.tercero };
}

export async function guardarTercero(id, payload) {
  const res = await fetch(`/api/terceros/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return { error: d.error || "No se pudo guardar." };
  return { tercero: d.tercero };
}

export async function eliminarTercero(id) {
  const res = await fetch(`/api/terceros/${id}`, { method: "DELETE" });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return { error: d.error || "No se pudo eliminar." };
  return d;
}

/**
 * Backfill: enlaza con su tercero las compras y soportes registrados antes de que existiera el
 * registro. Idempotente, se puede repetir.
 */
export async function consolidarTerceros() {
  const res = await fetch("/api/terceros", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "consolidar" }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return { error: d.error || "No se pudo consolidar." };
  return { resumen: d.resumen };
}
