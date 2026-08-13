import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { prepararSoporteDesdeEgreso } from "@/lib/soporteDesdeComprobante";
import { siguienteConsecutivo, numeroFinal } from "@/lib/consecutivos";
import { registrarRetencionesDeSoporte } from "@/lib/retencionesDeDocumentos";
import { contabilizarYEnlazar } from "@/lib/asientoAutomatico";

// Legalizar un comprobante de egreso con un DOCUMENTO SOPORTE.
//
// GET  → vista previa: qué datos heredaría, qué falta y qué advertir. No crea nada.
// POST → lo genera.

async function cargar(id, usuarioId) {
  const comprobante = await prisma.comprobanteTesoreria.findFirst({
    where: { id, usuarioId },
    include: { retenciones: true },
  });
  if (!comprobante) return {};
  const soporte = await prisma.documentoSoporte.findFirst({
    where: { usuarioId, generadoDesdeComprobanteId: id, estado: { not: "Anulado" } },
    select: { id: true, numero: true, fecha: true, bruto: true, neto: true },
  });
  return { comprobante, soporte };
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const { comprobante, soporte } = await cargar(id, sesion.id);
  if (!comprobante) return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });

  const { datos, errors, avisos } = prepararSoporteDesdeEgreso(comprobante, {}, soporte);
  return NextResponse.json({
    // Si ya existe, la pantalla muestra el enlace en vez del formulario.
    soporteExistente: soporte || null,
    propuesta: datos || null,
    errores: errors,
    avisos,
  });
}

export async function POST(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  let body = {};
  try {
    body = await request.json();
  } catch {
    /* opcional */
  }

  const { comprobante, soporte } = await cargar(id, sesion.id);
  if (!comprobante) return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });

  const { datos, errors, avisos } = prepararSoporteDesdeEgreso(comprobante, body, soporte);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const tipoDoc = ["NIT", "CC", "CE", "PA", "TI"].includes(body.proveedorTipoDocumento)
    ? body.proveedorTipoDocumento
    : "CC"; // el documento soporte es para no obligados: casi siempre personas naturales

  const anio = Number(datos.fecha.slice(0, 4));
  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId: sesion.id } });

  try {
    const creado = await prisma.$transaction(async (tx) => {
      const consecutivo = await siguienteConsecutivo(tx, {
        usuarioId: sesion.id,
        tipo: "documento_soporte",
        anio,
        semilla: async () => {
          const previos = await tx.documentoSoporte.findMany({
            where: { usuarioId: sesion.id },
            select: { numero: true },
          });
          return previos.reduce((max, x) => Math.max(max, numeroFinal(x.numero)), 0);
        },
      });
      const numero = `DS-${anio}-${String(consecutivo).padStart(4, "0")}`;

      const nuevo = await tx.documentoSoporte.create({
        data: { ...datos, proveedorTipoDocumento: tipoDoc, numero, usuarioId: sesion.id },
      });

      // Las retenciones se registran INFORMATIVAS: el comprobante ya escribió la línea que se
      // certifica. `registrarRetencionesDeSoporte` lo deduce de `generadoDesdeComprobanteId`.
      await registrarRetencionesDeSoporte(tx, sesion.id, nuevo);

      // El pago ya salió y quedó en anticipos por legalizar; este asiento reconoce el gasto y
      // cancela ese anticipo.
      const contab = await contabilizarYEnlazar(tx, {
        usuarioId: sesion.id,
        tipo: "documento_soporte",
        documento: nuevo,
        mapa,
      });

      // Y el comprobante queda aplicado al soporte: es lo que deja el enlace navegable en los
      // dos sentidos y lo que impide reversar el pago dejando el soporte huérfano.
      await tx.comprobanteAplicacion.create({
        data: {
          comprobanteId: comprobante.id,
          documentoSoporteId: nuevo.id,
          docRef: numero,
          valorDocumento: nuevo.neto,
          saldoAnterior: nuevo.neto,
          valorAplicado: nuevo.neto,
          saldoNuevo: 0,
        },
      });

      return { ...nuevo, contabilizacion: contab };
    });

    return NextResponse.json({ soporte: creado, avisos }, { status: 201 });
  } catch (e) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Conflicto de numeración, intenta de nuevo." }, { status: 409 });
    }
    throw e;
  }
}
