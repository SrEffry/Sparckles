import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import {
  normalizarNota,
  cuentasBlindadas,
  blindarTesoreria,
  validarCuentasBlindadas,
} from "@/lib/notaContabilidadValidation";
import { validarCuentasPUC } from "@/lib/asientoValidation";
import { siguienteConsecutivo, numeroFinal } from "@/lib/consecutivos";
import { hoyBogota } from "@/lib/fechas";

async function cargar(id, usuarioId) {
  return prisma.notaContabilidad.findFirst({
    where: { id, usuarioId },
    include: { movimientos: { orderBy: { orden: "asc" } } },
  });
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const nota = await cargar(id, sesion.id);
  if (!nota) return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });

  const asiento = nota.asientoId
    ? await prisma.asiento.findUnique({ where: { id: nota.asientoId }, include: { movimientos: true } })
    : null;

  // Se dice de una vez qué cuentas no puede tocar, para que la pantalla lo avise mientras se
  // edita en vez de rechazarlo al final.
  const [mapa, tesoreria] = await Promise.all([
    prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } }),
    prisma.cuentaTesoreria.findMany({ where: { usuarioId: sesion.id } }),
  ]);
  const blindadas = blindarTesoreria(cuentasBlindadas(mapa), tesoreria);

  return NextResponse.json({
    nota,
    asiento,
    blindadas: [...blindadas.entries()].map(([cuenta, motivo]) => ({ cuenta, motivo })),
  });
}

