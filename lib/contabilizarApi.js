// Cliente de la contabilización de documentos pendientes.

/** Documentos emitidos que todavía no están en el libro diario. */
export async function listarPendientes() {
  const res = await fetch("/api/contabilizar", { cache: "no-store" });
  if (!res.ok) return { total: 0, grupos: [] };
  return res.json();
}

/** Contabiliza lo que el mapa permita. No es todo o nada. */
export async function contabilizarPendientes() {
  const res = await fetch("/api/contabilizar", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "No se pudieron contabilizar los documentos." };
  return data;
}
