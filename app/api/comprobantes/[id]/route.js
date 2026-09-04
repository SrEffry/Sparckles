import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarDocumento } from "@/lib/retencionesPracticadas";
import { validarSaldos, normalizarComprobante } from "@/lib/comprobanteValidation";
import {
  proponerAsientoIngreso,
  proponerAsientoEgreso,
  proponerAsientoImputacion,
  balancear,
} from "@/lib/comprobanteCalc";
import { validarCuentasPUC } from "@/lib/asientoValidation";
import { hoyBogota } from "@/lib/fechas";
import { siguienteConsecutivo } from "@/lib/consecutivos";
import { registrarRetencionesDeComprobante, borrarRetencionesDe } from "@/lib/retencionesDeDocumentos";

async function delUsuario(id, usuarioId) {
  const c = await prisma.comprobanteTesoreria.findUnique({
    where: { id },
    include: { aplicaciones: true, imputaciones: true, retenciones: true, cuentaTesoreria: true },
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
 * PUT → edita un BORRADOR. Solo mientras no haya afectado los libros: un comprobante emitido
 * no se edita, se reversa. Antes había que descartarlo y rehacerlo por corregir una fecha.
 */
export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await delUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });
  if (existente.estado !== "borrador") {
    return NextResponse.json(
      {
        error: `Un comprobante ${existente.estado} no se edita. Si ya afectó los libros, corrígelo reversándolo.`,
      },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const mapaPrevio = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });
  const { data, aplicaciones, imputaciones, retenciones, errors } = normalizarComprobante(
    {
      ...body,
      tipo: existente.tipo, // el tipo no se cambia: cambiaría toda la lógica del asiento
    },
    mapaPrevio
  );
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  let cuenta = null;
  if (data.cuentaTesoreriaId) {
    cuenta = await prisma.cuentaTesoreria.findUnique({ where: { id: data.cuentaTesoreriaId } });
    if (!cuenta || cuenta.usuarioId !== sesion.id || !cuenta.activa) {
      return NextResponse.json({ error: "La caja o banco seleccionado no es válido." }, { status: 400 });
    }
  }

  const mapa = mapaPrevio;

  try {
    const actualizado = await prisma.$transaction(async (tx) => {
      const val = await validarSaldos(tx, sesion.id, existente.tipo, aplicaciones, existente.id);
      if (val.errors.length) {
        const e = new Error(val.errors[0]);
        e.code = "SALDO";
        throw e;
      }

      const totalRet = retenciones.reduce((a, x) => a + x.valor, 0);
      const causadas = mapa?.retencionesEnCausacion !== false;
      const rr2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

      let bruto;
      let neto;
      if (data.modo === "imputacion") {
        bruto = rr2(imputaciones.reduce((a, i) => a + i.valor, 0));
        neto = data.tipo === "ingreso" ? bruto : rr2(bruto - totalRet);
      } else {
        const movido = val.aplicaciones.reduce((a, x) => a + x.valorAplicado, 0);
        bruto = causadas ? movido : movido + totalRet;
        neto = movido;
      }

      await tx.comprobanteAplicacion.deleteMany({ where: { comprobanteId: existente.id } });
      await tx.comprobanteImputacion.deleteMany({ where: { comprobanteId: existente.id } });
      await tx.comprobanteRetencion.deleteMany({ where: { comprobanteId: existente.id } });

      await tx.comprobanteTesoreria.update({
        where: { id: existente.id },
        data: {
          ...data,
          cuentaTesoreriaPuc: cuenta?.cuentaPuc || null,
          cuentaTesoreriaNombre: cuenta?.nombre || null,
          valorBruto: bruto,
          totalRetenciones: totalRet,
          neto,
        },
      });

      if (val.aplicaciones.length) {
        await tx.comprobanteAplicacion.createMany({
          data: val.aplicaciones.map((a) => ({ ...a, comprobanteId: existente.id })),
        });
      }
      if (imputaciones.length) {
        await tx.comprobanteImputacion.createMany({
          data: imputaciones.map((i) => ({ ...i, comprobanteId: existente.id })),
        });
      }
      if (retenciones.length) {
        await tx.comprobanteRetencion.createMany({
          data: retenciones.map((r) => ({ ...r, comprobanteId: existente.id })),
        });
      }

      return tx.comprobanteTesoreria.findUnique({
        where: { id: existente.id },
        include: { aplicaciones: true, imputaciones: true, retenciones: true },
      });
    });

    return NextResponse.json({ comprobante: actualizado });
  } catch (e) {
    if (e.code === "SALDO") return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
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
  if (body.accion === "anular") return anular(comprobante, sesion, body);
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
      if (comprobante.modo === "imputacion") {
        movimientos = proponerAsientoImputacion({
          mapa,
          cuentaTesoreria: comprobante.cuentaTesoreria,
          tipo: comprobante.tipo,
          imputaciones: comprobante.imputaciones,
          retenciones: comprobante.retenciones,
        }).movimientos;
      } else {
        const proponer = comprobante.tipo === "ingreso" ? proponerAsientoIngreso : proponerAsientoEgreso;
        movimientos = proponer({
          mapa,
          cuentaTesoreria: comprobante.cuentaTesoreria,
          aplicaciones: comprobante.aplicaciones,
          retenciones: comprobante.retenciones,
        }).movimientos;
      }
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

  // Que el asiento CUADRE no basta: tiene que corresponder al comprobante. Sin esto, un
  // comprobante por 10.000.000 podía contabilizarse con un asiento de $1 —balanceado— y
  // quedar "Contabilizado" con el papel diciendo otra cosa que los libros.
  const cuentaPuc = comprobante.cuentaTesoreriaPuc;
  if (cuentaPuc) {
    const movTesoreria = movimientos.filter((m) => m.cuenta === cuentaPuc);
    const neto = Number(comprobante.neto);
    // En el ingreso la tesorería se debita; en el egreso se acredita (más el GMF, que sale
    // de la misma cuenta y por eso se suma al comparar).
    const movido =
      comprobante.tipo === "ingreso"
        ? movTesoreria.reduce((a, m) => a + (Number(m.debito) || 0), 0)
        : movTesoreria.reduce((a, m) => a + (Number(m.credito) || 0), 0);
    if (movTesoreria.length === 0) {
      return NextResponse.json(
        {
          error: `El asiento no mueve la cuenta de tesorería ${cuentaPuc}. Un comprobante de ${comprobante.tipo} tiene que registrar el dinero que ${comprobante.tipo === "ingreso" ? "entró" : "salió"}.`,
        },
        { status: 400 }
      );
    }
    if (movido + 0.01 < neto) {
      return NextResponse.json(
        {
          error: `El asiento mueve ${movido.toFixed(2)} en la cuenta de tesorería, pero el comprobante declara ${neto.toFixed(2)}. Deben coincidir.`,
        },
        { status: 400 }
      );
    }
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
      const consecutivo = await siguienteConsecutivo(tx, {
        usuarioId: sesion.id,
        tipo: comprobante.tipo,
        anio,
        semilla: async () => {
          const agg = await tx.comprobanteTesoreria.aggregate({
            where: { usuarioId: sesion.id, tipo: comprobante.tipo, anio },
            _max: { consecutivo: true },
          });
          return Number(agg._max.consecutivo || 0);
        },
      });
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
              // NORMALIZADO, como en `asientoAutomatico`. Guardarlo crudo partía al mismo
              // tercero en varias filas del libro auxiliar —"900.123.456-7" y "900123456" son
              // dos— y de ahí sale el formato 1001, que agrupa el año por documento.
              tercero: normalizarDocumento(comprobante.terceroDocumento).numero || null,
            })),
          },
        },
      });

      // Saldos de los documentos aplicados, y se REFRESCAN los saldos impresos: se
      // calcularon al crear el borrador, y si entre tanto se contabilizó otro comprobante el
      // papel diría "saldo antes 1.000.000" cuando en libros ya era 500.000.
      const refrescados = new Map(val.aplicaciones.map((a) => [a.facturaId || a.compraId, a]));
      for (const ap of comprobante.aplicaciones) {
        const actual = refrescados.get(ap.facturaId || ap.compraId);
        if (actual) {
          await tx.comprobanteAplicacion.update({
            where: { id: ap.id },
            data: { saldoAnterior: actual.saldoAnterior, saldoNuevo: actual.saldoNuevo },
          });
        }
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

      // Las retenciones del egreso van a la tabla unificada. Vinculantes solo si la política
      // dice que se registran al pagar: si se causan, la compra ya las registró y sumarlas
      // aquí certificaría el doble.
      //
      // En MODO IMPUTACIÓN no hay documento previo, así que este pago es el primer hecho y su
      // retención es siempre la que se certifica, sin mirar la política. Se logra pasando
      // `causadas: false`, que es lo que hace `vinculante: !causadas` dar true.
      const causadasParaRetencion =
        comprobante.modo === "imputacion" ? false : mapa.retencionesEnCausacion !== false;
      await registrarRetencionesDeComprobante(tx, sesion.id, { ...comprobante, numero }, causadasParaRetencion);

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

async function anular(comprobante, sesion, body) {
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
    data: {
      estado: "anulado",
      motivoAnulacion: (body.motivo || "").trim() || null,
      anuladoPor: sesion.nombreCompleto || sesion.email,
      fechaAnulacion: hoyBogota(),
    },
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
  // Reversar una reversión encadena asientos sin mover saldos (el reversor no aplica a
  // documentos) y enreda la trazabilidad. Si hay que volver a registrar el movimiento, se
  // emite uno nuevo.
  if (comprobante.reversaAId) {
    return NextResponse.json(
      {
        error:
          "Este comprobante ya es la reversión de otro y no se reversa. Si el movimiento debe registrarse de nuevo, emite un comprobante nuevo.",
      },
      { status: 400 }
    );
  }

  // ORDEN DE DESHACER: en sentido inverso a la creación. Si este pago ya se legalizó con un
  // documento soporte, ese soporte se apoya en él —nació de su información y cancela su
  // anticipo—, así que hay que anularlo primero. Reversar el pago dejándolo vivo produciría un
  // documento fiscal que soporta un pago que ya no existe.
  const soporteVivo = await prisma.documentoSoporte.findFirst({
    where: {
      usuarioId: sesion.id,
      generadoDesdeComprobanteId: comprobante.id,
      estado: { not: "Anulado" },
    },
    select: { numero: true },
  });
  if (soporteVivo) {
    return NextResponse.json(
      {
        error: `Este pago ya se legalizó con el documento soporte ${soporteVivo.numero}. Anula primero el documento soporte.`,
      },
      { status: 409 }
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
    const consecutivo = await siguienteConsecutivo(tx, {
      usuarioId: sesion.id,
      tipo: comprobante.tipo,
      anio,
      semilla: async () => {
        const agg = await tx.comprobanteTesoreria.aggregate({
          where: { usuarioId: sesion.id, tipo: comprobante.tipo, anio },
          _max: { consecutivo: true },
        });
        return Number(agg._max.consecutivo || 0);
      },
    });
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

    // Un comprobante reversado ya no practicó nada: sus retenciones salen de la tabla. Con la
    // política estándar eran informativas y da igual, pero con la política de registrarlas al
    // pagar eran las vinculantes y se seguirían certificando.
    await borrarRetencionesDe(tx, { comprobanteId: comprobante.id });

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
