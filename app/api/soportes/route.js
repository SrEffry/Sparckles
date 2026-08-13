import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarSoporte } from "@/lib/soporteValidation";
import { hoyBogota } from "@/lib/fechas";
import { siguienteConsecutivo, numeroFinal } from "@/lib/consecutivos";
import { registrarRetencionesDeSoporte } from "@/lib/retencionesDeDocumentos";
import { contabilizarYEnlazar } from "@/lib/asientoAutomatico";

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

  const anio = Number((data.fecha || "").slice(0, 4)) || Number(hoyBogota().slice(0, 4));

  try {
    const soporte = await prisma.$transaction(async (tx) => {
      // Contador propio por año, no `count(*)`: el documento soporte lleva numeración
      // consecutiva y contar registros repite números en cuanto alguno se filtre o se borre.
      const consecutivo = await siguienteConsecutivo(tx, {
        usuarioId: sesion.id,
        tipo: "documento_soporte",
        anio,
        semilla: async () => {
          const previos = await tx.documentoSoporte.findMany({
            where: { usuarioId: sesion.id },
            select: { numero: true },
          });
          return previos.reduce((max, x) => Math.max(max, numeroFinal(x.numero)), 0);
        },
      });
      const numero = `DS-${anio}-${String(consecutivo).padStart(4, "0")}`;
      const creado = await tx.documentoSoporte.create({
        data: { ...data, numero, usuarioId: sesion.id },
      });
      // Siempre vinculante: el soporte no tiene contraparte en tesorería, así que no hay
      // riesgo de doble conteo y la política de causación no le aplica.
      await registrarRetencionesDeSoporte(tx, sesion.id, creado);
      const contab = await contabilizarYEnlazar(tx, {
        usuarioId: sesion.id,
        tipo: "documento_soporte",
        documento: creado,
        mapa: await tx.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } }),
      });
      return { ...creado, asientoId: contab.asiento?.id || null };
    });
    return NextResponse.json({ soporte }, { status: 201 });
  } catch (e) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Conflicto de numeración, intente de nuevo." }, { status: 409 });
    throw e;
  }
}
