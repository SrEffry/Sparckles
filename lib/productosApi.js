// Cliente de la API de productos.

export async function listarProductos() {
  const res = await fetch("/api/productos", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.productos || [];
}

export async function crearProducto(payload) {
  const res = await fetch("/api/productos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar el producto." };
  return { producto: data.producto };
}

export async function actualizarProducto(id, payload) {
  const res = await fetch(`/api/productos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al actualizar el producto." };
  return { producto: data.producto };
}

export async function eliminarProducto(id) {
  const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
  return res.ok;
}
