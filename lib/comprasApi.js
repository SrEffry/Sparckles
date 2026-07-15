// Cliente de la API de compras.

export async function listarCompras() {
  const res = await fetch("/api/compras", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.compras || [];
}

export async function obtenerCompra(id) {
  const res = await fetch(`/api/compras/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.compra || null;
}

export async function crearCompra(payload) {
  const res = await fetch("/api/compras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar la compra." };
  return { compra: data.compra };
}

export async function actualizarCompra(id, payload) {
  const res = await fetch(`/api/compras/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al actualizar la compra." };
  return { compra: data.compra };
}

export async function eliminarCompra(id) {
  const res = await fetch(`/api/compras/${id}`, { method: "DELETE" });
  return res.ok;
}
