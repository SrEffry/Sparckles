// Registro unificado de las retenciones que NOSOTROS practicamos.
//
// Todo documento que practique retención escribe aquí, en la misma transacción en que se
// crea. Es lo que permite responder "¿cuánto le retuve a este tercero en 2025 por servicios?"
// —la pregunta que responde el certificado del Art. 381 E.T.— sin recorrer tres modelos con
// formas distintas.
//
// LA REGLA DEL DOBLE CONTEO. La retención se practica en el pago o abono en cuenta, lo que
// ocurra primero; en la práctica, al CAUSAR el documento. Si la política del usuario dice que
// se causan (`MapaCuentas.retencionesEnCausacion`), la fila que escribe el comprobante de
// pago es informativa: se guarda para el impreso y la trazabilidad, pero con
// `vinculante: false`, y el certificado la ignora. Sin esa marca, un certificado que sume la
// compra MÁS su comprobante de pago certificaría el doble de lo retenido. El interruptor tiene
// dos ramas y las dos se cablean en `lib/retencionesDeDocumentos.js`.

import { buscarConcepto, esConceptoLaboral } from "@/lib/conceptosRetencion";

const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round((x + Number.EPSILON) * 100) / 100 : 0;
};

export const TIPOS_RETENCION = ["retefuente", "reteiva", "reteica"];

/**
 * Documento del tercero, sin puntos, guiones ni dígito de verificación.
 *
 * El certificado agrupa por igualdad exacta de cadena. Sin normalizar, "900.123.456",
 * "900123456" y "900123456-7" son tres terceros distintos y el mismo proveedor recibe tres
 * certificados parciales — que para el Art. 667 cuenta igual que no expedir ninguno.
 */
export function normalizarDocumento(valor) {
  const s = T(valor);
  if (!s) return { numero: null, dv: null };
  const limpio = s.replace(/[^\dkK]/gi, "");
  if (!limpio) return { numero: null, dv: null };

  // Un NIT colombiano tiene 9 dígitos y el DV va detrás de un guion. Solo se separa cuando el
  // guion estaba ahí: partir por longitud rompería cédulas largas.
  const conGuion = /^(\d{6,})[-\s]([\dkK])$/.exec(s.replace(/[.\s]/g, "").replace(/\s/g, ""));
  if (conGuion) return { numero: conGuion[1], dv: conGuion[2].toUpperCase() };
  return { numero: limpio, dv: null };
}

/** Nombre oficial del concepto, para que el certificado no agrupe por texto libre. */
export function nombreConcepto(codigo) {
  return buscarConcepto(codigo)?.nombre || null;
}

// ReteIVA y ReteICA no se desglosan por concepto: el hecho generador ES la retención misma.
// Solo la ReteFuente tiene una tabla de conceptos, y ahí sí la falta de uno es un defecto del
// certificado (Art. 381 lit. f) y no un valor por defecto que se pueda inventar.
const CONCEPTO_IMPLICITO = {
  reteiva: "Retención de IVA sobre compras y servicios gravados",
  reteica: "Retención de industria y comercio",
};

/**
 * Reemplaza las retenciones registradas para un documento y escribe las nuevas.
 *
 * Se borra y se vuelve a insertar en vez de actualizar: un documento se edita cambiando sus
 * retenciones enteras, y así no quedan filas huérfanas de una versión anterior.
 *
 * @param tx        transacción de Prisma
 * @param origen    'compra' | 'documento_soporte' | 'comprobante'
 * @param documento { id, docRef, fecha, tercero* }
 * @param lineas    [{ tipo, conceptoCodigo, base, baseOperacion, tarifa, unidad, valor, municipio }]
 * @param vinculante si estas retenciones son las que cuentan para el certificado
 */
export async function registrarRetenciones(tx, { usuarioId, origen, documento, lineas, vinculante = true }) {
  const campoId = {
    compra: "compraId",
    documento_soporte: "documentoSoporteId",
    comprobante: "comprobanteId",
  }[origen];
  if (!campoId) throw new Error(`Origen de retención no válido: ${origen}`);

  await tx.retencionPracticada.deleteMany({ where: { [campoId]: documento.id } });

  const utiles = (lineas || []).filter((l) => TIPOS_RETENCION.includes(l.tipo) && Number(l.valor) > 0);
  if (utiles.length === 0) return 0;

  const anio = Number(String(documento.fecha || "").slice(0, 4)) || new Date().getFullYear();
  const doc = normalizarDocumento(documento.terceroNumeroDocumento);

  await tx.retencionPracticada.createMany({
    data: utiles.map((l) => ({
      usuarioId,
      origen,
      [campoId]: documento.id,
      docRef: documento.docRef,
      fecha: documento.fecha,
      anio,
      terceroNombre: documento.terceroNombre,
      terceroTipoDocumento: T(documento.terceroTipoDocumento) || null,
      terceroNumeroDocumento: doc.numero,
      // El DV explícito del documento gana; si no, el que venía pegado al número.
      terceroDv: T(documento.terceroDv) || doc.dv,
      tipo: l.tipo,
      conceptoCodigo: T(l.conceptoCodigo) || null,
      conceptoNombre: nombreConcepto(l.conceptoCodigo) || T(l.conceptoNombre) || null,
      base: r2(l.base),
      baseOperacion: l.baseOperacion == null ? null : r2(l.baseOperacion),
      tarifa: Number(l.tarifa) || 0,
      unidad: l.unidad === "‰" ? "‰" : "%",
      valor: r2(l.valor),
      municipio: T(l.municipio) || null,
      vinculante,
    })),
  });

  return utiles.length;
}