// PUT → edita el borrador. Una nota emitida NO se edita: se reversa y se hace otra.
export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await cargar(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });
  if (existente.estado !== "borrador") {
    return NextResponse.json(
      { error: "Una nota emitida no se edita. Revérsala y expide una nueva." },
      { status: 409 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, movimientos, errors } = normalizarNota({ ...body, sector: existente.sector });
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const puc = await validarCuentasPUC(prisma, data.sector, movimientos);
  if (puc.errors.length)
    return NextResponse.json({ error: puc.errors[0], errores: puc.errors }, { status: 400 });

  const nota = await prisma.$transaction(async (tx) => {
    await tx.notaContabilidadMovimiento.deleteMany({ where: { notaId: id } });
    return tx.notaContabilidad.update({
      where: { id },
      data: {
        ...data,
        estado: "borrador",
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
  });

  return NextResponse.json({ nota });
}

// PATCH { accion: 'emitir' | 'reversar' | 'descartar' }
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const nota = await cargar(id, sesion.id);
  if (!nota) return NextResponse.json({ error: "Nota no encontrada." }, { status: 404 });

  try {
    if (body.accion === "emitir") return await emitir(nota, sesion, body);
    if (body.accion === "reversar") return await reversar(nota, sesion, body);
    if (body.accion === "descartar") return await descartar(nota);
  } catch (e) {
    if (e.code === "NOTA") return NextResponse.json({ error: e.message }, { status: 409 });
    if (e.code === "P2002")
      return NextResponse.json({ error: "Conflicto de numeración. Intenta de nuevo." }, { status: 409 });
    throw e;
  }

  return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
}

/**
 * Emite la nota: le da número, genera el asiento y la deja en el libro diario.
 *
 * A partir de aquí la nota ya no se edita ni se borra — es un comprobante de contabilidad y el
 * art. 124 del Decreto 2649 exige numeración consecutiva de los comprobantes.
 */
async function emitir(nota, sesion, body) {
  if (nota.estado !== "borrador") {
    const e = new Error(`La nota ya está ${nota.estado}.`);
    e.code = "NOTA";
    throw e;
  }
  if (Number(nota.diferencia) > 0.01) {
    const e = new Error(`La nota no está balanceada. Diferencia: ${nota.diferencia}.`);
    e.code = "NOTA";
    throw e;
  }
  if (nota.movimientos.length < 2) {
    const e = new Error("La nota debe tener al menos 2 movimientos.");
    e.code = "NOTA";
    throw e;
  }

  const [mapa, tesoreria, cfg] = await Promise.all([
    prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } }),
    prisma.cuentaTesoreria.findMany({ where: { usuarioId: sesion.id } }),
    prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } }),
  ]);

  // Un comprobante de contabilidad sin el ente que lo emite no es un documento: el impreso
  // saldría con "—" donde va la razón social. Es el mismo bloqueo que ya tiene el comprobante
  // de tesorería.
  if (!cfg?.razonSocial || !cfg?.nit) {
    const e = new Error(
      "Configura la razón social y el NIT del emisor antes de emitir: van impresos en el comprobante."
    );
    e.code = "NOTA";
    throw e;
  }

  // Cartera, proveedores y tesorería tienen saldos que mantienen otros módulos. Moverlos aquí
  // descuadra el libro contra los pendientes por cobrar y por pagar sin que nada avise.
  const blindadas = blindarTesoreria(cuentasBlindadas(mapa), tesoreria);
  const choques = validarCuentasBlindadas(nota.movimientos, blindadas);
  if (choques.length) {
    const e = new Error(choques[0]);
    e.code = "NOTA";
    throw e;
  }

  const anio = Number((nota.fecha || "").slice(0, 4)) || new Date().getFullYear();

  const actualizada = await prisma.$transaction(async (tx) => {
    const consecutivo = await siguienteConsecutivo(tx, {
      usuarioId: sesion.id,
      tipo: "nota_contabilidad",
      anio,
      // La semilla filtra POR AÑO: escaneando todos los `CC-`, la primera nota de 2027 salía
      // con el número siguiente al último de 2026 y la serie dejaba de contar el ejercicio.
      semilla: async () => {
        const previos = await tx.notaContabilidad.findMany({
          where: { usuarioId: sesion.id, numero: { startsWith: `CC-${anio}-` } },
          select: { numero: true },
        });
        return previos.reduce((max, n) => Math.max(max, numeroFinal(n.numero)), 0);
      },
    });
    const numero = `CC-${anio}-${String(consecutivo).padStart(4, "0")}`;

    const asiento = await tx.asiento.create({
      data: {
        usuarioId: sesion.id,
        numero,
        sector: nota.sector,
        fecha: nota.fecha,
        descripcion: nota.concepto.slice(0, 200),
        tipo: "nota_contabilidad",
        documentoRef: numero,
        estado: "registrado",
        totalDebitos: nota.totalDebitos,
        totalCreditos: nota.totalCreditos,
        diferencia: nota.diferencia,
        movimientos: {
          create: nota.movimientos.map((m) => ({
            cuenta: m.cuenta,
            nombreCuenta: m.nombreCuenta,
            debito: m.debito,
            credito: m.credito,
            tercero: m.tercero,
          })),
        },
      },
    });

    return tx.notaContabilidad.update({
      where: { id: nota.id },
      data: {
        numero,
        estado: "emitido",
        asientoId: asiento.id,
        autorizadoPor: (body.autorizadoPor || "").trim() || sesion.nombreCompleto || sesion.email,
        // Se congela el emisor: una nota de 2026 debe seguir mostrando la razón social de 2026.
        emisorSnapshot: {
          razonSocial: cfg.razonSocial,
          nit: cfg.nit,
          direccion: cfg.direccion,
          ciudad: cfg.ciudad,
          telefono: cfg.telefono,
          email: cfg.email,
        },
        ciudad: nota.ciudad || cfg.ciudad || null,
      },
      include: { movimientos: { orderBy: { orden: "asc" } } },
    });
  });

  return NextResponse.json({ nota: actualizada });
}

/**
 * Reversa: crea OTRA nota emitida que invierte los movimientos.
 *
 * No se borra ni se anula el asiento original. El art. 125 del Decreto 2649 no admite huecos en
 * la numeración ni borrados en el libro: un error se corrige con un contraasiento que también
 * queda registrado.
 */
