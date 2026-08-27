// Extractos de información exógena, con las columnas del layout oficial.
//
// QUÉ SON Y QUÉ NO SON. Son un BORRADOR PARA REVISIÓN del contador, no el archivo que se
// presenta. Salen con las columnas y en el orden del layout para poder pegarlos en el
// PREVALIDADOR de la DIAN, que es quien genera el XML. Nosotros no serializamos XML: son quince
// esquemas que cambian cada año —para el AG 2025 la resolución se modificó cuatro veces— y un
// XML mal versionado se rechaza, y un rechazo cuenta como no presentado.
//
// SOLO CUATRO FORMATOS, y a propósito. 1003, 1005, 1006 y 1007 son los que el modelo de datos
// puede alimentar de verdad. El 1001 NO está aquí: no se deriva de las retenciones sino del
// gasto, y necesita un mapa cuenta PUC → concepto que todavía no existe (un pago que no llega a
// la base mínima no genera retención y aun así se reporta). Sacar un 1001 incompleto sería peor
// que no sacarlo: el art. 651 E.T. sanciona la información errónea, y un archivo que sale del
// software con aire de oficial se presenta sin que nadie lo vuelva a mirar.
//
// CADA EXTRACTO LLEVA SUS AVISOS. Lo que el sistema no puede llenar se dice en la hoja LÉEME
// del propio archivo, no solo en la pantalla: el archivo viaja y la pantalla no.

import { prisma } from "@/lib/prisma";
import { normalizarDocumento } from "@/lib/retencionesPracticadas";
import { codigoDianDesdeTexto } from "@/lib/data/tiposDocumentoDian";
import { CODIGO_PAIS_COLOMBIA } from "@/lib/data/dane";
import {
  CATEGORIA_A_1003,
  CONCEPTO_RETEIVA_1003,
  CONCEPTO_1007_POR_DEFECTO,
} from "@/lib/data/conceptosExogena";
import { buscarConcepto } from "@/lib/conceptosRetencion";

const n2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const rango = (anio) => ({ gte: `${anio}-01-01`, lte: `${anio}-12-31` });

/** Identificación de un cliente, en las columnas que espera cualquier formato. */
function identidadDeCliente(c) {
  const esNatural = c.tipo === "natural";
  const { numero, dv } = normalizarDocumento(esNatural ? c.numeroDocumento : c.nit);
  return {
    tipoDocumento: c.tipoDocumentoDian || codigoDianDesdeTexto(esNatural ? c.tipoDocumento : "NIT") || "",
    documento: numero || "",
    dv: c.dv || dv || "",
    primerApellido: c.primerApellido || "",
    segundoApellido: c.segundoApellido || "",
    primerNombre: c.primerNombre || "",
    otrosNombres: c.otrosNombres || "",
    razonSocial: esNatural ? "" : c.razonSocial || c.nombreCompleto || "",
    direccion: c.direccion || "",
    codigoDepartamento: c.codigoDepartamento || "",
    codigoMunicipio: c.codigoMunicipio || "",
    codigoPais: c.codigoPais || "",
  };
}

/** Identificación de un tercero del registro. */
function identidadDeTercero(t) {
  if (!t) return null;
  return {
    tipoDocumento: t.tipoDocumentoDian || "",
    documento: t.documento || "",
    dv: t.dv || "",
    primerApellido: t.primerApellido || "",
    segundoApellido: t.segundoApellido || "",
    primerNombre: t.primerNombre || "",
    otrosNombres: t.otrosNombres || "",
    razonSocial: t.tipo === "natural" ? "" : t.razonSocial || t.nombre || "",
    direccion: t.direccion || "",
    codigoDepartamento: t.codigoDepartamento || "",
    codigoMunicipio: t.codigoMunicipio || "",
    codigoPais: t.codigoPais || "",
  };
}

