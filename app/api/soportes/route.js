import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarSoporte } from "@/lib/soporteValidation";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const soportes = await prisma.documentoSoporte.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ soportes });
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

  const { data, errors } = normalizarSoporte(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  try {
    const soporte = await prisma.$transaction(async (tx) => {
      const count = await tx.documentoSoporte.count({ where: { usuarioId: sesion.id } });
      const numero = `DS-${String(count + 1).padStart(4, "0")}`;
      return tx.documentoSoporte.create({
        data: { ...data, numero, usuarioId: sesion.id },
      });
    });
    return NextResponse.json({ soporte }, { status: 201 });
  } catch (e) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Conflicto de numeración, intente de nuevo." }, { status: 409 });
    throw e;
  }
}
