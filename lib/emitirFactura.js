// EL ÚNICO camino por el que se emite una factura de venta.
//
// POR QUÉ ESTO ES UNA FUNCIÓN Y NO EL CUERPO DE UN ENDPOINT. Aquí viven los guardas que
// protegen la numeración autorizada por la DIAN: el consecutivo leído e incrementado de forma
// atómica, el rango de la resolución, su vigencia y el recálculo autoritativo de los montos.
// Al agregar la emisión desde un borrador aparecía un segundo endpoint que necesitaba lo
// mismo, y copiar esos guardas era la peor idea posible en este módulo: la copia se desactualiza
// y el día que se corrija uno solo, el otro sigue emitiendo con resolución vencida. Los dos
// caminos —`POST /api/facturas` y la emisión de un borrador— entran por aquí.
//
// Lo que este archivo NO hace: confiar en el cliente. `entrada` son los INSUMOS (cliente,
// ítems, descuentos); las tarifas salen del catálogo, el IVA de la configuración del emisor y
// los totales de `calcularFactura`. Un borrador guardado hace un mes se liquida con las
// tarifas de HOY, no con las que se guardaron.

import { prisma } from "@/lib/prisma";
import { calcularFactura } from "@/lib/facturaCalc";
import { validarFactura } from "@/lib/facturaValidation";
import { hoyBogota } from "@/lib/fechas";
import { contabilizarYEnlazar } from "@/lib/asientoAutomatico";

/** Error de emisión con código, para que el endpoint lo traduzca a un mensaje y un status. */
class ErrorEmision extends Error {
  constructor(code, extra = {}) {
    super(code);
    this.code = code;
    Object.assign(this, extra);
  }
}

/**
 * Contabiliza un documento ya confirmado sin que un fallo suyo tumbe la operación.
 *
 * Va en su propia transacción y a prueba de excepciones: si algo sale mal, el documento se
 * queda con `asientoId: null` y aparece en Contabilidad como pendiente por contabilizar.
 */
async function contabilizarSinRomper(usuarioId, factura) {
  try {
    const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId } });
    return await prisma.$transaction((tx) =>
      contabilizarYEnlazar(tx, { usuarioId, tipo: "factura", documento: factura, mapa })
    );
  } catch (e) {
    return { faltantes: [`No se pudo contabilizar automáticamente: ${e.message}`] };
  }
}

/**
 * Resuelve los insumos y liquida la factura SIN emitirla: no toca el consecutivo ni escribe
 * nada. Es lo que usan la vista previa de un borrador y el propio `emitirFactura`, para que la
 * cifra que se muestra antes de emitir salga del mismo cálculo que la que se emite.
 *
 * Lanza `ErrorEmision` con los mismos códigos que la emisión, así que un borrador que no se
 * puede emitir lo dice al abrirlo y no al final.
 */
export async function liquidarFactura({ usuarioId, entrada }) {
  const { errors } = validarFactura(entrada);
  if (errors.length) throw new ErrorEmision("VALIDACION", { errors });

  const cliente = await prisma.cliente.findUnique({ where: { id: entrada.clienteId } });
  if (!cliente || cliente.usuarioId !== usuarioId) throw new ErrorEmision("CLIENTE_INVALIDO");

  const items = entrada.items;
  const ids = [...new Set(items.map((i) => i.productoId).filter(Boolean))];
  // Se traen los impuestos del catálogo: la tarifa la fija la norma, no el cliente HTTP.
  const productos = await prisma.producto.findMany({
    where: { id: { in: ids }, usuarioId },
    include: { impuestos: { include: { impuesto: true } } },
  });
  const productosPorId = Object.fromEntries(productos.map((p) => [p.id, p]));
  const faltante = items.find((i) => !productosPorId[i.productoId]);
  if (faltante) throw new ErrorEmision("PRODUCTO_INVALIDO");

  // La configuración define si el emisor cobra IVA y la resolución DIAN vigente.
  const config = await prisma.configFacturacion.findUnique({ where: { usuarioId } });
  if (!config || config.numeracionActual == null) throw new ErrorEmision("SIN_CONFIG");

  const fecha = entrada.fecha || hoyBogota();

  let calc;
  try {
    calc = calcularFactura({
      cliente,
      productosPorId,
      items,
      emisorResponsableIva: config.responsableIva,
      descuentoGlobalPorcentaje: Number(entrada.descuentoGlobalPorcentaje) || 0,
      reteIvaPorcentaje: Number(entrada.reteIvaPorcentaje) || 0,
      reteIcaPorMil: Number(entrada.reteIcaPorMil) || 0,
    });
  } catch (e) {
    if (e.code === "CONCEPTO_RETENCION_INVALIDO")
      throw new ErrorEmision("CONCEPTO_RETENCION_INVALIDO", { detalle: e.message });
    throw e;
  }

  // Los instrumentos de cobro deben cuadrar con el total a cobrar (cálculo autoritativo).
  const instrumentos = Array.isArray(entrada.instrumentos) ? entrada.instrumentos : [];
  if (instrumentos.length) {
    const suma = instrumentos.reduce((a, x) => a + (Number(x.valor) || 0), 0);
    if (Math.abs(suma - Number(calc.totalACobrar)) > 1) throw new ErrorEmision("INSTRUMENTOS");
  }

  return { calc, cliente, config, fecha, instrumentos };
}

