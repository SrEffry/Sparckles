// Cliente de la API de empleados.

export async function listarEmpleados() {
  const res = await fetch("/api/empleados", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.empleados || [];
}

export async function crearEmpleado(payload) {
  const res = await fetch("/api/empleados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar el empleado." };
  return { empleado: data.empleado };
}

export async function actualizarEmpleado(id, payload) {
  const res = await fetch(`/api/empleados/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al actualizar el empleado." };
  return { empleado: data.empleado };
}

export async function eliminarEmpleado(id) {
  const res = await fetch(`/api/empleados/${id}`, { method: "DELETE" });
  return res.ok;
}
