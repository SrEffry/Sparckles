// Cliente de la API de notas de contabilidad.

export async function listarNotasContabilidad(filtros = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) if (v) qs.set(k, String(v));
  const res = await fetch(`/api/notas-contabilidad?${qs}`, { cache: "no-store" });
  if (!res.ok) return { notas: [], periodos: [], totales: null };
  return res.json();
}

export async function obtenerNotaContabilidad(id) {
  const res = await fetch(`/api/notas-contabilidad/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function crearNotaContabilidad(payload) {
  return enviar("/api/notas-contabilidad", "POST", payload, "No se pudo crear la nota.");
}

export async function guardarNotaContabilidad(id, payload) {
  return enviar(`/api/notas-contabilidad/${id}`, "PUT", payload, "No se pudo guardar la nota.");
}

/** Emite: numera la nota y genera el asiento. A partir de aquí ya no se edita. */
export async function emitirNotaContabilidad(id, autorizadoPor) {
  return enviar(`/api/notas-contabilidad/${id}`, "PATCH", { accion: "emitir", autorizadoPor }, "No se pudo emitir.");
}

export async function reversarNotaContabilidad(id, motivo) {
  return enviar(`/api/notas-contabilidad/${id}`, "PATCH", { accion: "reversar", motivo }, "No se pudo reversar.");
}

export async function descartarNotaContabilidad(id) {
  return enviar(`/api/notas-contabilidad/${id}`, "PATCH", { accion: "descartar" }, "No se pudo descartar.");
}

async function enviar(url, method, body, errorPorDefecto) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || errorPorDefecto, errores: data.errores };
  return data;
}
