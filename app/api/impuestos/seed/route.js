import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { IMPUESTOS_SISTEMA } from "@/lib/data/impuestos";
import { tratamientoIva } from "@/lib/data/tarifasIva";

// POST /api/impuestos/seed
//
// Carga el catálogo del sistema (idempotente) y, con ?migrar=1, clasifica los productos que
// venían con la tarifa en texto ("19%", "Exento") al nuevo modelo de tratamiento + impuestos.
//
// La migración es CONSERVADORA: solo asigna impuesto cuando el tratamiento es 'gravado' y la
// tarifa mapea sin ambigüedad. Un "0%" heredado NO se adivina — queda como 'no_gravado' con
// el texto original preservado en `tarifaIva`, para que alguien decida si era exento o
// excluido. Adivinar ahí es exactamente lo que rompe el prorrateo del Art. 490.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const migrar = sp.get("migrar") === "1";

  // ---- 1. Catálogo del sistema ----
  let creados = 0;
  for (const imp of IMPUESTOS_SISTEMA) {
    const existente = await prisma.impuesto.findFirst({
      where: { usuarioId: null, codigo: imp.codigo },
    });
    if (existente) {
      await prisma.impuesto.update({ where: { id: existente.id }, data: { ...imp, esSistema: true } });
    } else {
      await prisma.impuesto.create({ data: { ...imp, esSistema: true, usuarioId: null } });
    }
    creados++;
  }

  if (!migrar) {
    return NextResponse.json({ ok: true, impuestos: creados, migrados: 0 });
  }

  // ---- 2. Migración de los productos del usuario ----
  const porTarifa = new Map(
    (await prisma.impuesto.findMany({ where: { usuarioId: null, tipo: "IVA", vigenteHasta: null } }))
      .map((i) => [Number(i.tarifa), i])
  );

  const productos = await prisma.producto.findMany({
    where: { usuarioId: sesion.id },
    include: { impuestos: true },
  });

  const resultado = { gravados: 0, exentos: 0, excluidos: 0, sinClasificar: 0, yaMigrados: 0 };

  for (const p of productos) {
    if (p.impuestos.length > 0 || p.tratamientoIva !== "gravado") {
      resultado.yaMigrados++;
      continue;
    }

    const tratamiento = tratamientoIva(p.tarifaIva);

    if (tratamiento === "exento") {
      const iva0 = porTarifa.get(0);
      await prisma.producto.update({
        where: { id: p.id },
        data: {
          tratamientoIva: "exento",
          // El exento SÍ lleva grupo de impuesto, al 0%: es gravado a tarifa cero.
          impuestos: iva0 ? { create: [{ impuestoId: iva0.id }] } : undefined,
        },
      });
      resultado.exentos++;
      continue;
    }

    if (tratamiento === "excluido") {
      // El excluido NO lleva grupo de impuesto: el anexo técnico lo prohíbe (regla FAX01).
      await prisma.producto.update({
        where: { id: p.id },
        data: { tratamientoIva: "excluido" },
      });
      resultado.excluidos++;
      continue;
    }

    if (tratamiento === "sin_clasificar") {
      await prisma.producto.update({
        where: { id: p.id },
        data: { tratamientoIva: "no_gravado" },
      });
      resultado.sinClasificar++;
      continue;
    }

    // Gravado: se busca el impuesto de IVA vigente con esa tarifa exacta.
    const tarifa = Number(String(p.tarifaIva || "").replace("%", "").trim());
    const imp = porTarifa.get(tarifa);
    if (!imp) {
      // Sin correspondencia (tarifa histórica o de otro impuesto): no se inventa. Queda
      // marcado para revisión manual con el texto original intacto.
      await prisma.producto.update({
        where: { id: p.id },
        data: { tratamientoIva: "no_gravado" },
      });
      resultado.sinClasificar++;
      continue;
    }
    await prisma.producto.update({
      where: { id: p.id },
      data: { tratamientoIva: "gravado", impuestos: { create: [{ impuestoId: imp.id }] } },
    });
    resultado.gravados++;
  }

  return NextResponse.json({ ok: true, impuestos: creados, migracion: resultado });
}
