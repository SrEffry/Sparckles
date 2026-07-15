// Cliente de la API de nóminas.

export async function listarNominas() {
  const res = await fetch("/api/nominas", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.nominas || [];
}

export async function liquidarNomina(payload) {
  const res = await fetch("/api/nominas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al liquidar la nómina." };
  return { nomina: data.nomina };
}

export async function cambiarEstadoNomina(id, estado) {
  const res = await fetch(`/api/nominas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo actualizar." };
  return { nomina: data.nomina };
}
