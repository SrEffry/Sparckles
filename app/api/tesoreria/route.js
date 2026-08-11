import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

const T = (v) => (v ?? "").toString().trim();

// Cajas y bancos del usuario. El comprobante propone una según el medio de pago, pero de
// qué cuenta concreta sale o entra el dinero lo decide siempre el usuario.
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const cuentas = await prisma.cuentaTesoreria.findMany({
    where: { usuarioId: sesion.id },
    orderBy: [{ activa: "desc" }, { predeterminada: "desc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ cuentas });
}

async function normalizar(body, usuarioId) {
  const errors = [];
  const nombre = T(body.nombre);
  const cuentaPuc = T(body.cuentaPuc);
  const tipo = body.tipo === "caja" ? "caja" : "banco";

  if (!nombre) errors.push("El nombre de la cuenta es obligatorio.");
  if (!cuentaPuc) errors.push("Selecciona la cuenta contable del catálogo.");

  if (cuentaPuc) {
    // El sector lo define el mapa: las cuentas de tesorería deben salir del mismo catálogo
    // que el resto de la contabilidad del usuario.
    const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId } });
    const sector = mapa?.sector || "comercial";
    const cuenta = await prisma.cuentaPUC.findFirst({ where: { sector, codigo: cuentaPuc } });
    if (!cuenta) errors.push(`La cuenta ${cuentaPuc} no existe en el catálogo ${sector}.`);
    else if (!cuenta.imputable)
      errors.push(`La cuenta ${cuentaPuc} (${cuenta.nombre}) es de agrupación y no admite movimientos.`);
  }

  return {
    errors,
    data: {
      nombre,
      cuentaPuc,
      tipo,
      medioPago: T(body.medioPago) || null,
      // El 4x1000 solo aplica a cuentas bancarias gravadas; una caja no lo causa.
      gravadaGmf: tipo === "banco" && body.gravadaGmf !== false,
      predeterminada: !!body.predeterminada,
      activa: body.activa !== false,
    },
  };
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

  const { data, errors } = await normalizar(body, sesion.id);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const cuenta = await prisma.$transaction(async (tx) => {
    // Una sola predeterminada por usuario.
    if (data.predeterminada) {
      await tx.cuentaTesoreria.updateMany({
        where: { usuarioId: sesion.id },
        data: { predeterminada: false },
      });
    }
    return tx.cuentaTesoreria.create({ data: { ...data, usuarioId: sesion.id } });
  });

  return NextResponse.json({ cuenta }, { status: 201 });
}
