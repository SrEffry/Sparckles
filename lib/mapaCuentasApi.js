// Cliente de la API del mapa de cuentas y las cuentas de tesorería.

export async function obtenerMapaCuentas() {
  const res = await fetch("/api/mapa-cuentas", { cache: "no-store" });
  if (!res.ok) return { mapa: null, tesoreria: [], faltantes: [], configurado: false };
  return res.json();
}

export async function guardarMapaCuentas(payload) {
  const res = await fetch("/api/mapa-cuentas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo guardar el mapa de cuentas.", errores: data.errores };
  return data;
}

/** Siembra las sugerencias iniciales. Falla si el mapa ya existe. */
export async function sembrarMapaCuentas(sector = "comercial") {
  const res = await fetch(`/api/mapa-cuentas?sector=${sector}`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudieron cargar las sugerencias." };
  return data;
}

export async function listarTesoreria() {
  const res = await fetch("/api/tesoreria", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.cuentas || [];
}

export async function crearCuentaTesoreria(payload) {
  const res = await fetch("/api/tesoreria", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo crear la cuenta." };
  return data;
}

export async function actualizarCuentaTesoreria(id, payload) {
  const res = await fetch(`/api/tesoreria/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo actualizar la cuenta." };
  return data;
}

export async function desactivarCuentaTesoreria(id) {
  const res = await fetch(`/api/tesoreria/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo desactivar la cuenta." };
  return data;
}
