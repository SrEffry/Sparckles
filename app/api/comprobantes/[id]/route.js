import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { validarSaldos } from "@/lib/comprobanteValidation";
import { proponerAsientoIngreso, proponerAsientoEgreso, balancear } from "@/lib/comprobanteCalc";
import { validarCuentasPUC } from "@/lib/asientoValidation";
import { hoyBogota } from "@/lib/fechas";

async function delUsuario(id, usuarioId) {
  const c = await prisma.comprobanteTesoreria.findUnique({
    where: { id },
    include: { aplicaciones: true, retenciones: true, cuentaTesoreria: true },
  });
  if (!c || c.usuarioId !== usuarioId) return null;
  return c;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const comprobante = await delUsuario(id, sesion.id);
  if (!comprobante) return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });

  // Se devuelve también el asiento propuesto, para que la interfaz lo muestre editable antes
  // de contabilizar. Un comprobante ya emitido trae el asiento real.
  let asiento = null;
  if (comprobante.asientoId) {
    asiento = await prisma.asiento.findUnique({
      where: { id: comprobante.asientoId },
      include: { movimientos: true },
    });
  }
  return NextResponse.json({ comprobante, asiento });
}

/**
 * PATCH → acciones sobre el ciclo de vida.
 *
 *   emitir   : asigna consecutivo, crea el asiento y actualiza los saldos. Solo desde borrador.
 *   anular   : solo si NO afectó libros. Conserva el registro; el número no se reutiliza.
 *   reversar : si YA afectó libros. No se edita ni se borra: se emite un comprobante que
 *              invierte los movimientos y referencia al original.
 */
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const comprobante = await delUsuario(id, sesion.id);
  if (!comprobante) return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* opcional */
  }

  if (body.accion === "emitir") return emitir(comprobante, sesion, body);
  if (body.accion === "anular") return anular(comprobante, body);
  if (body.accion === "reversar") return reversar(comprobante, sesion, body);

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}

