import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarCliente } from "@/lib/clienteValidation";

// GET /api/clientes → lista los clientes del usuario en sesión
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const clientes = await prisma.cliente.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ clientes });
}

// POST /api/clientes → crea un cliente
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors } = normalizarCliente(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  try {
    const cliente = await prisma.cliente.create({
      data: { ...data, usuarioId: sesion.id },
    });
    return NextResponse.json({ cliente }, { status: 201 });
  } catch (e) {
    // El `@@unique` del documento normalizado es la red que impide dos fichas del mismo NIT,
    // que en exógena saldrían como dos terceros distintos con direcciones distintas.
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "Ya existe un cliente con ese número de documento." },
        { status: 409 }
      );
    throw e;
  }
}
