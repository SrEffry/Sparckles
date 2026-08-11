import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarProducto } from "@/lib/productoValidation";
import { validarImpuestos } from "@/lib/impuestoValidation";

async function productoDelUsuario(id, usuarioId) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: { impuestos: { include: { impuesto: true } } },
  });
  if (!producto || producto.usuarioId !== usuarioId) return null;
  return producto;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const producto = await productoDelUsuario(id, sesion.id);
  if (!producto) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  return NextResponse.json({ producto });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await productoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, impuestoIds, errors } = normalizarProducto(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  const val = await validarImpuestos(sesion.id, impuestoIds);
  if (val.errors.length) {
    return NextResponse.json({ error: val.errors[0] }, { status: 400 });
  }

  try {
    const producto = await prisma.producto.update({
      where: { id },
      data: {
        ...data,
        // Se reemplaza el juego completo: es más simple y no deja enlaces huérfanos.
        impuestos: {
          deleteMany: {},
          create: impuestoIds.map((impuestoId) => ({ impuestoId })),
        },
      },
      include: { impuestos: { include: { impuesto: true } } },
    });
    return NextResponse.json({ producto });
  } catch (e) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un producto con ese código." },
        { status: 409 }
      );
    }
    throw e;
  }
}

export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await productoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });

  await prisma.producto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
