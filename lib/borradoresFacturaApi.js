// Cliente de la API de borradores de factura.
//
// Los componentes hablan SOLO con este archivo, nunca con `fetch` directo. Ojo con una cosa al
// usarlo: `obtenerBorrador` devuelve `previa`, que es la liquidación recalculada por el
// servidor en ese instante. Esa es la cifra que se muestra; nunca calcular totales en el
// cliente para pintarlos, porque el servidor es el que manda y la vista previa tiene que ser
// exactamente lo que se va a emitir.

export async function listarBorradores(estado) {
  const qs = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  const res = await fetch(`/api/facturas/borradores${qs}`, { cache: "no-store" });
  if (!res.ok) return { borradores: [] };
  return res.json();
}

/** @returns {{borrador, previa, avisos, desfase}|null} */
export async function obtenerBorrador(id) {
  const res = await fetch(`/api/facturas/borradores/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function crearBorrador(payload) {
  const res = await fetch("/api/facturas/borradores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo guardar el borrador." };
  return { borrador: data.borrador };
}

export async function guardarBorrador(id, payload) {
  const res = await fetch(`/api/facturas/borradores/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo guardar el borrador." };
  return { borrador: data.borrador };
}

/** Marca el borrador como revisado y congela las cifras aprobadas. */
export async function revisarBorrador(id) {
  return patch(id, "revisar", "No se pudo marcar como revisado.");
}

/** Devuelve un borrador revisado al estado editable. */
export async function devolverBorrador(id) {
  return patch(id, "devolver", "No se pudo devolver el borrador.");
}

async function patch(id, accion, mensaje) {
  const res = await fetch(`/api/facturas/borradores/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || mensaje };
  return { borrador: data.borrador, previa: data.previa };
}

export async function eliminarBorrador(id) {
  const res = await fetch(`/api/facturas/borradores/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo eliminar el borrador." };
  return { ok: true };
}

/**
 * Emite el borrador. `fecha` es opcional: si no se manda, la factura sale con la fecha de HOY
 * —no con la del borrador—, porque la fecha fiscal es la de la emisión.
 */
export async function emitirBorrador(id, fecha) {
  const res = await fetch(`/api/facturas/borradores/${id}/emitir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fecha ? { fecha } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo emitir la factura." };
  return { factura: data.factura, contabilizacion: data.contabilizacion };
}
