import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

// GET /api/puc?sector=comercial&q=110&imputables=1
// Busca por CÓDIGO o por NOMBRE en el mismo campo:
//  - por código: prefijo numérico (ej. "1105").
//  - por nombre: multi-palabra (cada palabra debe aparecer) e insensible a acentos
//    (ej. "credito banco" encuentra "Bancos ... Crédito").
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const sector = url.searchParams.get("sector") === "esal" ? "esal" : "comercial";
  const q = (url.searchParams.get("q") || "").trim();
  const soloImputables = url.searchParams.get("imputables") === "1";

  if (!q) {
    const cuentas = await prisma.cuentaPUC.findMany({
      where: { sector, ...(soloImputables ? { imputable: true } : {}) },
      orderBy: { codigo: "asc" },
      take: 40,
    });
    return NextResponse.json({ cuentas });
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const codigoPrefijo = q.replace(/\s+/g, "");
  const esNumerico = /^\d+$/.test(codigoPrefijo);

  // Preferido: SQL con unaccent (insensible a acentos) + AND por palabra.
  try {
    const cond = ["sector = $1"];
    const params = [sector];
    if (soloImputables) cond.push("imputable = true");

    const or = [];
    if (esNumerico) {
      params.push(codigoPrefijo + "%");
      or.push(`codigo LIKE $${params.length}`);
    }
    const andNombre = tokens.map((t) => {
      params.push(`%${t}%`);
      return `unaccent(nombre) ILIKE unaccent($${params.length})`;
    });
    if (andNombre.length) or.push(`(${andNombre.join(" AND ")})`);
    if (or.length) cond.push(`(${or.join(" OR ")})`);

    const sql = `SELECT id, sector, codigo, nombre, clase, nivel, naturaleza, imputable
      FROM cuentas_puc WHERE ${cond.join(" AND ")}
      ORDER BY codigo ASC LIMIT 40`;

    const cuentas = await prisma.$queryRawUnsafe(sql, ...params);
    return NextResponse.json({ cuentas });
  } catch {
    // Fallback (sin la extensión unaccent): multi-palabra pero sensible a acentos.
    const cuentas = await prisma.cuentaPUC.findMany({
      where: {
        sector,
        ...(soloImputables ? { imputable: true } : {}),
        AND: tokens.map((t) => ({
          OR: [
            { codigo: { startsWith: t } },
            { nombre: { contains: t, mode: "insensitive" } },
          ],
        })),
      },
      orderBy: { codigo: "asc" },
      take: 40,
    });
    return NextResponse.json({ cuentas });
  }
}
