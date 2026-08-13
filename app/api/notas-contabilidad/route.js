import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarNota } from "@/lib/notaContabilidadValidation";
import { validarCuentasPUC } from "@/lib/asientoValidation";

// GET /api/notas-contabilidad?estado=&periodo=&tipoAjuste=&q=
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const estado = sp.get("estado") || "";
  const periodo = sp.get("periodo") || "";
  const tipoAjuste = sp.get("tipoAjuste") || "";
  const q = (sp.get("q") || "").trim();

  const where = {
    usuarioId: sesion.id,
    ...(estado ? { estado } : {}),
    ...(periodo ? { periodoAfectado: periodo } : {}),
    ...(tipoAjuste ? { tipoAjuste } : {}),
    ...(q
      ? {
          OR: [
            { numero: { contains: q, mode: "insensitive" } },
            { concepto: { contains: q, mode: "insensitive" } },
            { documentoRef: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const notas = await prisma.notaContabilidad.findMany({
    where,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: { movimientos: { orderBy: { orden: "asc" } } },
  });

  // Los periodos con notas, para que el filtro ofrezca solo los que existen.
  const periodos = [...new Set(notas.map((n) => n.periodoAfectado))].sort().reverse();

  return NextResponse.json({
    notas,
    periodos,
    totales: {
      borradores: notas.filter((n) => n.estado === "borrador").length,
      emitidas: notas.filter((n) => n.estado === "emitido").length,
      reversadas: notas.filter((n) => n.estado === "reversado").length,
    },
  });
}

// POST → crea el BORRADOR. Emitir es una acción aparte (PATCH en [id]), porque emitir mueve
// los libros y eso no debe pasar por accidente al guardar.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  // El sector lo manda el mapa de cuentas del usuario, no el cliente: es el catálogo contra el
  // que se validan sus cuentas y no es algo que la pantalla deba poder cambiar.
  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  const { data, movimientos, errors } = normalizarNota({ ...body, sector: mapa?.sector || "comercial" });
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  // Las cuentas deben existir en el catálogo y ser imputables; el nombre lo fija el catálogo.
  // Esto es lo que impidió el error de la plantilla original: un código que existe pero
  // corresponde a otra cuenta ("Marca Corporativa" en vez de "Cargos Diferidos") entraría con
  // el nombre del cliente y quedaría por escrito en un documento contable.
  const puc = await validarCuentasPUC(prisma, data.sector, movimientos);
  if (puc.errors.length)
    return NextResponse.json({ error: puc.errors[0], errores: puc.errors }, { status: 400 });

  const nota = await prisma.notaContabilidad.create({
    data: {
      ...data,
      estado: "borrador", // siempre: emitir es PATCH
      usuarioId: sesion.id,
      elaboradoPor: sesion.nombreCompleto || sesion.email,
      movimientos: {
        create: puc.movimientos.map((m, i) => ({
          cuenta: m.cuenta,
          nombreCuenta: m.nombreCuenta,
          debito: m.debito,
          credito: m.credito,
          tercero: m.tercero,
          detalle: m.detalle,
          orden: i,
        })),
      },
    },
    include: { movimientos: { orderBy: { orden: "asc" } } },
  });

  return NextResponse.json({ nota }, { status: 201 });
}
