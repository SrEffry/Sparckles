import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarAsiento, validarCuentasPUC } from "@/lib/asientoValidation";
import { siguienteConsecutivo, numeroFinal } from "@/lib/consecutivos";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const asientos = await prisma.asiento.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ asientos });
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

  const { data, movimientos, errors } = normalizarAsiento(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  // Las cuentas deben existir en el catálogo y ser imputables; el nombre lo fija el catálogo.
  const puc = await validarCuentasPUC(prisma, data.sector, movimientos);
  if (puc.errors.length)
    return NextResponse.json({ error: puc.errors[0], errores: puc.errors }, { status: 400 });

  try {
    const anio = Number((data.fecha || "").slice(0, 4)) || new Date().getFullYear();

    const asiento = await prisma.$transaction(async (tx) => {
      // Contador propio, no `count(*)`. Contar incluía los asientos creados por comprobantes
      // (que se numeran CI-/CE-), así que la serie AS- saltaba números: con 2 asientos
      // manuales y 2 comprobantes, el siguiente manual salía AS-0005. La numeración
      // consecutiva del libro diario es exigencia del art. 123 del D. 2649.
      const consecutivo = await siguienteConsecutivo(tx, {
        usuarioId: sesion.id,
        tipo: "asiento",
        anio,
        semilla: async () => {
          const previos = await tx.asiento.findMany({
            where: { usuarioId: sesion.id, numero: { startsWith: "AS-" } },
            select: { numero: true },
          });
          return previos.reduce((max, x) => Math.max(max, numeroFinal(x.numero)), 0);
        },
      });
      const numero = `AS-${anio}-${String(consecutivo).padStart(4, "0")}`;
      return tx.asiento.create({
        data: {
          ...data,
          numero,
          usuarioId: sesion.id,
          movimientos: { create: puc.movimientos },
        },
        include: { movimientos: true },
      });
    });
    return NextResponse.json({ asiento }, { status: 201 });
  } catch (e) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Conflicto de numeración, intente de nuevo." }, { status: 409 });
    throw e;
  }
}
