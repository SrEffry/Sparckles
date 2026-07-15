// Cliente de la API de facturas.

export async function listarFacturas() {
  const res = await fetch("/api/facturas", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.facturas || [];
}

export async function obtenerFactura(id) {
  const res = await fetch(`/api/facturas/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.factura || null;
}

export async function emitirFactura(payload) {
  const res = await fetch("/api/facturas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al emitir la factura." };
  return { factura: data.factura };
}

export async function anularFactura(id) {
  const res = await fetch(`/api/facturas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "anular" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo anular." };
  return { factura: data.factura };
}
