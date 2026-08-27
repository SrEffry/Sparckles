// Cliente de la API de Reportes.
//
// Hoy solo el diagnóstico de preparación para exógena. Cuando lleguen los formatos, sus
// descargas se agregan aquí y los componentes siguen sin tocar `fetch` directamente.

export async function obtenerPreparacionExogena(anio) {
  const qs = anio ? `?anio=${anio}` : "";
  const res = await fetch(`/api/reportes/exogena/preparacion${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

/** Vista previa de un extracto: cuántas filas, qué falta y una muestra. */
export async function previaFormatoExogena(numero, anio) {
  const res = await fetch(`/api/reportes/exogena/formato/${numero}?anio=${anio}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Descarga el extracto como .xlsx. Se hace por `blob` y no con un enlace directo porque la
 * descarga va autenticada por cookie y hay que respetar la respuesta de error si la hubiera.
 */
export async function descargarFormatoExogena(numero, anio) {
  const res = await fetch(`/api/reportes/exogena/formato/${numero}?anio=${anio}&formato=xlsx`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    return { error: d.error || "No se pudo generar el extracto." };
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BORRADOR-formato-${numero}-${anio}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { ok: true };
}