async function emitir(comprobante, sesion, body) {
  if (comprobante.estado !== "borrador") {
    return NextResponse.json(
      { error: `El comprobante está en estado "${comprobante.estado}" y ya no se puede emitir.` },
      { status: 400 }
    );
  }

  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  if (!mapa) {
    return NextResponse.json(
      { error: "Configura el mapa de cuentas antes de contabilizar comprobantes." },
      { status: 400 }
    );
  }

  // Emisor: se congela al contabilizar. Sin esto el impreso salía sin razón social ni NIT, y
  // un comprobante de egreso que soporta una retención no identificaba al agente retenedor.
  const cfg = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });
  if (!cfg?.razonSocial || !cfg?.nit) {
    return NextResponse.json(
      {
        error:
          "Completa la razón social y el NIT en Configuración → Config. Facturación: el comprobante debe identificar a quien lo emite.",
      },
      { status: 400 }
    );
  }

  // Movimientos: los que el usuario editó, o la propuesta si los aceptó tal cual.
  let movimientos = Array.isArray(body.movimientos) && body.movimientos.length ? body.movimientos : null;
  if (!movimientos) {
    try {
      const proponer = comprobante.tipo === "ingreso" ? proponerAsientoIngreso : proponerAsientoEgreso;
      movimientos = proponer({
        mapa,
        cuentaTesoreria: comprobante.cuentaTesoreria,
        aplicaciones: comprobante.aplicaciones,
        retenciones: comprobante.retenciones,
      }).movimientos;
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  // La partida doble se comprueba ANTES de contabilizar, no después.
  const saldo = balancear(movimientos);
  if (saldo.diferencia > 0.01) {
    return NextResponse.json(
      { error: `El asiento no está balanceado. Débitos ${saldo.debitos}, créditos ${saldo.creditos}.` },
      { status: 400 }
    );
  }

  const puc = await validarCuentasPUC(prisma, mapa.sector, movimientos);
  if (puc.errors.length) {
    return NextResponse.json({ error: puc.errors[0], errores: puc.errors }, { status: 400 });
  }

  const anio = Number(comprobante.fecha.slice(0, 4));
  const prefijo = comprobante.tipo === "ingreso" ? "CI" : "CE";

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Se revalidan los saldos: entre crear el borrador y emitirlo pudo emitirse otro
      // comprobante sobre las mismas facturas.
      const val = await validarSaldos(
        tx,
        sesion.id,
        comprobante.tipo,
        comprobante.aplicaciones.map((a) => ({
          facturaId: a.facturaId,
          compraId: a.compraId,
          valorAplicado: Number(a.valorAplicado),
        })),
        comprobante.id
      );
      if (val.errors.length) {
        const e = new Error(val.errors[0]);
        e.code = "SALDO";
        throw e;
      }

      // Consecutivo por (usuario, tipo, año), leído e incrementado atómicamente.
      // `count(*)` no sirve: si se filtra o borra algo, repite números.
      const contador = await tx.consecutivoDocumento.upsert({
        where: { usuarioId_tipo_anio: { usuarioId: sesion.id, tipo: comprobante.tipo, anio } },
        update: { actual: { increment: 1 } },
        create: { usuarioId: sesion.id, tipo: comprobante.tipo, anio, actual: 1 },
      });
      const consecutivo = contador.actual;
      const numero = `${prefijo}-${anio}-${String(consecutivo).padStart(5, "0")}`;

      // Asiento contable. Queda ligado al comprobante para impedir el doble registro.
      const numAsiento = `${numero}`;
      const asiento = await tx.asiento.create({
        data: {
          usuarioId: sesion.id,
          numero: numAsiento,
          sector: mapa.sector,
          fecha: comprobante.fecha,
          descripcion: comprobante.concepto.slice(0, 200),
          tipo: comprobante.tipo === "ingreso" ? "ingreso" : "egreso",
          documentoRef: numero,
          estado: "registrado",
          totalDebitos: saldo.debitos,
          totalCreditos: saldo.creditos,
          diferencia: saldo.diferencia,
          movimientos: {
            create: puc.movimientos.map((m) => ({
              cuenta: m.cuenta,
              nombreCuenta: m.nombreCuenta,
              debito: Number(m.debito) || 0,
              credito: Number(m.credito) || 0,
              tercero: comprobante.terceroDocumento || null,
            })),
          },
        },
      });

      // Saldos de los documentos aplicados.
      for (const ap of comprobante.aplicaciones) {
        if (ap.facturaId) {
          await tx.factura.update({
            where: { id: ap.facturaId },
            data: { totalRecaudado: { increment: ap.valorAplicado } },
          });
        } else if (ap.compraId) {
          await tx.compra.update({
            where: { id: ap.compraId },
            data: { totalPagado: { increment: ap.valorAplicado } },
          });
        }
      }

      return tx.comprobanteTesoreria.update({
        where: { id: comprobante.id },
        data: {
          estado: "emitido",
          prefijo,
          anio,
          consecutivo,
          numero,
          asientoId: asiento.id,
          emisorRazonSocial: cfg.razonSocial,
          emisorNit: cfg.nit,
          emisorSnapshot: {
            razonSocial: cfg.razonSocial,
            nit: cfg.nit,
            direccion: cfg.direccion,
            ciudad: cfg.ciudad,
            telefono: cfg.telefono,
            email: cfg.email,
          },
          autorizadoPor: sesion.nombreCompleto || sesion.email,
          autorizadoEn: new Date(),
        },
        include: { aplicaciones: true, retenciones: true },
      });
    });

    return NextResponse.json({ comprobante: resultado });
  } catch (e) {
    if (e.code === "SALDO") return NextResponse.json({ error: e.message }, { status: 409 });
    if (e.code === "P2002")
      return NextResponse.json({ error: "Conflicto de numeración, intenta de nuevo." }, { status: 409 });
    throw e;
  }
}

async function anular(comprobante, body) {
  // Un comprobante que ya afectó libros NO se anula: se reversa. Anularlo dejaría el asiento
  // vivo sin documento que lo respalde, rompiendo la correspondencia que exige el art. 124.
  if (comprobante.estado === "emitido") {
    return NextResponse.json(
      {
        error:
          "Este comprobante ya afectó los libros. No se anula: se reversa con un comprobante que invierte los movimientos.",
        sugerencia: "reversar",
      },
      { status: 400 }
    );
  }
  if (comprobante.estado !== "borrador") {
    return NextResponse.json({ error: `No se puede anular un comprobante ${comprobante.estado}.` }, { status: 400 });
  }

  const actualizado = await prisma.comprobanteTesoreria.update({
    where: { id: comprobante.id },
    data: { estado: "anulado", motivoAnulacion: (body.motivo || "").trim() || null },
  });
  return NextResponse.json({ comprobante: actualizado });
}

