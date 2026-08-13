import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import {
  registrarRetencionesDeCompra,
  registrarRetencionesDeSoporte,
  registrarRetencionesDeComprobante,
  borrarRetencionesDe,
} from "@/lib/retencionesDeDocumentos";

// POST /api/retenciones/backfill
//
// Vuelca a la tabla unificada las retenciones de los documentos que ya existían antes de que
// existiera. Sin esto, el certificado solo vería lo registrado a partir de hoy y subestimaría
// lo retenido — que es justo el error que el certificado no puede cometer.
//
// Es idempotente: `registrarRetenciones` borra las filas del documento antes de reescribirlas,
// así que correrlo dos veces no duplica nada.
//
// DOCUMENTOS SIN EFECTO. Los soportes anulados y los comprobantes reversados NO practicaron
// retención: se limpian en vez de recargarse. Antes el backfill los recorría todos y volvía a
// meter en el certificado retenciones de documentos que no existen para la declaración.
export async function POST() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  const causadas = mapa?.retencionesEnCausacion !== false;

  const resultado = { compras: 0, soportes: 0, comprobantes: 0, lineas: 0, limpiados: 0 };

  await prisma.$transaction(
    async (tx) => {
      for (const compra of await tx.compra.findMany({ where: { usuarioId: sesion.id } })) {
        const n = await registrarRetencionesDeCompra(tx, sesion.id, compra, causadas);
        if (n) resultado.compras++;
        resultado.lineas += n;
      }

      for (const soporte of await tx.documentoSoporte.findMany({ where: { usuarioId: sesion.id } })) {
        if (soporte.estado === "Anulado") {
          resultado.limpiados += await borrarRetencionesDe(tx, { documentoSoporteId: soporte.id });
          continue;
        }
        const n = await registrarRetencionesDeSoporte(tx, sesion.id, soporte, causadas);
        if (n) resultado.soportes++;
        resultado.lineas += n;
      }

      // Un borrador todavía no practicó nada; un reversado ya dejó de practicar.
      const comprobantes = await tx.comprobanteTesoreria.findMany({
        where: { usuarioId: sesion.id, tipo: "egreso", estado: { in: ["emitido", "reversado", "anulado"] } },
        include: { retenciones: true },
      });
      for (const c of comprobantes) {
        if (c.estado !== "emitido") {
          resultado.limpiados += await borrarRetencionesDe(tx, { comprobanteId: c.id });
          continue;
        }
        const n = await registrarRetencionesDeComprobante(tx, sesion.id, c, causadas);
        if (n) resultado.comprobantes++;
        resultado.lineas += n;
      }
    },
    { timeout: 60000 }
  );

  return NextResponse.json({ ok: true, ...resultado, politicaCausacion: causadas });
}
