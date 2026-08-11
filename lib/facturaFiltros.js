// Filtros del historial de facturación de venta.
//
// Todo se resuelve en el SERVIDOR: el pie de totales debe agregarse sobre el mismo `where`
// que la tabla, con `Decimal` de Postgres. Filtrar en el cliente obligaba a traer el
// histórico completo, impedía cualquier filtro sobre los ítems (no viajaban) y sumaba con
// `Number()` en JS, que pierde precisión en cifras grandes.
//
// El periodo SIEMPRE se filtra por `fecha` (la fecha fiscal del documento), nunca por
// `createdAt`: createdAt es UTC, y una factura del 30-abr registrada a las 00:30 de Bogotá
// tiene createdAt de mayo, es decir cae en el bimestre siguiente y en otra declaración.

import { esFechaISOValida } from "@/lib/fechas";

const T = (v) => (v ?? "").toString().trim();

/** ¿Año bisiesto? Decide si el bimestre 1 cierra el 28 o el 29 de febrero. */
function bisiesto(a) {
  return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
}

const dd = (n) => String(n).padStart(2, "0");

/**
 * Periodos fiscales colombianos. Los rangos son INCLUSIVOS en ambos extremos.
 *
 * Bimestres — Art. 600 num. 1 E.T.: grandes contribuyentes, quienes tuvieron ingresos brutos
 * >= 92.000 UVT a 31 de diciembre del año anterior, y los responsables de los Arts. 477 y 481.
 * Cuatrimestres — Art. 600 num. 2 E.T.: ingresos brutos < 92.000 UVT.
 *
 * El umbral en pesos depende de la UVT del año medido y conviene confirmarlo con el contador:
 * hay práctica dividida sobre cuál UVT aplicar. Por eso la periodicidad se elige, no se deduce.
 */
export function periodosFiscales(anio) {
  const fin = (m) => {
    if (m === 2) return bisiesto(anio) ? 29 : 28;
    return [4, 6, 9, 11].includes(m) ? 30 : 31;
  };
  const r = (etiqueta, grupo, mDesde, mHasta) => ({
    clave: `${grupo}-${mDesde}-${anio}`,
    grupo,
    etiqueta,
    desde: `${anio}-${dd(mDesde)}-01`,
    hasta: `${anio}-${dd(mHasta)}-${dd(fin(mHasta))}`,
  });

  return [
    r("Bimestre 1 · Ene–Feb", "bimestre", 1, 2),
    r("Bimestre 2 · Mar–Abr", "bimestre", 3, 4),
    r("Bimestre 3 · May–Jun", "bimestre", 5, 6),
    r("Bimestre 4 · Jul–Ago", "bimestre", 7, 8),
    r("Bimestre 5 · Sep–Oct", "bimestre", 9, 10),
    r("Bimestre 6 · Nov–Dic", "bimestre", 11, 12),
    r("Cuatrimestre 1 · Ene–Abr", "cuatrimestre", 1, 4),
    r("Cuatrimestre 2 · May–Ago", "cuatrimestre", 5, 8),
    r("Cuatrimestre 3 · Sep–Dic", "cuatrimestre", 9, 12),
    r("Año gravable " + anio, "anual", 1, 12),
  ];
}

/** Mes calendario cerrado: la retención en la fuente se declara mensualmente (Art. 604 E.T.). */
export function rangoMes(anio, mes) {
  const ultimo = mes === 2 ? (bisiesto(anio) ? 29 : 28) : [4, 6, 9, 11].includes(mes) ? 30 : 31;
  return { desde: `${anio}-${dd(mes)}-01`, hasta: `${anio}-${dd(mes)}-${dd(ultimo)}` };
}

export const TIPOS_IVA = ["gravado", "exento", "excluido", "no_responsable", "sin_clasificar"];
export const TIPOS_RETENCION = ["retefuente", "reteiva", "reteica"];

/**
 * Construye el `where` de Prisma a partir de los parámetros de la URL.
 * Devuelve además `filtros` (los aplicados, ya normalizados) para poder mostrarlos encima de
 * la tabla y estamparlos en el Excel: un total sin sus filtros a la vista no es auditable.
 */
