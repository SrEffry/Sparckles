import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarProducto } from "@/lib/productoValidation";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const productos = await prisma.producto.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ productos });
}

export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors } = normalizarProducto(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  try {
    const producto = await prisma.producto.create({
      data: { ...data, usuarioId: sesion.id },
    });
    return NextResponse.json({ producto }, { status: 201 });
  } catch (e) {
    // Unicidad de código por usuario (@@unique([usuarioId, codigo]))
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un producto con ese código." },
        { status: 409 }
      );
    }
    throw e;
  }
}
