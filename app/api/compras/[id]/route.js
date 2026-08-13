import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarCompra } from "@/lib/compraValidation";
import { registrarRetencionesDeCompra } from "@/lib/retencionesDeDocumentos";
import { contabilizarYEnlazar, reversarAsientoDe } from "@/lib/asientoAutomatico";
import { hoyBogota } from "@/lib/fechas";

async function compraDelUsuario(id, usuarioId) {
  const c = await prisma.compra.findUnique({ where: { id } });
  if (!c || c.usuarioId !== usuarioId) return null;
  return c;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const compra = await prisma.compra.findUnique({ where: { id }, include: { items: true } });
  if (!compra || compra.usuarioId !== sesion.id)
    return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });
  return NextResponse.json({ compra });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await compraDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, items, errors } = normalizarCompra(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  const causadas = mapa?.retencionesEnCausacion !== false;

  const compra = await prisma.$transaction(async (tx) => {
    const actualizada = await tx.compra.update({
      where: { id },
      data: { ...data, items: { deleteMany: {}, create: items } },
      include: { items: true },
    });
    // Se reescriben: editar una compra puede cambiar sus retenciones, y el certificado debe
    // reflejar la versión vigente, no la anterior.
    await registrarRetencionesDeCompra(tx, sesion.id, actualizada, causadas);

    // El libro no se reescribe: se reversa el asiento anterior y se registra el nuevo. Así
    // quedan las tres líneas (original, contraasiento y versión vigente) y el art. 125 se
    // cumple — corregir el libro borrando sería justo lo que prohíbe.
    //
    // LAS TRES VAN EN LA FECHA DEL DOCUMENTO, no una en cada lado. Con el contraasiento
    // fechado hoy y la versión vigente en la fecha original, el periodo original quedaba con
    // el gasto y el IVA descontable DUPLICADOS (el original más el nuevo, sin la reversión
    // que los resta), y con eso se liquidaba mal la declaración de ese bimestre.
    const fechaAsiento = existente.fecha;
    await reversarAsientoDe(tx, {
      usuarioId: sesion.id,
      asientoId: existente.asientoId,
      fecha: fechaAsiento,
      motivo: "Compra editada",
    });

    // El enlace se suelta EN LA BASE, no solo en el objeto que se pasa: `contabilizarYEnlazar`
    // reserva el documento con un `updateMany` condicionado a `asientoId: null`, y con el
    // valor viejo todavía en la fila esa reserva no encontraba nada y daba la compra por
    // contabilizada — quedaba reversada y sin versión vigente, con efecto neto cero.
    await tx.compra.update({ where: { id }, data: { asientoId: null } });

    const contab = await contabilizarYEnlazar(tx, {
      usuarioId: sesion.id,
      tipo: "compra",
      documento: { ...actualizada, asientoId: null },
      mapa,
    });

    // Si la nueva versión no se pudo contabilizar (p. ej. la edición activó una retención
    // cuya cuenta está en blanco), la compra NO puede quedar apuntando al asiento ya
    // reversado: con `asientoId` no nulo desaparecería de los pendientes y no volvería a
    // contabilizarse nunca, dejando su efecto en libros en cero y sin avisar.
    if (!contab.asiento) {
      await tx.compra.update({ where: { id }, data: { asientoId: null } });
    }
    return { ...actualizada, asientoId: contab.asiento?.id || null };
  });
  return NextResponse.json({ compra });
}

export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await compraDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // El asiento NO se borra con la compra: se le suma el contraasiento. Borrarlo dejaría un
    // hueco en el libro, y el art. 125 del Decreto 2649 no lo admite.
    await reversarAsientoDe(tx, {
      usuarioId: sesion.id,
      asientoId: existente.asientoId,
      fecha: hoyBogota(),
      motivo: `Compra ${existente.numFactura} eliminada`,
    });
    await tx.compra.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}
