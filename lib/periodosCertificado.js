// Periodos y plazos de los certificados de retención.
//
// PERIODICIDAD
//   ReteFuente (renta) → ANUAL. Art. 381 E.T.
//   ReteIVA            → por PERIODO GRAVABLE del retenido (bimestral o cuatrimestral,
//                        art. 600 E.T.), no por año. Certificar el año completo bajo la
//                        etiqueta de un bimestre es una afirmación falsa en un documento que
//                        el tercero usa para descontar.
//   ReteICA            → según el municipio; el sistema lo trata como anual y lo advierte.
//
// PLAZOS
//   ReteFuente → hasta el último día hábil de MARZO del año siguiente.
//                Art. 1.6.1.13.2.40 del Decreto 1625 de 2016, modificado por el Decreto 2229
//                del 22 de diciembre de 2023.
//   ReteIVA    → dentro de los 15 días calendario siguientes al bimestre o cuatrimestre en que
//                se practicó. Art. 1.6.1.13.2.42 del mismo decreto.
//
// SANCIÓN POR NO EXPEDIR: Art. 667 E.T. — 5% del valor de los pagos correspondientes a los
// certificados no expedidos. Reducible al 30% si se subsana antes de la resolución sanción, y
// al 70% si se subsana dentro de los dos meses siguientes a su notificación.
//
// El módulo AVISA pero no bloquea: expedir tarde es mejor que no expedir, y además reduce la
// sanción.

import { hoyBogota } from "@/lib/fechas";

export const SANCION_NO_EXPEDIR = 0.05; // Art. 667 E.T.

const ULTIMO_DIA = { 2: 28, 4: 30, 6: 30, 9: 30, 11: 30 };

function finDeMes(anio, mes) {
  if (mes === 2) return anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0) ? 29 : 28;
  return ULTIMO_DIA[mes] || 31;
}

const iso = (a, m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Bimestres del art. 600 num. 1 E.T. */
export function bimestres(anio) {
  return [
    ["B1", "Enero – Febrero", 1, 2],
    ["B2", "Marzo – Abril", 3, 4],
    ["B3", "Mayo – Junio", 5, 6],
    ["B4", "Julio – Agosto", 7, 8],
    ["B5", "Septiembre – Octubre", 9, 10],
    ["B6", "Noviembre – Diciembre", 11, 12],
  ].map(([id, nombre, desde, hasta]) => ({
    id: `${anio}-${id}`,
    nombre,
    etiqueta: `${nombre} ${anio}`,
    desde: iso(anio, desde, 1),
    hasta: iso(anio, hasta, finDeMes(anio, hasta)),
  }));
}

/** Cuatrimestres del art. 600 num. 2 E.T. */
export function cuatrimestres(anio) {
  return [
    ["C1", "Enero – Abril", 1, 4],
    ["C2", "Mayo – Agosto", 5, 8],
    ["C3", "Septiembre – Diciembre", 9, 12],
  ].map(([id, nombre, desde, hasta]) => ({
    id: `${anio}-${id}`,
    nombre,
    etiqueta: `${nombre} ${anio}`,
    desde: iso(anio, desde, 1),
    hasta: iso(anio, hasta, finDeMes(anio, hasta)),
  }));
}

/** Todos los periodos que puede tener un certificado de ese tipo en ese año. */
export function periodosDisponibles(tipo, anio) {
  if (tipo !== "reteiva") {
    return [
      {
        id: `${anio}-ANUAL`,
        nombre: "Año completo",
        etiqueta: `Año gravable ${anio}`,
        desde: iso(anio, 1, 1),
        hasta: iso(anio, 12, 31),
      },
    ];
  }
  return [...bimestres(anio), ...cuatrimestres(anio)];
}

export function buscarPeriodo(tipo, anio, id) {
  return periodosDisponibles(tipo, anio).find((p) => p.id === id) || null;
}

/** Último día hábil de un mes: si cae sábado o domingo, se corre al viernes anterior. */
function ultimoDiaHabil(anio, mes) {
  let dia = finDeMes(anio, mes);
  for (;;) {
    const dow = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
    if (dow !== 0 && dow !== 6) return iso(anio, mes, dia);
    dia--;
  }
}

function sumarDias(fechaIso, dias) {
  const [a, m, d] = fechaIso.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/**
 * Fecha límite para expedir, y cuántos días faltan.
 * @returns { fecha, norma, diasRestantes, vencido } | null si no hay plazo modelado (ICA)
 */
export function plazoExpedicion(tipo, anio, periodo) {
  let fecha;
  let norma;

  if (tipo === "retefuente") {
    fecha = ultimoDiaHabil(anio + 1, 3);
    norma = "Art. 1.6.1.13.2.40 del Decreto 1625 de 2016 (mod. Decreto 2229 de 2023)";
  } else if (tipo === "reteiva") {
    // 15 días calendario tras el cierre del periodo. Sin periodo elegido no hay plazo que dar.
    if (!periodo?.hasta) return null;
    fecha = sumarDias(periodo.hasta, 15);
    norma = "Art. 1.6.1.13.2.42 del Decreto 1625 de 2016";
  } else {
    // El plazo del ICA lo fija cada municipio; inventar uno nacional sería peor que callar.
    return null;
  }

  const hoy = hoyBogota();
  const diasRestantes = Math.round(
    (Date.UTC(...fecha.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))) -
      Date.UTC(...hoy.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))))) /
      86400000
  );

  return { fecha, norma, diasRestantes, vencido: diasRestantes < 0 };
}