/**
 * Emite la factura: asigna consecutivo, la persiste y la contabiliza.
 *
 * @param usuarioId  dueño de todo (el alcance del sistema es por usuario)
 * @param entrada    insumos: clienteId, items[], fecha, descuentos, retenciones, instrumentos
 * @param alEmitir   callback opcional `(tx, factura) => Promise`, ejecutado DENTRO de la misma
 *                   transacción que crea la factura. Lo usa la emisión desde un borrador para
 *                   marcarlo como emitido: si quedara fuera, un fallo entre las dos operaciones
 *                   dejaría un consecutivo DIAN quemado y un borrador todavía emitible.
 */
export async function emitirFactura({ usuarioId, entrada, alEmitir }) {
  const { calc, cliente, fecha, instrumentos } = await liquidarFactura({ usuarioId, entrada });

  const factura = await prisma.$transaction(async (tx) => {
    // Se relee dentro de la transacción: el consecutivo debe leerse e incrementarse de forma atómica.
    const cfg = await tx.configFacturacion.findUnique({ where: { usuarioId } });
    if (!cfg || cfg.numeracionActual == null) throw new ErrorEmision("SIN_CONFIG");
    // La numeración debe estar dentro del rango autorizado...
    if (cfg.numeracionHasta != null && cfg.numeracionActual > cfg.numeracionHasta)
      throw new ErrorEmision("RANGO");
    // ...y la fecha de emisión debe caer dentro de la vigencia de la resolución.
    // Falla CERRADO: si la config no tiene vigencia, no se emite. Tratar "falta el dato" como
    // "no hay nada que validar" es justo lo que permitía facturar con resolución vencida.
    if (!cfg.resFecha || !cfg.resVencimiento) throw new ErrorEmision("SIN_VIGENCIA");
    if (fecha > cfg.resVencimiento)
      throw new ErrorEmision("VENCIDA", { vencimiento: cfg.resVencimiento });
    if (fecha < cfg.resFecha) throw new ErrorEmision("ANTES_DE_RESOLUCION", { desde: cfg.resFecha });

    const numero = cfg.numeracionActual;
    // El prefijo es el autorizado en la resolución; si no hay, la numeración va sin prefijo.
    // Inventar uno emitiría un número fuera de la numeración autorizada.
    const prefijo = cfg.prefijo || "";
    const consecutivo = String(numero).padStart(5, "0");
    const numeroCompleto = prefijo ? `${prefijo}-${consecutivo}` : consecutivo;

    await tx.configFacturacion.update({
      where: { usuarioId },
      data: { numeracionActual: numero + 1 },
    });

    const creada = await tx.factura.create({
      data: {
        usuarioId,
        numero,
        prefijo,
        numeroCompleto,
        fecha,
        fechaVencimiento: entrada.fechaVencimiento || null,
        formaPago: entrada.formaPago || null,
        medioPago: entrada.medioPago || instrumentos[0]?.medio || null,
        instrumentos: instrumentos.length
          ? instrumentos.map((x) => ({
              medio: String(x.medio),
              banco: x.banco || null,
              referencia: x.referencia || null,
              valor: Number(x.valor) || 0,
            }))
          : null,
        observaciones: (entrada.observaciones || "").trim() || null,
        estado: "emitida",
        // Snapshot del cliente
        clienteId: cliente.id,
        clienteNombre: cliente.nombreCompleto,
        clienteTipo: cliente.tipo,
        clienteTipoDocumento: cliente.tipo === "natural" ? cliente.tipoDocumento : "NIT",
        clienteNumeroDocumento: cliente.tipo === "natural" ? cliente.numeroDocumento : cliente.nit,
        clienteDv: cliente.dv || null,
        clienteTelefono: cliente.telefono || null,
        clienteEmail: cliente.email || null,
        clienteDireccion: cliente.direccion || null,
        clienteEsAgenteRetenedor: cliente.esAgenteRetenedor,
        clienteEsAutorretenedor: cliente.esAutorretenedor,
        // Totales
        subtotal: calc.subtotal,
        // Desglose por tratamiento de IVA (renglones de la declaración)
        baseGravada: calc.baseGravada,
        baseExenta: calc.baseExenta,
        baseExcluida: calc.baseExcluida,
        baseNoResponsable: calc.baseNoResponsable,
        baseSinClasificar: calc.baseSinClasificar,
        totalDescuentos: calc.totalDescuentos,
        // IVA e INC separados: el INC no es IVA, no es descontable y se declara aparte.
        iva: calc.totalIva,
        inc: calc.totalInc,
        otrosImpuestos: calc.totalOtrosImpuestos,
        retenciones: calc.totalRetenciones,
        reteIva: calc.reteIva,
        reteIca: calc.reteIca,
        total: calc.total,
        totalACobrar: calc.totalACobrar,
        retencionesPorConcepto: calc.retencionesPorConcepto,
        retencionesFiscales: calc.retencionesFiscales,
        // Snapshot del emisor (debe permitir reconstruir la representación gráfica histórica)
        emisorRazonSocial: cfg.razonSocial,
        emisorNit: cfg.nit,
        emisorRegimen: cfg.regimen,
        emisorSnapshot: {
          razonSocial: cfg.razonSocial,
          nit: cfg.nit,
          regimen: cfg.regimen,
          responsableIva: cfg.responsableIva,
          direccion: cfg.direccion,
          ciudad: cfg.ciudad,
          telefono: cfg.telefono,
          email: cfg.email,
          actividadEconomica: cfg.actividadEconomica,
          resNumero: cfg.resNumero,
          resFecha: cfg.resFecha,
          resVencimiento: cfg.resVencimiento,
          prefijo: cfg.prefijo,
          numeracionDesde: cfg.numeracionDesde,
          numeracionHasta: cfg.numeracionHasta,
          pieFact: cfg.pieFact,
        },
        // Cada línea con sus impuestos como filas hijas (un `TaxSubtotal` de UBL por
        // impuesto), para poder emitir la factura electrónica sin reconstruir el cálculo.
        items: {
          create: calc.lineas.map(({ impuestos, ...linea }) => ({
            ...linea,
            impuestos: { create: impuestos },
          })),
        },
      },
      include: { items: { include: { impuestos: true } } },
    });

    // Dentro de la transacción a propósito: ver el comentario del parámetro.
    if (alEmitir) await alEmitir(tx, creada);

    return creada;
  });

  // La venta entra al libro diario DESPUÉS de confirmar la factura, en su propia
  // transacción. No dentro: un fallo al contabilizar reventaría la transacción que ya
  // consumió el consecutivo DIAN —Postgres aborta la transacción entera ante el primer
  // error, así que un try/catch dentro no la salvaría— y el usuario perdería una factura
  // válida por una cuenta mal configurada. Contabilizar es consecuencia de emitir; no puede
  // impedir la emisión. Si falla, la factura queda pendiente por contabilizar y visible.
  const contabilizacion = await contabilizarSinRomper(usuarioId, factura);

  return { factura: { ...factura, asientoId: contabilizacion.asiento?.id || null }, contabilizacion };
}