// ============================ 1003 — retenciones que nos practicaron ============================
//
// Sale de las facturas de venta: lo que el CLIENTE nos retuvo. Se agrupa por (tercero, concepto),
// que es como lo pide el formato — el concepto sale de `retencionesPorConcepto`, que la factura
// ya guarda.
async function formato1003(usuarioId, anio) {
  const facturas = await prisma.factura.findMany({
    where: { usuarioId, estado: "emitida", fecha: rango(anio) },
    select: {
      clienteId: true,
      retenciones: true,
      reteIva: true,
      reteIca: true,
      iva: true,
      subtotal: true,
      retencionesPorConcepto: true,
    },
  });

  const clientes = await prisma.cliente.findMany({ where: { usuarioId } });
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const acc = new Map(); // clave: documento|concepto
  const sumar = (cliente, concepto, base, valor) => {
    if (!(valor > 0)) return;
    const ident = identidadDeCliente(cliente);
    const clave = `${ident.documento}|${concepto}`;
    if (!acc.has(clave)) acc.set(clave, { ...ident, concepto, base: 0, valor: 0 });
    const a = acc.get(clave);
    a.base += Number(base) || 0;
    a.valor += Number(valor) || 0;
  };

  let sinConcepto = 0;
  let conReteIca = 0;

  for (const f of facturas) {
    const cliente = porId[f.clienteId];
    if (!cliente) continue;

    // ReteFuente, desglosada por concepto. `retencionesPorConcepto` guarda base y valor de cada
    // uno, así que no hay que repartir nada a ojo.
    const detalle = Array.isArray(f.retencionesPorConcepto) ? f.retencionesPorConcepto : [];
    if (detalle.length) {
      for (const d of detalle) {
        const interno = buscarConcepto(d.concepto);
        const cod = CATEGORIA_A_1003[interno?.categoria] || "1308";
        if (!interno) sinConcepto += 1;
        sumar(cliente, cod, d.base, d.valor);
      }
    } else if (Number(f.retenciones) > 0) {
      // Factura antigua sin desglose: cae a "otros conceptos" y se avisa, en vez de repartirla.
      sinConcepto += 1;
      sumar(cliente, "1308", f.subtotal, f.retenciones);
    }

    // ReteIVA tiene concepto propio. Su base es el IVA, no el subtotal.
    sumar(cliente, CONCEPTO_RETEIVA_1003, f.iva, f.reteIva);

    if (Number(f.reteIca) > 0) conReteIca += 1;
  }

  const avisos = [];
  if (sinConcepto)
    avisos.push(
      `${sinConcepto} retención(es) sin concepto reconocido se agruparon en el 1308 "otros conceptos". Revísalas: el concepto correcto lo decide la naturaleza del pago.`
    );
  if (conReteIca)
    avisos.push(
      `${conReteIca} factura(s) tienen ReteICA y NO se incluyeron: el ICA es un tributo municipal, se declara ante el municipio y el formato 1003 no tiene concepto para él.`
    );

  return {
    columnas: [
      { key: "concepto", header: "Concepto", width: 10 },
      { key: "tipoDocumento", header: "Tipo de documento", width: 16 },
      { key: "documento", header: "Número identificación del informado", width: 22 },
      { key: "dv", header: "DV", width: 6 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "direccion", header: "Dirección", width: 30 },
      { key: "codigoDepartamento", header: "Código del Departamento", width: 18 },
      { key: "codigoMunicipio", header: "Código del Municipio", width: 18 },
      { key: "base", header: "Valor acumulado del pago o abono sujeto a Retención en la fuente", width: 26 },
      { key: "valor", header: "Retención que le practicaron", width: 22 },
    ],
    filas: [...acc.values()]
      .map((a) => ({ ...a, base: n2(a.base), valor: n2(a.valor) }))
      .sort((x, y) => x.concepto.localeCompare(y.concepto) || x.documento.localeCompare(y.documento)),
    avisos,
  };
}

