// Cliente de la API de comprobantes de tesorería.

export async function listarComprobantes(filtros = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) if (v) qs.set(k, String(v));
  const res = await fetch(`/api/comprobantes?${qs}`, { cache: "no-store" });
  if (!res.ok) return { comprobantes: [], totales: null };
  return res.json();
}

export async function obtenerComprobante(id) {
  const res = await fetch(`/api/comprobantes/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

/** Documentos con saldo por cobrar o por pagar. */
export async function listarPendientes({ tipo, terceroDoc, q } = {}) {
  const qs = new URLSearchParams({ tipo: tipo || "ingreso" });
  if (terceroDoc) qs.set("terceroDoc", terceroDoc);
  if (q) qs.set("q", q);
  const res = await fetch(`/api/comprobantes/pendientes?${qs}`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).documentos || [];
}

export async function crearComprobante(payload) {
  const res = await fetch("/api/comprobantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo crear el comprobante.", errores: data.errores };
  return data;
}

/** Asiento propuesto. No contabiliza: es para revisarlo antes de confirmar. */
export async function obtenerPropuesta(id) {
  const res = await fetch(`/api/comprobantes/${id}/propuesta`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo calcular el asiento." };
  return data;
}

/** Contabiliza. `movimientos` opcional: si se pasan, se usan en vez de la propuesta. */
export async function emitirComprobante(id, movimientos) {
  return accion(id, { accion: "emitir", ...(movimientos ? { movimientos } : {}) });
}

export async function anularComprobante(id, motivo) {
  return accion(id, { accion: "anular", motivo });
}

export async function reversarComprobante(id, motivo) {
  return accion(id, { accion: "reversar", motivo });
}

async function accion(id, body) {
  const res = await fetch(`/api/comprobantes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo completar la acción.", sugerencia: data.sugerencia };
  return data;
}
