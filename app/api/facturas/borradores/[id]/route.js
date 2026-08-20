import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { hoyBogota } from "@/lib/fechas";
import { liquidarFactura, errorDeEmision } from "@/lib/emitirFactura";
import {
  validarBorradorFactura,
  pendientesParaEmitir,
  entradaDesdeBorrador,
} from "@/lib/borradorFacturaValidation";

async function cargar(id, usuarioId) {
  const borrador = await prisma.borradorFactura.findUnique({
    where: { id },
    include: { factura: { select: { id: true, numeroCompleto: true, fecha: true } } },
  });
  if (!borrador || borrador.usuarioId !== usuarioId) return null;
  return borrador;
}

/**
 * Liquida el borrador AHORA MISMO, con las tarifas y la configuración de este instante.
 *
 * Nunca lanza: si el borrador todavía no se puede liquidar —falta el cliente, un producto se
 * eliminó, la resolución venció— devuelve el motivo como aviso. Un borrador tiene que poder
 * ABRIRSE aunque no se pueda emitir; si no, el usuario no puede ni entrar a arreglarlo.
 */
async function previaDe(usuarioId, borrador) {
  const pendientes = pendientesParaEmitir(borrador);
  if (pendientes.length) return { previa: null, avisos: pendientes };

  try {
    const { calc } = await liquidarFactura({
      usuarioId,
      entrada: entradaDesdeBorrador(borrador),
    });
    return { previa: calc, avisos: [] };
  } catch (e) {
    const fallo = errorDeEmision(e);
    if (fallo) return { previa: null, avisos: fallo.errores || [fallo.error] };
    throw e;
  }
}

// GET /api/facturas/borradores/:id → borrador + vista previa RECALCULADA + avisos.
//
// La previa se recalcula en cada lectura y no se lee de la tabla. Entre que se guardó el
// borrador y hoy pueden haber cambiado el precio o los impuestos del producto, el cliente pudo
// pasar a autorretenedor (y morir la ReteFuente, art. 368-2 E.T.) o el emisor pudo dejar de ser
// responsable de IVA. Mostrar las cifras guardadas sería enseñar una factura que no es la que
// se va a emitir.
export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const borrador = await cargar(id, sesion.id);
  if (!borrador) return NextResponse.json({ error: "Borrador no encontrado." }, { status: 404 });

  const { previa, avisos } = await previaDe(sesion.id, borrador);

  // Si ya se había revisado y la cifra cambió, se avisa aquí y no solo al emitir: el usuario
  // debe enterarse al abrirlo, no cuando ya le dio al botón.
  const desfase =
    borrador.estado === "revisado" &&
    previa &&
    Math.abs(Number(previa.totalACobrar) - Number(borrador.totalRevisado)) > 0.5;

  return NextResponse.json({
    borrador: { ...borrador, pendientes: pendientesParaEmitir(borrador) },
    previa,
    avisos,
    desfase: desfase
      ? {
          revisado: Number(borrador.totalRevisado),
          actual: Number(previa.totalACobrar),
          mensaje:
            "Las cifras cambiaron desde que se revisó este borrador. Revísalo de nuevo antes de emitir.",
        }
      : null,
  });
}

// PUT /api/facturas/borradores/:id → edita.
//
// Editar devuelve el borrador a `borrador`: un visto bueno vale para las cifras que se
// aprobaron, no para las siguientes.
export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const borrador = await cargar(id, sesion.id);
  if (!borrador) return NextResponse.json({ error: "Borrador no encontrado." }, { status: 404 });
  if (borrador.estado === "emitido")
    return NextResponse.json(
      {
        error: `Este borrador ya se emitió como la factura ${borrador.factura?.numeroCompleto}. Para corregirla, emite una nota crédito o débito.`,
      },
      { status: 409 }
    );

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { errors, datos } = validarBorradorFactura(body);
  if (errors.length)
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const actualizado = await prisma.borradorFactura.update({
    where: { id },
    data: { ...datos, estado: "borrador", totalRevisado: null, revisadoEn: null, revisadoPorId: null },
  });

  return NextResponse.json({
    borrador: { ...actualizado, pendientes: pendientesParaEmitir(actualizado) },
  });
}

// PATCH /api/facturas/borradores/:id → { accion: 'revisar' | 'devolver' }
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const borrador = await cargar(id, sesion.id);
  if (!borrador) return NextResponse.json({ error: "Borrador no encontrado." }, { status: 404 });
  if (borrador.estado === "emitido")
    return NextResponse.json({ error: "El borrador ya se emitió." }, { status: 409 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* body opcional */
  }

  if (body.accion === "devolver") {
    const actualizado = await prisma.borradorFactura.update({
      where: { id },
      data: { estado: "borrador", totalRevisado: null, revisadoEn: null, revisadoPorId: null },
    });
    return NextResponse.json({ borrador: actualizado });
  }

  if (body.accion === "revisar") {
    // Dar por bueno un borrador que ni siquiera se puede emitir no significa nada.
    const pendientes = pendientesParaEmitir(borrador);
    if (pendientes.length)
      return NextResponse.json(
        { error: pendientes[0], errores: pendientes },
        { status: 400 }
      );

    // Se liquida y se CONGELA el total revisado. Ese número es lo que le da sentido al paso:
    // "revisado" significa revisado contra estas cifras, y al emitir se comprueba que sigan
    // siendo las mismas.
    let calc;
    try {
      ({ calc } = await liquidarFactura({
        usuarioId: sesion.id,
        entrada: entradaDesdeBorrador(borrador),
      }));
    } catch (e) {
      const fallo = errorDeEmision(e);
      if (fallo) {
        const { status, ...cuerpo } = fallo;
        return NextResponse.json(cuerpo, { status });
      }
      throw e;
    }

    const actualizado = await prisma.borradorFactura.update({
      where: { id },
      data: {
        estado: "revisado",
        totalRevisado: calc.totalACobrar,
        revisadoEn: hoyBogota(),
        revisadoPorId: sesion.id,
      },
    });
    return NextResponse.json({ borrador: actualizado, previa: calc });
  }

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}

// DELETE /api/facturas/borradores/:id → lo borra de verdad.
//
// Un borrador NO es un documento fiscal: no tiene número de la resolución, no está en el libro
// diario y no se declaró. El art. 617 del E.T. protege la numeración autorizada, y un borrador
// nunca la tocó. Por eso se borra y no se anula, al revés que una factura.
//
// Lo único que no se borra es el ya emitido: ahí dejó de ser trabajo en curso y pasó a ser el
// rastro de origen de una factura que sí existe.
export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const borrador = await cargar(id, sesion.id);
  if (!borrador) return NextResponse.json({ error: "Borrador no encontrado." }, { status: 404 });
  if (borrador.estado === "emitido")
    return NextResponse.json(
      {
        error: `No se puede borrar: es el origen de la factura ${borrador.factura?.numeroCompleto}.`,
      },
      { status: 409 }
    );

  await prisma.borradorFactura.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
