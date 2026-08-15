import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarEmpleado } from "@/lib/empleadoValidation";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const empleados = await prisma.empleado.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ empleados });
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

  const { data, errors, avisos } = normalizarEmpleado(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const empleado = await prisma.empleado.create({ data: { ...data, usuarioId: sesion.id } });
  // Los avisos NO bloquean: un salario bajo el mínimo puede ser jornada parcial y una prestación
  // de servicios se puede querer registrar aunque no se liquide por nómina. Se guardan y se dice.
  return NextResponse.json({ empleado, avisos }, { status: 201 });
}
