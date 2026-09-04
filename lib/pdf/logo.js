// Logo del emisor en los documentos impresos.
//
// DE DÓNDE SALE Y POR QUÉ NO DEL SNAPSHOT. El logo vive en `ConfigFacturacion.logo` como un
// data URL en base64, y se lee EN EL MOMENTO DE IMPRIMIR, no del `emisorSnapshot` congelado en
// el documento. Dos razones:
//
//   1. Es MARCA, no dato fiscal. La razón social, el NIT y la resolución sí se congelan porque
//      el impreso de un documento de hace dos años tiene que decir lo que decía entonces; el
//      logo, en cambio, se espera que sea el actual. Nadie reclama porque una factura vieja
//      salga reimpresa con el logo nuevo.
//   2. Congelarlo costaría carísimo. Un logo de 50 KB en base64 dentro del `emisorSnapshot` de
//      CADA factura son decenas de megas de imágenes repetidas en la tabla de documentos
//      fiscales, que es justo la que más crece.
//
// UN LOGO ROTO NUNCA PUEDE ROMPER EL DOCUMENTO. Si el base64 está corrupto, es de un formato
// que jsPDF no entiende o tiene dimensiones absurdas, se dibuja sin logo y ya. Una factura sin
// logo es un inconveniente estético; una factura que no se puede imprimir es un problema.

/** Formatos que jsPDF acepta en `addImage`. El resto se ignora en silencio. */
const FORMATOS = { png: "PNG", jpg: "JPEG", jpeg: "JPEG", webp: "WEBP" };

/**
 * Dibuja el logo dentro de una caja, manteniendo la proporción.
 *
 * @param doc      instancia de jsPDF
 * @param logo     data URL en base64 (`data:image/png;base64,...`)
 * @param caja     { x, y, maxAncho, maxAlto }
 * @returns {number} el ancho que ocupó, 0 si no se dibujó nada — para que el llamador sepa
 *          cuánto correr el texto que va al lado.
 */
export function dibujarLogo(doc, logo, { x, y, maxAncho, maxAlto }) {
  if (!logo || typeof logo !== "string" || !logo.startsWith("data:image/")) return 0;

  try {
    const tipo = logo.slice("data:image/".length, logo.indexOf(";")).toLowerCase();
    const formato = FORMATOS[tipo];
    if (!formato) return 0;

    // `getImageProperties` da las dimensiones reales para no deformarlo: un logo apaisado
    // estirado a un cuadrado se ve peor que no ponerlo.
    const props = doc.getImageProperties(logo);
    if (!props?.width || !props?.height) return 0;

    const escala = Math.min(maxAncho / props.width, maxAlto / props.height);
    const ancho = props.width * escala;
    const alto = props.height * escala;
    // Centrado verticalmente en la caja, que es donde queda bien junto a la razón social.
    doc.addImage(logo, formato, x, y + (maxAlto - alto) / 2, ancho, alto);
    return ancho;
  } catch {
    // Ver la nota de arriba: el documento sale sin logo, pero sale.
    return 0;
  }
}
