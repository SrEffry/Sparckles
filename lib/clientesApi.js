// Cliente de la API de clientes.

export async function listarClientes() {
  const res = await fetch("/api/clientes", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.clientes || [];
}

export async function crearCliente(payload) {
  const res = await fetch("/api/clientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar el cliente." };
  return { cliente: data.cliente };
}

export async function actualizarCliente(id, payload) {
  const res = await fetch(`/api/clientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al actualizar el cliente." };
  return { cliente: data.cliente };
}

export async function eliminarCliente(id) {
  const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
  return res.ok;
}
