// Validación del mapa de cuentas contra el catálogo PUC.
import { prisma } from "@/lib/prisma";
import { CAMPOS_MAPA, CAMPOS_MINIMOS } from "@/lib/data/mapaCuentasDefecto";

const T = (v) => (v ?? "").toString().trim();

/** Todas las claves de cuenta del mapa, aplanadas. */
export const CLAVES_CUENTA = CAMPOS_MAPA.flatMap((g) => g.campos.map((c) => c.clave));

/**
 * Normaliza y valida el mapa. Cada cuenta debe existir en el sector elegido y ser
 * IMPUTABLE: cargar contra una cuenta de agrupación descuadra los auxiliares, y un código
 * inexistente produciría comprobantes que apuntan a la nada.
 */
export async function validarMapaCuentas(body) {
  const errors = [];
  const sector = body.sector === "esal" ? "esal" : "comercial";

  const data = { sector, retencionesEnCausacion: body.retencionesEnCausacion !== false };
  for (const clave of CLAVES_CUENTA) data[clave] = T(body[clave]) || null;

  const codigos = [...new Set(CLAVES_CUENTA.map((k) => data[k]).filter(Boolean))];
  if (codigos.length) {
    const cuentas = await prisma.cuentaPUC.findMany({
      where: { sector, codigo: { in: codigos } },
      select: { codigo: true, nombre: true, imputable: true },
    });
    const porCodigo = new Map(cuentas.map((c) => [c.codigo, c]));

    for (const clave of CLAVES_CUENTA) {
      const codigo = data[clave];
      if (!codigo) continue;
      const etiqueta = etiquetaDe(clave);
      const cuenta = porCodigo.get(codigo);
      if (!cuenta) {
        errors.push(`${etiqueta}: la cuenta ${codigo} no existe en el catálogo ${sector}.`);
      } else if (!cuenta.imputable) {
        errors.push(
          `${etiqueta}: la cuenta ${codigo} (${cuenta.nombre}) es de agrupación y no admite movimientos.`
        );
      }
    }
  }

  return { data, errors };
}

/** ¿Está el mapa lo bastante completo para emitir comprobantes? */
export function faltantesParaComprobantes(mapa) {
  if (!mapa) return CAMPOS_MINIMOS.map(etiquetaDe);
  return CAMPOS_MINIMOS.filter((k) => !mapa[k]).map(etiquetaDe);
}

function etiquetaDe(clave) {
  for (const g of CAMPOS_MAPA) {
    const c = g.campos.find((x) => x.clave === clave);
    if (c) return c.etiqueta;
  }
  return clave;
}
