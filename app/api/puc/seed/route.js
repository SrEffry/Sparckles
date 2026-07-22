import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import comercial from "@/lib/data/pucComercial.json";
import esal from "@/lib/data/pucEsal.json";

// POST /api/puc/seed → carga el catálogo PUC (comercial + esal) a la BD.
// Idempotente: no recarga si ya hay datos, salvo ?force=1.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // Habilita la búsqueda insensible a acentos del catálogo (GET /api/puc). Si el rol de BD no
  // tiene permiso para crear extensiones, no es fatal: el endpoint tiene fallback sin unaccent.
  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS unaccent");
  } catch {
    /* sin permisos: se usa el fallback */
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const existentes = await prisma.cuentaPUC.count();
  if (existentes > 0 && !force) {
    return NextResponse.json({ ok: true, message: "PUC ya cargado.", total: existentes });
  }

  if (force) await prisma.cuentaPUC.deleteMany({});

  const todas = [...comercial, ...esal];
  let insertadas = 0;
  for (let i = 0; i < todas.length; i += 500) {
    const chunk = todas.slice(i, i + 500);
    const res = await prisma.cuentaPUC.createMany({ data: chunk, skipDuplicates: true });
    insertadas += res.count;
  }

  return NextResponse.json({
    ok: true,
    insertadas,
    comercial: comercial.length,
    esal: esal.length,
  });
}
