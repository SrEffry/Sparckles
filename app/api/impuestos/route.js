import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { vigenteEn } from "@/lib/data/impuestos";

// GET /api/impuestos?fecha=YYYY-MM-DD&tipo=IVA
//
// Devuelve los impuestos del sistema más los propios del usuario. Si se pasa `fecha`, filtra
// por vigencia: una tarifa derogada no debe poder seleccionarse en un documento posterior a
// su derogatoria. La lista es una función de la fecha del documento, no una constante.
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const fecha = (sp.get("fecha") || "").trim();
  const tipo = (sp.get("tipo") || "").trim();

  const impuestos = await prisma.impuesto.findMany({
    where: {
      activo: true,
      OR: [{ usuarioId: null }, { usuarioId: sesion.id }],
      ...(tipo ? { tipo } : {}),
    },
    orderBy: [{ tipo: "asc" }, { tarifa: "desc" }],
  });

  const filtrados = fecha ? impuestos.filter((i) => vigenteEn(i, fecha)) : impuestos;
  return NextResponse.json({ impuestos: filtrados });
}
