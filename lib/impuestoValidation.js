// Validación de impuestos contra el catálogo. Vive fuera de los route handlers porque la
// necesitan varios endpoints y porque un archivo de ruta solo debe exportar handlers HTTP.
import { prisma } from "@/lib/prisma";
import { vigenteEn } from "@/lib/data/impuestos";

/**
 * Los impuestos deben existir, estar activos y estar disponibles para este usuario (del
 * sistema o suyos). Sin esta comprobación el cliente podría enlazar el impuesto de otro
 * usuario, o uno inexistente, y la tarifa dejaría de ser un atributo de la norma.
 *
 * Si se pasa `fecha`, se exige además que el impuesto esté vigente en esa fecha: una tarifa
 * derogada no puede usarse en un documento posterior a su derogatoria.
 */
export async function validarImpuestos(usuarioId, impuestoIds, fecha = null) {
  if (!impuestoIds || impuestoIds.length === 0) return { errors: [], impuestos: [] };

  const impuestos = await prisma.impuesto.findMany({
    where: {
      id: { in: impuestoIds },
      activo: true,
      OR: [{ usuarioId: null }, { usuarioId }],
    },
  });

  const errors = [];
  if (impuestos.length !== impuestoIds.length) {
    errors.push("Alguno de los impuestos seleccionados no existe o no está disponible.");
    return { errors, impuestos };
  }

  if (fecha) {
    for (const imp of impuestos) {
      if (!vigenteEn(imp, fecha)) {
        errors.push(
          `El impuesto "${imp.nombre}" no está vigente en la fecha ${fecha}` +
            (imp.vigenteHasta ? ` (rigió hasta ${imp.vigenteHasta})` : "") +
            "."
        );
      }
    }
  }

  return { errors, impuestos };
}
