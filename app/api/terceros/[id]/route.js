import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { validarTercero } from "@/lib/terceroValidation";
import { pendientesDeTercero } from "@/lib/terceros";

async function cargar(id, usuarioId) {
  const t = await prisma.tercero.findUnique({
    where: { id },
    include: { _count: { select: { compras: true, soportes: true } } },
  });
  return !t || t.usuarioId !== usuarioId ? null : t;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const tercero = await cargar(id, sesion.id);
  if (!tercero) return NextResponse.json({ error: "Tercero no encontrado." }, { status: 404 });

  return NextResponse.json({ tercero: { ...tercero, ...pendientesDeTercero(tercero) } });
}

// PUT /api/terceros/:id → edita la ficha.
export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const tercero = await cargar(id, sesion.id);
  if (!tercero) return NextResponse.json({ error: "Tercero no encontrado." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { errors, datos } = validarTercero(body);
  if (errors.length)
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  // Cambiar el documento cambia la IDENTIDAD del tercero, y con ella la agrupación de todo lo
  // que ya cuelga de él. Se permite —un NIT mal digitado hay que poder corregirlo— pero no
  // puede colisionar con otro tercero: eso sería fusionar dos historias por accidente.
  if (datos.documento !== tercero.documento) {
    const choca = await prisma.tercero.findUnique({
      where: { usuarioId_documento: { usuarioId: sesion.id, documento: datos.documento } },
    });
    if (choca)
      return NextResponse.json(
        {
          error: `Ya existe otro tercero con el documento ${datos.documento} (${choca.nombre}). Para unir los dos hace falta una fusión, que todavía no está implementada.`,
        },
        { status: 409 }
      );
  }

  const actualizado = await prisma.tercero.update({ where: { id }, data: datos });
  return NextResponse.json({
    tercero: { ...actualizado, ...pendientesDeTercero(actualizado) },
  });
}

// DELETE /api/terceros/:id
//
// Solo si no tiene documentos colgando. Un tercero con compras o soportes es la identidad de
// esos documentos: borrarlo dejaría sus `terceroId` en null y volvería a partir la agrupación
// que este registro existe para sostener. Se desactiva en su lugar.
export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const tercero = await cargar(id, sesion.id);
  if (!tercero) return NextResponse.json({ error: "Tercero no encontrado." }, { status: 404 });

  const usos = tercero._count.compras + tercero._count.soportes;
  if (usos > 0) {
    await prisma.tercero.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({
      ok: true,
      desactivado: true,
      mensaje: `Tiene ${usos} documento(s) asociados, así que se desactivó en vez de borrarse.`,
    });
  }

  await prisma.tercero.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
