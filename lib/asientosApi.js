// Cliente del libro diario + búsqueda PUC.
//
// SOLO LECTURA. `crearAsiento`, `actualizarAsiento` y `anularAsiento` se retiraron con el
// asiento manual: un asiento es la consecuencia de un documento, y se corrige reversando ese
// documento. Ver `app/api/asientos/route.js`.

export async function listarAsientos() {
  const res = await fetch("/api/asientos", { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).asientos || [];
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
