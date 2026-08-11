import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { validarMapaCuentas, CLAVES_CUENTA, faltantesParaComprobantes } from "@/lib/mapaCuentasValidation";
import { SUGERENCIAS, TESORERIA_SUGERIDA } from "@/lib/data/mapaCuentasDefecto";

// GET /api/mapa-cuentas → mapa del usuario (o sugerencias si aún no lo ha configurado)
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  const tesoreria = await prisma.cuentaTesoreria.findMany({
    where: { usuarioId: sesion.id, activa: true },
    orderBy: [{ predeterminada: "desc" }, { nombre: "asc" }],
  });

  return NextResponse.json({
    mapa,
    tesoreria,
    // Qué falta para poder emitir comprobantes. Se responde aquí para que la UI pueda
    // avisar antes de que el usuario intente generar uno y se encuentre con el error.
    faltantes: faltantesParaComprobantes(mapa),
    configurado: !!mapa,
  });
}

// PUT /api/mapa-cuentas → guarda el mapa (upsert)
export async function PUT(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors } = await validarMapaCuentas(body);
  if (errors.length) {
    return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });
  }

  const mapa = await prisma.mapaCuentas.upsert({
    where: { usuarioId: sesion.id },
    update: data,
    create: { ...data, usuarioId: sesion.id },
  });
  return NextResponse.json({ mapa, faltantes: faltantesParaComprobantes(mapa) });
}

// POST /api/mapa-cuentas → siembra las sugerencias iniciales
//
// Solo propone lo que EXISTE en el catálogo cargado: si una cuenta sugerida no está, se
// omite en vez de guardar un código inválido. El usuario la completa a mano.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sector = new URL(request.url).searchParams.get("sector") === "esal" ? "esal" : "comercial";

  const ya = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  if (ya) {
    return NextResponse.json(
      { error: "El mapa de cuentas ya está configurado. Edítalo en vez de volver a sembrarlo." },
      { status: 409 }
    );
  }

  const sugerido = SUGERENCIAS[sector] || {};
  const codigos = [...new Set(Object.values(sugerido).filter(Boolean))];
  const existentes = new Set(
    (
      await prisma.cuentaPUC.findMany({
        where: { sector, codigo: { in: codigos }, imputable: true },
        select: { codigo: true },
      })
    ).map((c) => c.codigo)
  );

  const data = { sector };
  const omitidas = [];
  for (const clave of CLAVES_CUENTA) {
    const codigo = sugerido[clave];
    if (codigo && existentes.has(codigo)) data[clave] = codigo;
    else {
      data[clave] = null;
      if (codigo) omitidas.push(`${clave} (${codigo})`);
    }
  }

  const mapa = await prisma.mapaCuentas.create({ data: { ...data, usuarioId: sesion.id } });

  // Cuentas de tesorería sugeridas, solo las que existan en el catálogo.
  const tesoreriaSugerida = TESORERIA_SUGERIDA[sector] || [];
  const codigosTes = tesoreriaSugerida.map((t) => t.cuentaPuc);
  const existentesTes = new Set(
    (
      await prisma.cuentaPUC.findMany({
        where: { sector, codigo: { in: codigosTes }, imputable: true },
        select: { codigo: true },
      })
    ).map((c) => c.codigo)
  );
  const aCrear = tesoreriaSugerida.filter((t) => existentesTes.has(t.cuentaPuc));
  if (aCrear.length) {
    await prisma.cuentaTesoreria.createMany({
      data: aCrear.map((t) => ({ ...t, usuarioId: sesion.id })),
    });
  }

  return NextResponse.json(
    { mapa, tesoreriaCreada: aCrear.length, omitidas, faltantes: faltantesParaComprobantes(mapa) },
    { status: 201 }
  );
}
