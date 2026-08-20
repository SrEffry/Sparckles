// Cliente de la API de documentos soporte.

export async function listarSoportes() {
  const res = await fetch("/api/soportes", { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).soportes || [];
}

export async function crearSoporte(payload) {
  const res = await fetch("/api/soportes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al generar el documento." };
  return { soporte: data.soporte };
}

/**
 * Detalle completo: el documento con sus retenciones, el asiento y el egreso que lo originó.
 * La lista no trae nada de eso, y sin ello el impreso saldría sin imputación contable, sin el
 * concepto de la retención y sin decir que legaliza un pago.
 */
export async function obtenerSoporte(id) {
  const res = await fetch(`/api/soportes/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function anularSoporte(id) {
  const res = await fetch(`/api/soportes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "anular" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo anular." };
  return { soporte: data.soporte };
}
