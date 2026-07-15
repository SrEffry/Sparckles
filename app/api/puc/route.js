import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

// GET /api/puc?sector=comercial&q=110&imputables=1 → busca cuentas del PUC
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const sector = url.searchParams.get("sector") === "esal" ? "esal" : "comercial";
  const q = (url.searchParams.get("q") || "").trim();
  const soloImputables = url.searchParams.get("imputables") === "1";

  const where = { sector };
  if (soloImputables) where.imputable = true;
  if (q) {
    where.OR = [
      { codigo: { startsWith: q } },
      { nombre: { contains: q, mode: "insensitive" } },
    ];
  }

  const cuentas = await prisma.cuentaPUC.findMany({
    where,
    orderBy: { codigo: "asc" },
    take: 40,
  });
  return NextResponse.json({ cuentas });
}