async function reversar(nota, sesion, body) {
  if (nota.estado !== "emitido") {
    const e = new Error(`Solo se reversa una nota emitida. Esta está ${nota.estado}.`);
    e.code = "NOTA";
    throw e;
  }
  const motivo = (body.motivo || "").trim();
  if (!motivo) {
    const e = new Error("Indica el motivo de la reversión: queda escrito en el libro.");
    e.code = "NOTA";
    throw e;
  }

  // La reversión se fecha HOY, no el día de la nota original. Antedatarla modificaría en
  // silencio un periodo que puede estar ya declarado, y borraría el rastro de cuándo se
  // decidió corregir. `body.fecha` queda como override explícito.
  const hoy = body.fecha || hoyBogota();
  // Y el año sale de la fecha EFECTIVA: derivarlo de la nota original producía
  // "CC-2025-0012 fechado 2026-02-10", que rompe la correspondencia entre serie y ejercicio.
  const anio = Number(hoy.slice(0, 4)) || new Date().getFullYear();

  const resultado = await prisma.$transaction(async (tx) => {
    const consecutivo = await siguienteConsecutivo(tx, {
      usuarioId: sesion.id,
      tipo: "nota_contabilidad",
      anio,
      // La semilla filtra POR AÑO: escaneando todos los `CC-`, la primera nota de 2027 salía
      // con el número siguiente al último de 2026 y la serie dejaba de contar el ejercicio.
      semilla: async () => {
        const previos = await tx.notaContabilidad.findMany({
          where: { usuarioId: sesion.id, numero: { startsWith: `CC-${anio}-` } },
          select: { numero: true },
        });
        return previos.reduce((max, n) => Math.max(max, numeroFinal(n.numero)), 0);
      },
    });
    const numero = `CC-${anio}-${String(consecutivo).padStart(4, "0")}`;
    const concepto = `Reversión de ${nota.numero}. ${motivo}`;

    // Débito y crédito intercambiados: eso es el contraasiento.
    const invertidos = nota.movimientos.map((m, i) => ({
      cuenta: m.cuenta,
      nombreCuenta: m.nombreCuenta,
      debito: m.credito,
      credito: m.debito,
      tercero: m.tercero,
      detalle: m.detalle,
      orden: i,
    }));

    const asiento = await tx.asiento.create({
      data: {
        usuarioId: sesion.id,
        numero,
        sector: nota.sector,
        fecha: hoy,
        descripcion: concepto.slice(0, 200),
        tipo: "nota_contabilidad",
        documentoRef: numero,
        estado: "registrado",
        totalDebitos: nota.totalCreditos,
        totalCreditos: nota.totalDebitos,
        diferencia: 0,
        movimientos: {
          create: invertidos.map(({ detalle, orden, ...m }) => m),
        },
      },
    });

    const reversion = await tx.notaContabilidad.create({
      data: {
        usuarioId: sesion.id,
        numero,
        sector: nota.sector,
        fecha: hoy,
        ciudad: nota.ciudad,
        periodoAfectado: nota.periodoAfectado,
        tipoAjuste: "reversion",
        concepto,
        documentoRef: nota.numero,
        totalDebitos: nota.totalCreditos,
        totalCreditos: nota.totalDebitos,
        diferencia: 0,
        estado: "emitido",
        asientoId: asiento.id,
        reversaAId: nota.id,
        elaboradoPor: sesion.nombreCompleto || sesion.email,
        autorizadoPor: sesion.nombreCompleto || sesion.email,
        emisorSnapshot: nota.emisorSnapshot,
        movimientos: { create: invertidos },
      },
      include: { movimientos: { orderBy: { orden: "asc" } } },
    });

    await tx.notaContabilidad.update({
      where: { id: nota.id },
      data: { estado: "reversado", reversadaPorId: reversion.id, motivoReversion: motivo },
    });

    return reversion;
  });

  return NextResponse.json({ nota: resultado });
}

/** Descarta un borrador. Solo un borrador: no ha tocado los libros, así que se puede borrar. */
async function descartar(nota) {
  if (nota.estado !== "borrador") {
    const e = new Error("Solo se descarta un borrador. Una nota emitida se reversa.");
    e.code = "NOTA";
    throw e;
  }
  await prisma.notaContabilidad.delete({ where: { id: nota.id } });
  return NextResponse.json({ ok: true });
}
