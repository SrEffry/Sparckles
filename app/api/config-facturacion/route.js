import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarConfig } from "@/lib/configFacturacionValidation";

// GET /api/config-facturacion → configuración del usuario (o null si no existe)
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const config = await prisma.configFacturacion.findUnique({
    where: { usuarioId: sesion.id },
  });
  return NextResponse.json({ config });
}

// PUT /api/config-facturacion → crea o actualiza (upsert) la configuración
export async function PUT(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors } = normalizarConfig(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  // Preservar el consecutivo vigente: si ya hay config, mantener numeracionActual (salvo que
  // quede fuera del nuevo rango, en cuyo caso se reinicia a "desde").
  const existente = await prisma.configFacturacion.findUnique({
    where: { usuarioId: sesion.id },
  });
  let numeracionActual = data.numeracionDesde;
  if (existente?.numeracionActual != null) {
    const act = existente.numeracionActual;
    numeracionActual =
      act >= data.numeracionDesde && act <= data.numeracionHasta ? act : data.numeracionDesde;
  }

  const config = await prisma.configFacturacion.upsert({
    where: { usuarioId: sesion.id },
    create: { ...data, numeracionActual, usuarioId: sesion.id },
    update: { ...data, numeracionActual },
  });

  return NextResponse.json({ config });
}
