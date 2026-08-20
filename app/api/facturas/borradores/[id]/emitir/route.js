import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { hoyBogota } from "@/lib/fechas";
import { emitirFactura, errorDeEmision } from "@/lib/emitirFactura";
import { entradaDesdeBorrador, pendientesParaEmitir } from "@/lib/borradorFacturaValidation";

// POST /api/facturas/borradores/:id/emitir → convierte el borrador en factura.
//
// Aquí es donde el borrador deja de ser trabajo en curso y se gasta un consecutivo de la
// resolución DIAN, así que es el punto más delicado del módulo. Tres cosas lo protegen:
//
//   1. EXIGE `revisado`. Es la compuerta que pediste: emitir no puede ser el siguiente clic
//      después de escribir. (Sin multiusuario esto es autocontrol, no segregación de funciones
//      — quien revisa y quien emite son la misma cuenta.)
//   2. COMPRUEBA QUE LAS CIFRAS NO HAYAN CAMBIADO desde la revisión. Si cambiaron, no emite:
//      devuelve el borrador a `borrador` y lo dice. Aprobar unas cifras y emitir otras en
//      silencio sería peor que no aprobar nada.
//   3. MARCA EL BORRADOR DENTRO DE LA MISMA TRANSACCIÓN que crea la factura. Si quedara fuera,
//      un fallo entre las dos operaciones dejaría un consecutivo DIAN quemado y un borrador
//      todavía emitible: el siguiente clic emitiría la misma venta dos veces con dos números.
export async function POST(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const borrador = await prisma.borradorFactura.findUnique({
    where: { id },
    include: { factura: { select: { numeroCompleto: true } } },
  });
  if (!borrador || borrador.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Borrador no encontrado." }, { status: 404 });

  if (borrador.estado === "emitido")
    return NextResponse.json(
      {
        error: `Este borrador ya se emitió como la factura ${borrador.factura?.numeroCompleto}.`,
      },
      { status: 409 }
    );

  if (borrador.estado !== "revisado")
    return NextResponse.json(
      { error: "Marca el borrador como revisado antes de emitirlo." },
      { status: 409 }
    );

  const pendientes = pendientesParaEmitir(borrador);
  if (pendientes.length)
    return NextResponse.json({ error: pendientes[0], errores: pendientes }, { status: 400 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* body opcional */
  }

  // LA FECHA ES LA DE HOY, no la del borrador. Un borrador preparado en enero y emitido en
  // febrero no puede salir fechado en enero: caería fuera de la vigencia de la resolución y
  // metería un documento en un periodo que puede estar ya declarado. Si el usuario quiere otra
  // fecha, la escribe en la pantalla de emisión y pasa por los mismos guardas de vigencia.
  const fecha = (body.fecha || "").toString().trim() || hoyBogota();

  const entrada = entradaDesdeBorrador(borrador, { fecha });

  try {
    const { factura, contabilizacion } = await emitirFactura({
      usuarioId: sesion.id,
      entrada,
      alEmitir: async (tx, creada) => {
        // Se comprueba que las cifras sigan siendo las revisadas, con la factura ya calculada
        // y DENTRO de la transacción: si no coinciden, se lanza y todo se deshace —incluido el
        // consecutivo, que vuelve atrás con el rollback.
        const revisado = Number(borrador.totalRevisado);
        if (Number.isFinite(revisado) && Math.abs(Number(creada.totalACobrar) - revisado) > 0.5) {
          const e = new Error("DESFASE");
          e.code = "DESFASE";
          e.revisado = revisado;
          e.actual = Number(creada.totalACobrar);
          throw e;
        }

        // `updateMany` con el estado en el WHERE, no `update` por id: es un compare-and-set.
        // Si otra petición emitió este mismo borrador mientras tanto, `count` viene en 0 y se
        // aborta en vez de gastar un segundo consecutivo por la misma venta.
        const r = await tx.borradorFactura.updateMany({
          where: { id, estado: "revisado" },
          data: { estado: "emitido", facturaId: creada.id, emitidoEn: hoyBogota() },
        });
        if (r.count !== 1) {
          const e = new Error("YA_EMITIDO");
          e.code = "YA_EMITIDO";
          throw e;
        }
      },
    });

    return NextResponse.json({ factura, contabilizacion }, { status: 201 });
  } catch (e) {
    if (e.code === "DESFASE") {
      // El borrador vuelve a `borrador`: lo que se había aprobado ya no es lo que saldría.
      await prisma.borradorFactura.update({
        where: { id },
        data: { estado: "borrador", totalRevisado: null, revisadoEn: null, revisadoPorId: null },
      });
      return NextResponse.json(
        {
          error: `Las cifras cambiaron desde la revisión (se revisó por ${e.revisado.toLocaleString("es-CO")} y ahora daría ${e.actual.toLocaleString("es-CO")}). No se emitió nada. Revisa el borrador de nuevo.`,
        },
        { status: 409 }
      );
    }
    if (e.code === "YA_EMITIDO")
      return NextResponse.json(
        { error: "El borrador ya fue emitido. Recarga la pantalla." },
        { status: 409 }
      );

    const fallo = errorDeEmision(e);
    if (fallo) {
      const { status, ...cuerpo } = fallo;
      return NextResponse.json(cuerpo, { status });
    }
    throw e;
  }
}