// ============================ 1006 — IVA generado e INC ============================
async function formato1006(usuarioId, anio) {
  const facturas = await prisma.factura.findMany({
    where: { usuarioId, estado: "emitida", fecha: rango(anio) },
    select: { clienteId: true, iva: true, inc: true },
  });
  const clientes = await prisma.cliente.findMany({ where: { usuarioId } });
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const acc = new Map();
  for (const f of facturas) {
    const cliente = porId[f.clienteId];
    if (!cliente) continue;
    const ident = identidadDeCliente(cliente);
    if (!acc.has(ident.documento))
      acc.set(ident.documento, { ...ident, generado: 0, recuperado: 0, consumo: 0 });
    const a = acc.get(ident.documento);
    a.generado += Number(f.iva) || 0;
    a.consumo += Number(f.inc) || 0;
  }

  return {
    columnas: [
      { key: "tipoDocumento", header: "Tipo de Documento", width: 16 },
      { key: "documento", header: "Número identificación", width: 22 },
      { key: "dv", header: "DV", width: 6 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "generado", header: "Impuesto generado", width: 20 },
      { key: "recuperado", header: "IVA recuperado en devoluciones en compras anuladas, rescindidas o resueltas", width: 26 },
      { key: "consumo", header: "Impuesto al consumo", width: 20 },
    ],
    filas: [...acc.values()]
      .filter((a) => a.generado > 0 || a.consumo > 0)
      .map((a) => ({ ...a, generado: n2(a.generado), consumo: n2(a.consumo), recuperado: 0 }))
      .sort((x, y) => x.documento.localeCompare(y.documento)),
    avisos: [
      'La columna "IVA recuperado en devoluciones en compras anuladas" va en CERO: el sistema no registra anulación de compras con recuperación de IVA. Si hubo, hay que agregarlo a mano.',
    ],
  };
}

// ============================ 1005 — IVA descontable ============================
async function formato1005(usuarioId, anio) {
  const compras = await prisma.compra.findMany({
    where: { usuarioId, fecha: rango(anio) },
    select: { totalIva: true, tercero: true, proveedorNombre: true, proveedorNit: true },
  });

  const acc = new Map();
  let sinFicha = 0;
  for (const c of compras) {
    const ident = identidadDeTercero(c.tercero);
    if (!ident || !ident.documento) {
      sinFicha += 1;
      continue;
    }
    if (!acc.has(ident.documento))
      acc.set(ident.documento, { ...ident, descontable: 0, devoluciones: 0, mayorValor: 0 });
    acc.get(ident.documento).descontable += Number(c.totalIva) || 0;
  }

  const avisos = [
    'Las columnas "IVA por devoluciones en ventas anuladas" e "IVA tratado como mayor valor del costo (Art. 490 E.T.)" van en CERO: el sistema no distingue el IVA descontable del que se lleva al costo. Si la empresa tiene ingresos gravados y excluidos, el prorrateo del art. 490 hay que hacerlo aparte.',
    "No incluye los documentos soporte: el modelo no guarda IVA en ellos.",
  ];
  if (sinFicha)
    avisos.push(
      `${sinFicha} compra(s) sin ficha de tercero quedaron FUERA del extracto. Consolida los terceros en Configuración → Terceros y vuelve a generarlo.`
    );

  return {
    columnas: [
      { key: "tipoDocumento", header: "Tipo de documento", width: 16 },
      { key: "documento", header: "Número identificación", width: 22 },
      { key: "dv", header: "DV", width: 6 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "descontable", header: "Impuesto Descontable", width: 20 },
      { key: "devoluciones", header: "IVA resultante por devoluciones en ventas anuladas, rescindidas o resueltas", width: 26 },
      { key: "mayorValor", header: "IVA tratado como mayor valor del costo o gasto (Art. 490 E.T.)", width: 26 },
    ],
    filas: [...acc.values()]
      .filter((a) => a.descontable > 0)
      .map((a) => ({ ...a, descontable: n2(a.descontable), devoluciones: 0, mayorValor: 0 }))
      .sort((x, y) => x.documento.localeCompare(y.documento)),
    avisos,
  };
}

