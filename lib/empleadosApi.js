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
  return { empleado: data.empleado, avisos: data.avisos || [] };
}

export async function actualizarEmpleado(id, payload) {
  const res = await fetch(`/api/empleados/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al actualizar el empleado." };
  return { empleado: data.empleado, avisos: data.avisos || [] };
}

export async function eliminarEmpleado(id) {
  const res = await fetch(`/api/empleados/${id}`, { method: "DELETE" });
  if (res.ok) return { ok: true };
  // Un empleado con nóminas no se borra, y el motivo importa: "no se pudo eliminar" deja al
  // usuario intentándolo otra vez sin saber que la salida es marcarlo inactivo.
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error || "No se pudo eliminar el empleado." };
}
