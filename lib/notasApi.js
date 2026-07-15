// Cliente de la API de notas.

export async function listarNotas() {
  const res = await fetch("/api/notas", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.notas || [];
}

export async function obtenerNota(id) {
  const res = await fetch(`/api/notas/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.nota || null;
}

export async function crearNota(payload) {
  const res = await fetch("/api/notas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al crear la nota." };
  return { nota: data.nota };
}

export async function eliminarNota(id) {
  const res = await fetch(`/api/notas/${id}`, { method: "DELETE" });
  return res.ok;
}
