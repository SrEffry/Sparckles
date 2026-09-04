// Formato 1001 — pagos o abonos en cuenta y retenciones practicadas.
//
// ES EL FORMATO MÁS GRANDE Y EL QUE MÁS SE EQUIVOCA. Se deriva del LIBRO AUXILIAR por cuenta y
// tercero, NO de `RetencionPracticada`, y esa es la decisión que lo hace correcto:
//
//   Una compra de $400.000 a un proveedor declarante no llega a la base mínima, así que **no
//   genera retención** y `RetencionPracticada` no escribe ninguna fila. Pero $400.000 superan
//   las 3 UVT del formato, así que **sí hay que reportarla**. Un 1001 armado desde las
//   retenciones la pierde entera, y con ella todos los pagos pequeños del año.
//
// `AsientoMovimiento` ya guarda `cuenta` y `tercero` normalizado, que es exactamente lo que el
// formato agrupa: pago por tercero y por concepto. El concepto sale de la cuenta
// (`MAPA_CUENTA_1001`).
//
// ⚠️ LO QUE ESTE EXTRACTO NO PUEDE DECIDIR SOLO, y por eso lo avisa:
//   · **Deducible o no deducible** (columnas 12 y 13). Un pago sin soporte válido no es
//     deducible (art. 771-2 E.T.), pero el sistema no sabe si el soporte existe: todo sale como
//     DEDUCIBLE y el LÉEME lo dice. Es el juicio del contador, no un dato del software.
//   · **El IVA mayor valor del costo** (columnas 14 y 15) va en CERO: el sistema no distingue
//     el IVA descontable del que se lleva al costo, que es el mismo hueco del art. 490 del 1005.
//   · **La clasificación por cuenta** es un punto de partida sobre el PUC cargado. Lo que no
//     encaja cae en 5016 y se cuenta.

import { prisma } from "@/lib/prisma";
import {
  concepto1001DeCuenta,
  CONCEPTO_1001_POR_DEFECTO,
  CATEGORIA_RETENCION_A_1001,
} from "@/lib/data/conceptos1001";
import { buscarConcepto } from "@/lib/conceptosRetencion";

const n2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Cuentas cuyo DÉBITO representa un pago o abono en cuenta a un tercero.
 *
 * Se toman las clases de GASTO (5, 7), COSTO (6), INVENTARIO (14) y ACTIVO FIJO (15). Se dejan
 * fuera a propósito la cartera, la tesorería y las cuentas de impuestos: el débito a bancos no
 * es un pago a un tercero, es el cobro de uno.
 */
const cuentaReportable = (c) => /^(5|6|7|14|15)/.test((c || "").toString());

/**
 * Filas del 1001 para un año gravable.
 *
 * @returns {{ columnas, filas, avisos, incompletos }}
 */
