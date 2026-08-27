import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarCliente } from "@/lib/clienteValidation";

async function clienteDelUsuario(id, usuarioId) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente || cliente.usuarioId !== usuarioId) return null;
  return cliente;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const cliente = await clienteDelUsuario(id, sesion.id);
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  return NextResponse.json({ cliente });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await clienteDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

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

  let cliente;
  try {
    cliente = await prisma.cliente.update({ where: { id }, data });
  } catch (e) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "Ya existe otro cliente con ese número de documento." },
        { status: 409 }
      );
    throw e;
  }
  return NextResponse.json({ cliente });
}

export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await clienteDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

  // UN CLIENTE CON FACTURAS NO SE BORRA: SE INACTIVA. Es la misma regla que ya rigen `Empleado`
  // (art. 28 Ley 962/2005) y `Tercero`, y aquí tiene además una consecuencia fiscal propia:
  // `Factura.clienteId` no tiene llave foránea, así que borrarlo dejaba el id apuntando a nada
  // y esas facturas DESAPARECÍAN en silencio de los extractos de exógena —del 1007, del 1006 y
  // del 1003—, dejando los ingresos y el IVA generado por debajo de lo declarado.
  const facturas = await prisma.factura.count({ where: { clienteId: id } });
  const notas = await prisma.nota.count({ where: { factura: { clienteId: id } } });
  if (facturas + notas > 0) {
    await prisma.cliente.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({
      ok: true,
      desactivado: true,
      mensaje: `Tiene ${facturas} factura(s) asociadas, así que se desactivó en vez de borrarse: los documentos fiscales necesitan su tercero para poder reportarse.`,
    });
  }

  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
