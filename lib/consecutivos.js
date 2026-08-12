// Consecutivos de documentos, en un solo sitio.
//
// El art. 123 del Decreto 2649 exige numeración consecutiva. `count(*)` NO sirve: si un
// documento se borra o se filtra, el conteo repite un número que ya existe y choca contra el
// `@@unique`, dejando al usuario con un 409 permanente y sin salida. Por eso hay una tabla
// `ConsecutivoDocumento` con el último número entregado por (usuario, tipo, año).
//
// SIEMBRA. La primera vez que se pide un consecutivo de una serie, el contador no existe.
// Arrancar en 1 chocaría con los documentos que ya se numeraron con el método viejo, así que
// se inicializa a partir del mayor número existente. Sin esto, activar el contador rompía la
// creación de notas en cualquier instalación con datos previos.

/** Extrae el número final de una cadena tipo "NC-0007" o "DS-2026-0012". */
export function numeroFinal(cadena) {
  const m = String(cadena || "").match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
}

/**
 * Devuelve el siguiente consecutivo de la serie, incrementándolo de forma atómica dentro de
 * la transacción que se le pase.
 *
 * @param tx        cliente de Prisma dentro de una transacción
 * @param usuarioId
 * @param tipo      identifica la serie: 'ingreso' | 'egreso' | 'asiento' | 'nota_credito' | …
 * @param anio      las series se reinician cada año
 * @param semilla   función opcional que devuelve el mayor número YA usado en esta serie.
 *                  Solo se consulta si el contador aún no existe.
 */
export async function siguienteConsecutivo(tx, { usuarioId, tipo, anio, semilla }) {
  const existente = await tx.consecutivoDocumento.findUnique({
    where: { usuarioId_tipo_anio: { usuarioId, tipo, anio } },
  });

  if (existente) {
    const actualizado = await tx.consecutivoDocumento.update({
      where: { usuarioId_tipo_anio: { usuarioId, tipo, anio } },
      data: { actual: { increment: 1 } },
    });
    return actualizado.actual;
  }

  const desde = semilla ? await semilla() : 0;
  const creado = await tx.consecutivoDocumento.create({
    data: { usuarioId, tipo, anio, actual: desde + 1 },
  });
  return creado.actual;
}