export async function generar1001(usuarioId, anio) {
  const enElAnio = { gte: `${anio}-01-01`, lte: `${anio}-12-31` };

  const [movimientos, terceros, retenciones] = await Promise.all([
    // Solo asientos VIGENTES del año. Un asiento reversado ya trae su contraasiento, así que la
    // suma neta por cuenta y tercero es la correcta sin filtrar nada más.
    prisma.asientoMovimiento.findMany({
      where: {
        tercero: { not: null },
        asiento: { usuarioId, fecha: enElAnio },
      },
      select: { cuenta: true, tercero: true, debito: true, credito: true },
    }),
    prisma.tercero.findMany({ where: { usuarioId } }),
    // Las retenciones que NOSOTROS practicamos. Solo las vinculantes: `MapaCuentas
    // .retencionesEnCausacion` decide si la fila válida es la de la causación o la del pago, y
    // contar las dos duplicaría el valor certificado.
    prisma.retencionPracticada.findMany({
      where: { usuarioId, fecha: enElAnio, vinculante: true },
      select: {
        tipo: true,
        // `conceptoCodigo` es el id de la tabla de retefuente; `concepto` no existe.
        conceptoCodigo: true,
        valor: true,
        terceroNumeroDocumento: true,
      },
    }),
  ]);

  const porDocumento = new Map(terceros.map((t) => [t.documento, t]));

  // clave: documento|concepto
  const acc = new Map();
  const fila = (documento, concepto) => {
    const clave = `${documento}|${concepto}`;
    if (!acc.has(clave)) {
      const t = porDocumento.get(documento);
      acc.set(clave, {
        concepto,
        tipoDocumento: t?.tipoDocumentoDian || "",
        documento,
        primerApellido: t?.primerApellido || "",
        segundoApellido: t?.segundoApellido || "",
        primerNombre: t?.primerNombre || "",
        otrosNombres: t?.otrosNombres || "",
        razonSocial: t?.tipo === "natural" ? "" : t?.razonSocial || t?.nombre || "",
        direccion: t?.direccion || "",
        codigoDepartamento: t?.codigoDepartamento || "",
        codigoMunicipio: t?.codigoMunicipio || "",
        pais: t?.codigoPais || "",
        deducible: 0,
        noDeducible: 0,
        ivaMayorValorDeducible: 0,
        ivaMayorValorNoDeducible: 0,
        retencionRenta: 0,
        retencionAsumida: 0,
        retencionIvaResponsables: 0,
        retencionIvaNoResidentes: 0,
        sinFicha: !t,
      });
    }
    return acc.get(clave);
  };

  let sinClasificar = 0;
  let sinTercero = 0;

  for (const m of movimientos) {
    if (!cuentaReportable(m.cuenta)) continue;
    // El pago es el NETO del débito: una devolución parcial acredita la misma cuenta y debe
    // restar, no generar una fila aparte.
    const neto = (Number(m.debito) || 0) - (Number(m.credito) || 0);
    if (neto === 0) continue;

    const concepto = concepto1001DeCuenta(m.cuenta);
    if (!concepto) sinClasificar += 1;
    const f = fila(m.tercero, concepto || CONCEPTO_1001_POR_DEFECTO);
    if (f.sinFicha) sinTercero += 1;
    // Todo sale como DEDUCIBLE: el sistema no sabe si el soporte cumple el art. 771-2.
    f.deducible += neto;
  }

  // ---- Retenciones practicadas, imputadas a la fila que les corresponde ----
  let retSinFila = 0;
  let retSinDocumento = 0;
  let valorSinDocumento = 0;
  for (const r of retenciones) {
    const doc = r.terceroNumeroDocumento;
    if (!doc) {
      // NO se descarta en silencio. Una retención sin documento del tercero no se puede
      // reportar —la exógena identifica por el par (tipo, número)— pero SÍ se practicó, y el
      // total del formato quedaría por debajo de la declaración de retenciones sin que nada lo
      // dijera. Tampoco se manda a "cuantías menores": a quien se le retiene se le expide un
      // certificado del art. 381 con su NIT, así que un documento faltante es un DEFECTO DE
      // DATOS que hay que corregir, no un tercero genuinamente no identificable.
      retSinDocumento += 1;
      valorSinDocumento += Number(r.valor) || 0;
      continue;
    }

    // Se busca una fila YA EXISTENTE de ese tercero: la retención pertenece al pago que la
    // originó, y ese pago ya está en el libro. Si el tercero tiene una sola fila, es esa.
    const suyas = [...acc.entries()].filter(([k]) => k.startsWith(`${doc}|`));
    let destino;
    if (suyas.length === 1) {
      destino = suyas[0][1];
    } else {
      // Con varias filas se usa la categoría del concepto de retención para elegir.
      const cat = buscarConcepto(r.conceptoCodigo)?.categoria;
      const concepto = CATEGORIA_RETENCION_A_1001[cat] || CONCEPTO_1001_POR_DEFECTO;
      const exacta = suyas.find(([, v]) => v.concepto === concepto);
      destino = exacta ? exacta[1] : fila(doc, concepto);
      if (!exacta && !suyas.length) retSinFila += 1;
    }

    const valor = Number(r.valor) || 0;
    if (r.tipo === "retefuente") destino.retencionRenta += valor;
    else if (r.tipo === "reteiva") destino.retencionIvaResponsables += valor;
    // La ReteICA es municipal y NO va en el 1001: no tiene columna en este formato.
  }

  const avisos = [
    "TODOS los pagos salen como DEDUCIBLES. Un pago sin soporte válido no lo es (art. 771-2 E.T.), pero el sistema no sabe si el soporte existe: la columna de NO deducible hay que llenarla a criterio del contador.",
    'Las columnas de "IVA mayor valor del costo o gasto" van en CERO: el sistema no distingue el IVA descontable del que se lleva al costo.',
    "La ReteICA no aparece: es un tributo municipal y el formato 1001 no tiene columna para ella.",
    "El concepto sale de la CUENTA CONTABLE del movimiento, no de la retención — un pago que no llega a la base mínima no retiene y aun así se reporta. El mapa cuenta→concepto es un punto de partida sobre el PUC cargado y todavía NO tiene pantalla para ajustarlo.",
  ];
  if (sinClasificar)
    avisos.push(
      `${sinClasificar} movimiento(s) no encontraron concepto en el mapa y se agruparon en ${CONCEPTO_1001_POR_DEFECTO} ("los demás costos y deducciones"). Revísalos.`
    );
  if (sinTercero)
    avisos.push(
      `${sinTercero} movimiento(s) son de un tercero sin ficha: salen sin tipo de documento, sin dirección y sin códigos DANE. Consolídalos en Configuración → Terceros.`
    );
  if (retSinDocumento)
    avisos.push(
      `⚠️ ${retSinDocumento} retención(es) por ${valorSinDocumento.toLocaleString("es-CO")} NO se incluyeron: el tercero al que se le practicaron no tiene número de documento. El total de este formato queda por debajo de tu declaración de retenciones en ese valor hasta que se corrija.`
    );
  if (retSinFila)
    avisos.push(
      `${retSinFila} retención(es) no encontraron un pago del año con el que casar y se reportan en su propia fila. Suele significar que el pago quedó sin contabilizar.`
    );

  const filas = [...acc.values()]
    .filter((f) => f.deducible !== 0 || f.retencionRenta > 0 || f.retencionIvaResponsables > 0)
    .map((f) => ({
      ...f,
      deducible: n2(f.deducible),
      noDeducible: 0,
      ivaMayorValorDeducible: 0,
      ivaMayorValorNoDeducible: 0,
      retencionRenta: n2(f.retencionRenta),
      retencionAsumida: 0,
      retencionIvaResponsables: n2(f.retencionIvaResponsables),
      retencionIvaNoResidentes: 0,
    }))
    .sort((a, b) => a.concepto.localeCompare(b.concepto) || a.documento.localeCompare(b.documento));

  return {
    columnas: [
      { key: "concepto", header: "Concepto", width: 10 },
      { key: "tipoDocumento", header: "Tipo de documento", width: 16 },
      { key: "documento", header: "Número identificación", width: 22 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "direccion", header: "Dirección", width: 30 },
      { key: "codigoDepartamento", header: "Código dpto", width: 12 },
      { key: "codigoMunicipio", header: "Código mcp", width: 12 },
      { key: "pais", header: "País de Residencia o domicilio", width: 18 },
      { key: "deducible", header: "Pago o abono en cuenta deducible", width: 24 },
      { key: "noDeducible", header: "Pago o abono en cuenta NO deducible", width: 24 },
      { key: "ivaMayorValorDeducible", header: "IVA mayor valor del costo o gasto, deducible", width: 24 },
      { key: "ivaMayorValorNoDeducible", header: "IVA mayor valor del costo o gasto no deducible", width: 24 },
      { key: "retencionRenta", header: "Retención en la fuente practicada Renta", width: 24 },
      { key: "retencionAsumida", header: "Retención en la fuente asumida Renta", width: 24 },
      { key: "retencionIvaResponsables", header: "Retención en la fuente practicada IVA a responsables del IVA", width: 26 },
      { key: "retencionIvaNoResidentes", header: "Retención en la fuente practicada IVA a no residentes o no domiciliados", width: 26 },
    ],
    filas,
    avisos,
  };
}
