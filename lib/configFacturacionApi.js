// Cliente de la API de configuración de facturación (1 por usuario).

export async function obtenerConfig() {
  const res = await fetch("/api/config-facturacion", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.config || null;
}

export async function guardarConfig(payload) {
  const res = await fetch("/api/config-facturacion", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Error al guardar la configuración." };
  return { config: data.config };
}

/**
 * Logo del emisor para los documentos impresos, memoizado por sesión de página.
 *
 * Los PDF lo necesitan cada vez que se imprime algo, y pedir la configuración entera en cada
 * clic solo para sacar una imagen es trabajo de más: el logo cambia una vez al año. Se cachea
 * la PROMESA, no el valor, para que dos impresiones simultáneas no disparen dos peticiones.
 *
 * Nunca lanza: si la configuración no se puede leer, se devuelve `null` y el documento sale sin
 * logo. Un logo que falla no puede impedir imprimir una factura.
 */
let promesaLogo = null;
export function obtenerLogoEmisor() {
  if (!promesaLogo) {
    promesaLogo = obtenerConfig()
      .then((c) => c?.logo || null)
      .catch(() => null);
  }
  return promesaLogo;
}

/** Se llama al guardar la configuración, para que el logo nuevo se vea sin recargar. */
export function olvidarLogoEmisor() {
  promesaLogo = null;
}