async function reversar(comprobante, sesion, body) {
  if (comprobante.estado !== "emitido") {
    return NextResponse.json(
      { error: "Solo se reversa un comprobante emitido. Un borrador se anula o se descarta." },
      { status: 400 }
    );
  }

  const motivo = (body.motivo || "").trim();
  if (!motivo) {
    return NextResponse.json({ error: "Indica el motivo de la reversión: queda en el documento." }, { status: 400 });
  }

  const asientoOriginal = comprobante.asientoId
    ? await prisma.asiento.findUnique({ where: { id: comprobante.asientoId }, include: { movimientos: true } })
    : null;
  if (!asientoOriginal) {
    return NextResponse.json({ error: "No se encontró el asiento original del comprobante." }, { status: 400 });
  }

  const fecha = hoyBogota();
  const anio = Number(fecha.slice(0, 4));
  const prefijo = comprobante.tipo === "ingreso" ? "CI" : "CE";

  const resultado = await prisma.$transaction(async (tx) => {
    const contador = await tx.consecutivoDocumento.upsert({
      where: { usuarioId_tipo_anio: { usuarioId: sesion.id, tipo: comprobante.tipo, anio } },
      update: { actual: { increment: 1 } },
      create: { usuarioId: sesion.id, tipo: comprobante.tipo, anio, actual: 1 },
    });
    const consecutivo = contador.actual;
    const numero = `${prefijo}-${anio}-${String(consecutivo).padStart(5, "0")}`;

    // Asiento que invierte los movimientos del original.
    const asiento = await tx.asiento.create({
      data: {
        usuarioId: sesion.id,
        numero,
        sector: asientoOriginal.sector,
        fecha,
        descripcion: `Reversión de ${comprobante.numero}: ${motivo}`.slice(0, 200),
        tipo: comprobante.tipo === "ingreso" ? "ingreso" : "egreso",
        documentoRef: comprobante.numero,
        estado: "registrado",
        totalDebitos: asientoOriginal.totalCreditos,
        totalCreditos: asientoOriginal.totalDebitos,
        diferencia: 0,
        movimientos: {
          create: asientoOriginal.movimientos.map((m) => ({
            cuenta: m.cuenta,
            nombreCuenta: m.nombreCuenta,
            debito: m.credito, // invertido
            credito: m.debito,
            tercero: m.tercero,
          })),
        },
      },
    });

    // Se devuelven los saldos a los documentos.
    for (const ap of comprobante.aplicaciones) {
      if (ap.facturaId) {
        await tx.factura.update({
          where: { id: ap.facturaId },
          data: { totalRecaudado: { decrement: ap.valorAplicado } },
        });
      } else if (ap.compraId) {
        await tx.compra.update({
          where: { id: ap.compraId },
          data: { totalPagado: { decrement: ap.valorAplicado } },
        });
      }
    }

    const reversion = await tx.comprobanteTesoreria.create({
      data: {
        usuarioId: sesion.id,
        tipo: comprobante.tipo,
        prefijo,
        anio,
        consecutivo,
        numero,
        fecha,
        ciudad: comprobante.ciudad,
        terceroNombre: comprobante.terceroNombre,
        terceroDocumento: comprobante.terceroDocumento,
        medioPago: comprobante.medioPago,
        cuentaTesoreriaId: comprobante.cuentaTesoreriaId,
        cuentaTesoreriaPuc: comprobante.cuentaTesoreriaPuc,
        cuentaTesoreriaNombre: comprobante.cuentaTesoreriaNombre,
        concepto: `Reversión de ${comprobante.numero}. ${motivo}`,
        valorBruto: comprobante.valorBruto,
        totalRetenciones: comprobante.totalRetenciones,
        neto: comprobante.neto,
        estado: "emitido",
        asientoId: asiento.id,
        reversaAId: comprobante.id,
        elaboradoPor: sesion.nombreCompleto || sesion.email,
        elaboradoEn: new Date(),
        autorizadoPor: sesion.nombreCompleto || sesion.email,
        autorizadoEn: new Date(),
      },
    });

    // Aplicaciones en NEGATIVO. Cumplen dos funciones: dejan que el impreso de la reversión
    // diga a qué documentos revierte, y mantienen alineado el contador de aplicaciones con
    // `totalRecaudado`. Sin ellas, el original reversado seguía sumando y la factura quedaba
    // irrecaudable pese a mostrar saldo disponible.
    if (comprobante.aplicaciones.length) {
      await tx.comprobanteAplicacion.createMany({
        data: comprobante.aplicaciones.map((a) => ({
          comprobanteId: reversion.id,
          facturaId: a.facturaId,
          compraId: a.compraId,
          docRef: a.docRef,
          valorDocumento: a.valorDocumento,
          saldoAnterior: a.saldoNuevo,
          valorAplicado: Number(a.valorAplicado) * -1,
          saldoNuevo: a.saldoAnterior,
        })),
      });
    }

    await tx.comprobanteTesoreria.update({
      where: { id: comprobante.id },
      data: { estado: "reversado", reversadoEn: fecha, motivoAnulacion: motivo },
    });

    return reversion;
  });

  return NextResponse.json({ comprobante: resultado, reversado: comprobante.id }, { status: 201 });
}
