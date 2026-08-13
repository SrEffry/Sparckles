// Cliente del libro diario + búsqueda PUC.
//
// SOLO LECTURA. `crearAsiento`, `actualizarAsiento` y `anularAsiento` se retiraron con el
// asiento manual: un asiento es la consecuencia de un documento, y se corrige reversando ese
// documento. Ver `app/api/asientos/route.js`.

/**
 * Página del libro, en orden cronológico, con los totales del FILTRO COMPLETO.
 * @param filtros { desde, hasta, origen, q, pagina }
 */
export async function listarAsientos(filtros = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros)) if (v) qs.set(k, String(v));
  const res = await fetch(`/api/asientos?${qs}`, { cache: "no-store" });
  if (!res.ok) return { asientos: [], paginacion: null, totales: { debitos: 0, creditos: 0 } };
  return res.json();
}

export async function obtenerAsiento(id) {
  const res = await fetch(`/api/asientos/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()).asiento || null;
}

// Búsqueda de cuentas PUC (autocompletar)
export async function buscarCuentas(sector, q) {
  const params = new URLSearchParams({ sector, q: q || "", imputables: "1" });
  const res = await fetch(`/api/puc?${params}`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).cuentas || [];
}
