// Cliente de la API de empresas. Los componentes solo hablan con estas funciones.

export async function listarEmpresas() {
  const res = await fetch("/api/empresas", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.empresas || [];
}

export async function obtenerEmpresa(id) {
  const res = await fetch(`/api/empresas/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.empresa || null;
}

export async function crearEmpresa(payload) {
  const res = await fetch("/api/empresas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar la empresa." };
  return { empresa: data.empresa };
}

export async function actualizarEmpresa(id, payload) {
  const res = await fetch(`/api/empresas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al actualizar la empresa." };
  return { empresa: data.empresa };
}

export async function eliminarEmpresa(id) {
  const res = await fetch(`/api/empresas/${id}`, { method: "DELETE" });
  return res.ok;
}