export function construirWhere(usuarioId, sp) {
  const g = (k) => T(sp.get(k));
  const filtros = {};
  const where = { usuarioId };
  const avisos = [];

  // ---- Periodo (por fecha fiscal) ----
  const desde = g("desde");
  const hasta = g("hasta");
  if (desde && esFechaISOValida(desde)) filtros.desde = desde;
  if (hasta && esFechaISOValida(hasta)) filtros.hasta = hasta;
  if (filtros.desde || filtros.hasta) {
    where.fecha = {};
    if (filtros.desde) where.fecha.gte = filtros.desde;
    if (filtros.hasta) where.fecha.lte = filtros.hasta;
  }

  // ---- Estado ----
  // `aFecha` da el estado A LA FECHA DE CORTE, no el de hoy: una factura anulada en julio
  // seguía siendo emitida para el corte del 30 de abril, que es lo que se declaró.
  const estado = g("estado") || "emitida";
  const aFecha = g("aFecha");
  filtros.estado = estado;
  if (aFecha && esFechaISOValida(aFecha)) filtros.aFecha = aFecha;

  if (estado === "emitida") {
    where.OR = filtros.aFecha
      ? [
          { estado: "emitida" },
          { estado: "anulada", fechaAnulacion: { gt: filtros.aFecha } },
        ]
      : [{ estado: "emitida" }];
  } else if (estado === "anulada") {
    where.estado = "anulada";
    if (filtros.aFecha) where.fechaAnulacion = { lte: filtros.aFecha };
  }
  // 'todas' → sin condición de estado.

  if (filtros.aFecha && estado === "emitida") {
    avisos.push(
      "Las anuladas sin fecha de anulación registrada se excluyen del corte: se anularon antes de que el sistema fechara las anulaciones."
    );
  }

  // ---- Tercero ----
  // El filtro duro es por documento: la exógena (1007/1006) se reporta por identificación,
  // y el nombre de un mismo tercero se escribe de diez formas distintas.
  const clienteDoc = g("clienteDoc");
  if (clienteDoc) {
    filtros.clienteDoc = clienteDoc;
    where.clienteNumeroDocumento = { contains: clienteDoc };
  }
  const clienteId = g("clienteId");
  if (clienteId) {
    filtros.clienteId = clienteId;
    where.clienteId = clienteId;
  }

  // ---- Numeración autorizada ----
  const prefijo = g("prefijo");
  if (prefijo) {
    filtros.prefijo = prefijo;
    where.prefijo = prefijo;
  }
  const nDesde = Number(g("numeroDesde"));
  const nHasta = Number(g("numeroHasta"));
  if (Number.isFinite(nDesde) && g("numeroDesde")) {
    filtros.numeroDesde = nDesde;
    where.numero = { ...(where.numero || {}), gte: nDesde };
  }
  if (Number.isFinite(nHasta) && g("numeroHasta")) {
    filtros.numeroHasta = nHasta;
    where.numero = { ...(where.numero || {}), lte: nHasta };
  }

  // ---- Tratamiento de IVA (vive en los ítems) ----
  const tipoIva = g("tipoIva");
  if (TIPOS_IVA.includes(tipoIva)) {
    filtros.tipoIva = tipoIva;
    where.items = { some: { tipoIva } };
    avisos.push(
      "El filtro por tratamiento de IVA devuelve facturas que CONTIENEN al menos un renglón de ese tipo; una factura mixta aparece en más de un tratamiento. Para los renglones de la declaración usa el desglose de bases del pie."
    );
  }

  // ---- Retenciones practicadas al emisor ----
  const retencion = g("retencion");
  if (TIPOS_RETENCION.includes(retencion)) {
    filtros.retencion = retencion;
    const columna = { retefuente: "retenciones", reteiva: "reteIva", reteica: "reteIca" }[retencion];
    where[columna] = { gt: 0 };
  }

  // ---- Notas aplicadas ----
  const conNota = g("conNota");
  if (conNota === "nc") {
    filtros.conNota = "nc";
    where.saldoAplicadoNC = { gt: 0 };
  } else if (conNota === "nd") {
    filtros.conNota = "nd";
    where.saldoAplicadoND = { gt: 0 };
  }

  // ---- Pago ----
  const formaPago = g("formaPago");
  if (formaPago) {
    filtros.formaPago = formaPago;
    where.formaPago = formaPago;
  }
  const medioPago = g("medioPago");
  if (medioPago) {
    filtros.medioPago = medioPago;
    where.medioPago = medioPago;
  }

  // ---- Monto ----
  const min = Number(g("montoMin"));
  const max = Number(g("montoMax"));
  if (g("montoMin") && Number.isFinite(min)) {
    filtros.montoMin = min;
    where.total = { ...(where.total || {}), gte: min };
  }
  if (g("montoMax") && Number.isFinite(max)) {
    filtros.montoMax = max;
    where.total = { ...(where.total || {}), lte: max };
  }

  // ---- Vencimiento ----
  // NO es "pendiente de pago": no existe modelo de recaudo, así que el sistema no sabe qué
  // se cobró. Es estrictamente la fecha de vencimiento pactada.
  const vencimiento = g("vencimiento");
  const hoy = g("hoy");
  if (vencimiento && esFechaISOValida(hoy)) {
    filtros.vencimiento = vencimiento;
    if (vencimiento === "vencidas") where.fechaVencimiento = { lt: hoy, not: null };
    else if (vencimiento === "vigentes") where.fechaVencimiento = { gte: hoy };
    avisos.push(
      "El filtro de vencimiento NO considera pagos: el sistema aún no registra recaudos. Una factura vencida puede estar cobrada."
    );
  }

  // ---- Texto libre ----
  const q = g("q");
  if (q) {
    filtros.q = q;
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { numeroCompleto: { contains: q, mode: "insensitive" } },
          { clienteNombre: { contains: q, mode: "insensitive" } },
          { clienteNumeroDocumento: { contains: q } },
        ],
      },
    ];
  }

  return { where, filtros, avisos };
}