// ============================ 1007 — ingresos recibidos ============================
async function formato1007(usuarioId, anio) {
  const [facturas, notas, clientes] = await Promise.all([
    prisma.factura.findMany({
      where: { usuarioId, estado: "emitida", fecha: rango(anio) },
      select: { clienteId: true, subtotal: true },
    }),
    // Las notas se declaran en el periodo de SU fecha, así que se filtran por la suya.
    prisma.nota.findMany({
      where: { usuarioId, fecha: rango(anio) },
      select: { tipo: true, subtotal: true, factura: { select: { clienteId: true } } },
    }),
    prisma.cliente.findMany({ where: { usuarioId } }),
  ]);
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const acc = new Map();
  const tocar = (clienteId) => {
    const cliente = porId[clienteId];
    if (!cliente) return null;
    const ident = identidadDeCliente(cliente);
    if (!acc.has(ident.documento))
      acc.set(ident.documento, {
        ...ident,
        concepto: CONCEPTO_1007_POR_DEFECTO,
        pais: ident.codigoPais || CODIGO_PAIS_COLOMBIA,
        ingresos: 0,
        devoluciones: 0,
      });
    return acc.get(ident.documento);
  };

  for (const f of facturas) {
    const a = tocar(f.clienteId);
    if (a) a.ingresos += Number(f.subtotal) || 0;
  }
  // Solo las notas CRÉDITO restan: una nota débito aumenta el ingreso, no lo devuelve.
  let sinFactura = 0;
  for (const nt of notas) {
    if (!nt.factura?.clienteId) {
      sinFactura += 1;
      continue;
    }
    const a = tocar(nt.factura.clienteId);
    if (!a) continue;
    if (nt.tipo === "credito") a.devoluciones += Number(nt.subtotal) || 0;
    else a.ingresos += Number(nt.subtotal) || 0;
  }

  const avisos = [
    `Todos los ingresos se reportan con el concepto ${CONCEPTO_1007_POR_DEFECTO} (actividades ordinarias), que es lo que corresponde a la facturación de venta. Si hubo ingresos de otra naturaleza —rendimientos financieros, ganancias ocasionales— no salen de este módulo y hay que agregarlos.`,
    'El país va en 169 (Colombia) cuando el cliente no lo tiene definido. Revísalo si tienes clientes del exterior.',
  ];
  if (sinFactura)
    avisos.push(`${sinFactura} nota(s) sin factura asociada no se pudieron imputar a un tercero.`);

  return {
    columnas: [
      { key: "concepto", header: "Concepto", width: 10 },
      { key: "tipoDocumento", header: "Tipo de documento", width: 16 },
      { key: "documento", header: "Número identificación del informado", width: 22 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "pais", header: "País de residencia o domicilio", width: 18 },
      { key: "ingresos", header: "Ingresos brutos recibidos", width: 22 },
      { key: "devoluciones", header: "Devoluciones, rebajas y descuentos", width: 24 },
    ],
    filas: [...acc.values()]
      .filter((a) => a.ingresos > 0 || a.devoluciones > 0)
      .map((a) => ({ ...a, ingresos: n2(a.ingresos), devoluciones: n2(a.devoluciones) }))
      .sort((x, y) => x.documento.localeCompare(y.documento)),
    avisos,
  };
}

const GENERADORES = {
  1003: { fn: formato1003, nombre: "Retenciones en la fuente que le practicaron" },
  1005: { fn: formato1005, nombre: "Impuesto a las ventas por pagar (descontable)" },
  1006: { fn: formato1006, nombre: "Impuesto a las ventas por pagar (generado) e impuesto al consumo" },
  1007: { fn: formato1007, nombre: "Ingresos recibidos" },
};

export const FORMATOS_DISPONIBLES = Object.entries(GENERADORES).map(([numero, g]) => ({
  numero,
  nombre: g.nombre,
}));

/**
 * Genera un extracto. Devuelve `{ numero, nombre, columnas, filas, avisos, incompletos }`.
 *
 * `incompletos` cuenta las filas a las que les falta identificación: son las que el prevalidador
 * va a rechazar, y conviene saberlo ANTES de pegarlas ahí.
 */
export async function generarFormato(usuarioId, numero, anio) {
  const g = GENERADORES[numero];
  if (!g) return null;

  const r = await g.fn(usuarioId, anio);
  const incompletos = r.filas.filter(
    (f) => !f.documento || !f.tipoDocumento || (!f.razonSocial && !f.primerApellido)
  ).length;

  return { numero: String(numero), nombre: g.nombre, anio, ...r, incompletos };
}
