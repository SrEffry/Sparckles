// Cliente de la API de facturas.

const VACIO = {
  facturas: [],
  paginacion: { page: 1, size: 50, total: 0, paginas: 1 },
  filtros: {},
  avisos: [],
  agregados: null,
};

/**
 * Historial filtrado. El filtrado y los totales los hace el SERVIDOR: los agregados deben
 * salir del mismo `where` que la tabla y sumarse con Decimal, no con Number() en el cliente.
 * Devuelve también `filtros` (normalizados) y `avisos` para mostrarlos junto a las cifras.
 */
export async function listarFacturas(filtros = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const res = await fetch(`/api/facturas?${qs}`, { cache: "no-store" });
  if (!res.ok) return VACIO;
  const data = await res.json();
  return { ...VACIO, ...data };
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

export async function anularFactura(id, motivo = "") {
  const res = await fetch(`/api/facturas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "anular", motivo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudo anular." };
  return { factura: data.factura };
}