/**
 * Traduce un error de emisión a `{ error, status }`. Devuelve `null` si el error no es de
 * emisión, para que el endpoint lo deje propagar en vez de tragárselo.
 *
 * Los mensajes viven aquí y no en cada endpoint: son los que le dicen al usuario por qué NO se
 * pudo facturar, y tienen que ser los mismos venga de donde venga la emisión.
 */
export function errorDeEmision(e) {
  switch (e?.code) {
    case "VALIDACION":
      return { error: e.errors[0], errores: e.errors, status: 400 };
    case "CLIENTE_INVALIDO":
      return { error: "Cliente no válido.", status: 400 };
    case "PRODUCTO_INVALIDO":
      return {
        error:
          "Algún producto del documento ya no existe o no es válido. Revísalo antes de facturar.",
        status: 400,
      };
    case "CONCEPTO_RETENCION_INVALIDO":
      return { error: `${e.detalle} Corrige el producto antes de facturar.`, status: 400 };
    case "INSTRUMENTOS":
      return {
        error: "Los medios de pago registrados no cuadran con el total a cobrar.",
        status: 400,
      };
    case "SIN_CONFIG":
      return { error: "Configura la facturación (resolución DIAN) antes de emitir.", status: 400 };
    case "RANGO":
      return {
        error:
          "Se agotó el rango de numeración de la resolución. Solicita una nueva resolución a la DIAN.",
        status: 400,
      };
    case "VENCIDA":
      return {
        error: `La resolución DIAN venció el ${e.vencimiento}. No se puede emitir con una resolución vencida; solicita una nueva.`,
        status: 400,
      };
    case "SIN_VIGENCIA":
      return {
        error:
          "La configuración de facturación no tiene la vigencia de la resolución DIAN (fecha de expedición y vencimiento). Complétala antes de emitir.",
        status: 400,
      };
    case "ANTES_DE_RESOLUCION":
      return {
        error: `La fecha de emisión es anterior a la resolución DIAN (expedida el ${e.desde}). No se puede facturar antes de su vigencia.`,
        status: 400,
      };
    case "P2002":
      return { error: "Conflicto de numeración, intente de nuevo.", status: 409 };
    default:
      return null;
  }
}