/**
 * Retenciones certificables de un tercero, agrupadas por concepto, tarifa y municipio.
 *
 * Solo las vinculantes: las informativas duplicarían el valor certificado.
 *
 * POR QUÉ LA TARIFA ENTRA EN LA CLAVE. Un mismo concepto puede liquidarse a tarifas distintas
 * (4% a un declarante y 6% a uno que no lo es). Agrupados juntos, la línea diría "Servicios —
 * base 20.000.000 — retenido 1.000.000", cifra que no es el 4% ni el 6% de esa base y que un
 * revisor no puede verificar. Contra el lit. f, es un certificado defectuoso.
 *
 * POR QUÉ EL MUNICIPIO ENTRA EN LA CLAVE. Cada ReteICA se descuenta en la declaración de SU
 * municipio; sumar Bogotá y Medellín da un total que no sirve para ninguna de las dos.
 *
 * @param municipio si se pasa, solo las de ese municipio (certificado de ICA por municipio)
 * @param desde/hasta rango de fechas inclusive; para ReteIVA, que se certifica por periodo
 *                    gravable (art. 600 E.T.) y no por año
 */
export async function retencionesParaCertificado(
  prisma,
  { usuarioId, anio, terceroDocumento, tipo, municipio, desde, hasta }
) {
  const doc = normalizarDocumento(terceroDocumento);
  const lineas = await prisma.retencionPracticada.findMany({
    where: {
      usuarioId,
      vinculante: true,
      terceroNumeroDocumento: doc.numero,
      ...(tipo ? { tipo } : {}),
      ...(municipio ? { municipio } : {}),
      // El rango manda sobre el año cuando se pasa: son el mismo filtro a distinta resolución.
      ...(desde && hasta ? { fecha: { gte: desde, lte: hasta } } : { anio }),
    },
    orderBy: [{ tipo: "asc" }, { fecha: "asc" }],
  });

  // Los pagos laborales NO se certifican por el Art. 381: van por los Arts. 378-379, con el
  // Formulario 220 oficial de la DIAN. Se apartan en vez de mezclarse, y la pantalla lo dice.
  const laborales = lineas.filter((l) => esConceptoLaboral(l.conceptoCodigo));
  const certificables = lineas.filter((l) => !esConceptoLaboral(l.conceptoCodigo));

  const grupos = new Map();
  for (const l of certificables) {
    const clave = `${l.tipo}|${l.conceptoCodigo || "sin_concepto"}|${l.tarifa}|${l.municipio || ""}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        tipo: l.tipo,
        conceptoCodigo: l.conceptoCodigo,
        conceptoNombre: l.conceptoNombre || CONCEPTO_IMPLICITO[l.tipo] || "Sin concepto asignado",
        tarifa: Number(l.tarifa),
        unidad: l.unidad,
        municipio: l.municipio || null,
        base: 0,
        baseOperacion: 0,
        valor: 0,
        operaciones: 0,
      });
    }
    const g = grupos.get(clave);
    g.base = r2(g.base + Number(l.base));
    g.baseOperacion = r2(g.baseOperacion + Number(l.baseOperacion || 0));
    g.valor = r2(g.valor + Number(l.valor));
    g.operaciones++;
  }

  const conceptos = [...grupos.values()].sort(
    (a, b) => a.tipo.localeCompare(b.tipo) || b.valor - a.valor
  );

  // Documentos de ReteFuente sin concepto: el certificado no puede decir "por algo se le
  // retuvo el 4%". Se devuelven identificados para que el usuario sepa cuál corregir, con su
  // origen, porque no todos se arreglan en el mismo módulo.
  const sinConcepto = [
    ...new Map(
      certificables
        .filter((l) => l.tipo === "retefuente" && !l.conceptoCodigo)
        .map((l) => [l.docRef, { docRef: l.docRef, origen: l.origen }])
    ).values(),
  ];

  // Municipios presentes, para ofrecer un certificado de ICA por cada uno.
  const municipios = [...new Set(certificables.filter((l) => l.tipo === "reteica").map((l) => l.municipio))];

  return {
    lineas: certificables,
    conceptos,
    sinConcepto,
    municipios,
    laborales: {
      lineas: laborales.length,
      valor: r2(laborales.reduce((a, l) => a + Number(l.valor), 0)),
    },
    totales: {
      base: r2(conceptos.reduce((a, c) => a + c.base, 0)),
      baseOperacion: r2(conceptos.reduce((a, c) => a + c.baseOperacion, 0)),
      valor: r2(conceptos.reduce((a, c) => a + c.valor, 0)),
      operaciones: certificables.length,
    },
    tercero: certificables[0]
      ? {
          nombre: certificables[0].terceroNombre,
          tipoDocumento: certificables[0].terceroTipoDocumento,
          numeroDocumento: certificables[0].terceroNumeroDocumento,
          dv: certificables[0].terceroDv,
        }
      : null,
  };
}
