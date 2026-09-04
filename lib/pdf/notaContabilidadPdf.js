// Nota de contabilidad (comprobante de contabilidad) en PDF.
//
// FORMATO: A5 VERTICAL, el mismo criterio que los comprobantes de tesorería — media hoja de
// verdad, orientación vertical. La nota suele llevar pocas líneas; cuando lleva muchas, la
// tabla se trunca con un "… y N más" y el detalle completo queda en el libro diario, que es
// donde legalmente vive.
//
// CONTENIDO. El art. 124 del Decreto 2649/1993 pide, para todo comprobante de contabilidad:
// fecha, origen, descripción y cuantía de las operaciones, y las personas que lo elaboraron y
// autorizaron. A eso la plantilla acordada le añade lo que distingue un AJUSTE de un registro
// corriente: el periodo contable afectado, el tipo de ajuste, el documento de referencia y los
// anexos que lo soportan.
//
// Igual que en los comprobantes: no se imprimen rayas para firmar. El art. 124 pide indicación
// de las personas, no rúbrica manuscrita, y el usuario autenticado con fecha y hora cumple
// mejor. Aquí tampoco hay firma de recibido: no hay beneficiario.

import { dibujarLogo } from "./logo";

import { numeroALetras } from "@/lib/numeroALetras";
import { nombreTipoAjuste } from "@/lib/notaContabilidadValidation";

const BRAND = [128, 25, 49];
const SOFT = [134, 134, 139];
const DARK = [29, 29, 31];
const LINEA = [214, 214, 218];
const ZEBRA = [249, 246, 247];

const M = 26;

const money = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(
    Number(v) || 0
  );

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** '2026-07' → 'julio de 2026'. Es el dato que distingue el ajuste, así que se lee entero. */
function periodoLargo(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(p || "");
  if (!m) return p || "—";
  return `${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

export async function generarNotaContabilidadPDF(nota, opciones = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a5" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const util = W - 2 * M;

  const emisor = nota.emisorSnapshot || opciones.emisor || {};
  const movimientos = nota.movimientos || [];
  let y = M + 4;

  // ---------------- Encabezado ----------------
  const boxW = 138;
  const boxX = W - M - boxW;
  const anchoEmisor = boxX - M - 10;

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...BRAND);
  // Logo del emisor, de la configuracion actual (ver `lib/pdf/logo.js`: es marca, no dato
  // fiscal, y por eso no viaja en el snapshot del documento).
  const anchoLogo = dibujarLogo(doc, opciones.logo, { x: M, y, maxAncho: 56, maxAlto: 26 });
  const xE = M + (anchoLogo ? anchoLogo + 8 : 0);

  doc.text(recortar(doc, emisor.razonSocial || "—", anchoEmisor), xE, y + 8);
  doc.setFont("helvetica", "normal").setFontSize(6.8).setTextColor(...SOFT);
  const lineasEmisor = [
    emisor.nit ? `NIT: ${emisor.nit}` : null,
    [emisor.direccion, emisor.ciudad].filter(Boolean).join(", ") || null,
    [emisor.telefono, emisor.email].filter(Boolean).join(" · ") || null,
  ].filter(Boolean);
  lineasEmisor.forEach((t, i) => doc.text(recortar(doc, t, anchoEmisor - (xE - M)), xE, y + 20 + i * 8));

  // Caja del documento
  doc.setDrawColor(...BRAND).setLineWidth(0.8).roundedRect(boxX, y, boxW, 46, 4, 4);
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...BRAND);
  doc.text("NOTA DE CONTABILIDAD", boxX + boxW / 2, y + 13, { align: "center" });
  doc.setFontSize(12).setTextColor(...DARK);
  doc.text(nota.numero || "BORRADOR", boxX + boxW / 2, y + 28, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(6.8).setTextColor(...SOFT);
  doc.text([nota.fecha, nota.ciudad].filter(Boolean).join(" · "), boxX + boxW / 2, y + 39, { align: "center" });

  y += 56;
  doc.setDrawColor(...LINEA).setLineWidth(0.6).line(M, y, W - M, y);
  y += 12;

  // Marca de agua de estado: un borrador o una nota reversada no deben circular como buenas.
  const marca = nota.estado === "borrador" ? "BORRADOR" : nota.estado === "reversado" ? "REVERSADA" : null;
  if (marca) {
    doc.setFont("helvetica", "bold").setFontSize(40).setTextColor(228, 200, 208);
    doc.text(marca, W / 2, H / 2, { align: "center", angle: 22 });
  }

  // ---------------- Periodo · tipo · referencia ----------------
  // Los tres datos que convierten esto en un ajuste identificable y no en un apunte suelto.
  const col = util / 3;
  const cabecera = [
    ["PERIODO CONTABLE AFECTADO", periodoLargo(nota.periodoAfectado)],
    ["TIPO DE AJUSTE", nombreTipoAjuste(nota.tipoAjuste) || "—"],
    ["DOCUMENTO DE REFERENCIA", nota.documentoRef || "—"],
  ];
  doc.setFillColor(...ZEBRA).roundedRect(M, y, util, 30, 4, 4, "F");
  cabecera.forEach(([label, valor], i) => {
    const x = M + i * col + 8;
    doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(...SOFT);
    doc.text(label, x, y + 11);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...DARK);
    doc.text(recortar(doc, valor, col - 14), x, y + 23);
  });
  y += 40;

  // ---------------- Concepto ----------------
  doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...SOFT);
  doc.text("CONCEPTO Y JUSTIFICACIÓN", M, y);
  y += 9;
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...DARK);
  const concepto = doc.splitTextToSize(nota.concepto || "—", util).slice(0, 5);
  doc.text(concepto, M, y);
  y += concepto.length * 10 + 8;

  // ---------------- Imputación ----------------
  doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...SOFT);
  doc.text("IMPUTACIÓN CONTABLE (PARTIDA DOBLE)", M, y);
  y += 6;

  const anchos = [58, util - 58 - 74 - 74, 74, 74];
  doc.setFillColor(...BRAND).rect(M, y, util, 14, "F");
  doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(255, 255, 255);
  ["CUENTA", "DESCRIPCIÓN", "DÉBITO", "CRÉDITO"].forEach((h, i) => {
    const x = M + anchos.slice(0, i).reduce((a, b) => a + b, 0);
    const der = i >= 2;
    doc.text(h, der ? x + anchos[i] - 5 : x + 5, y + 9.5, { align: der ? "right" : "left" });
  });
  y += 14;

  // El espacio que hay que dejar libre abajo: totales + letras + pie de firmas.
  const RESERVA = 108;
  const cabenN = Math.max(1, Math.floor((H - M - RESERVA - y) / 15));
  const visibles = movimientos.slice(0, cabenN);
  const ocultos = movimientos.length - visibles.length;

  doc.setFont("helvetica", "normal").setFontSize(7.5);
  visibles.forEach((m, i) => {
    if (i % 2 === 1) doc.setFillColor(...ZEBRA).rect(M, y, util, 15, "F");
    // El tercero, cuando lo hay, va bajo la descripción: una amortización no lleva tercero, y
    // ponerlo ahí por costumbre ensucia los auxiliares y los medios magnéticos.
    const descripcion = m.nombreCuenta || "—";
    const celdas = [
      m.cuenta,
      descripcion,
      Number(m.debito) > 0 ? money(m.debito) : "",
      Number(m.credito) > 0 ? money(m.credito) : "",
    ];
    celdas.forEach((t, j) => {
      const x = M + anchos.slice(0, j).reduce((a, b) => a + b, 0);
      const der = j >= 2;
      doc.setTextColor(...(j === 0 ? BRAND : DARK));
      if (j === 0) doc.setFont("helvetica", "bold");
      doc.text(recortar(doc, String(t), anchos[j] - 10), der ? x + anchos[j] - 5 : x + 5, y + 10, {
        align: der ? "right" : "left",
      });
      if (j === 0) doc.setFont("helvetica", "normal");
    });
    if (m.tercero) {
      doc.setFontSize(6).setTextColor(...SOFT);
      doc.text(recortar(doc, m.tercero, anchos[1] - 10), M + anchos[0] + 5, y + 14);
      doc.setFontSize(7.5);
    }
    y += 15;
  });

  if (ocultos > 0) {
    doc.setFont("helvetica", "italic").setFontSize(6.5).setTextColor(...SOFT);
    doc.text(`… y ${ocultos} movimiento${ocultos === 1 ? "" : "s"} más. Detalle completo en el libro diario.`, M + 5, y + 9);
    y += 14;
  }

  // ---------------- Sumas iguales ----------------
  doc.setDrawColor(...BRAND).setLineWidth(0.9).line(M, y, W - M, y);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...BRAND);
  doc.text("SUMAS IGUALES", M + 5, y + 12);
  doc.text(money(nota.totalDebitos), M + anchos[0] + anchos[1] + anchos[2] - 5, y + 12, { align: "right" });
  doc.text(money(nota.totalCreditos), W - M - 5, y + 12, { align: "right" });
  y += 20;

  doc.setFont("helvetica", "italic").setFontSize(6.8).setTextColor(...SOFT);
  const letras = doc.splitTextToSize(`Son: ${numeroALetras(nota.totalDebitos)}`, util);
  doc.text(letras, M, y + 6);
  y += letras.length * 8 + 6;

  if (nota.anexos) {
    doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(...SOFT);
    const anexos = doc.splitTextToSize(`Anexos que lo soportan: ${nota.anexos}`, util).slice(0, 2);
    doc.text(anexos, M, y + 6);
  }

  // ---------------- Pie: elaborado / autorizado / asiento ----------------
  const pieY = H - M - 30;
  doc.setDrawColor(...LINEA).setLineWidth(0.6).line(M, pieY, W - M, pieY);
  doc.setFont("helvetica", "normal").setFontSize(6.3).setTextColor(...SOFT);
  const elaborado = [nota.elaboradoPor, fechaHora(nota.elaboradoEn)].filter(Boolean).join(" · ");
  doc.text(`Elaborado por: ${elaborado || "—"}`, M, pieY + 11);
  doc.text(`Autorizado por: ${nota.autorizadoPor || "—"}`, M, pieY + 20);
  if (opciones.asiento?.numero) {
    doc.text(`Asiento: ${opciones.asiento.numero}`, W - M, pieY + 11, { align: "right" });
  }
  if (nota.reversadaPorNumero) {
    doc.setTextColor(211, 47, 47);
    doc.text(`Reversada por ${nota.reversadaPorNumero}`, W - M, pieY + 20, { align: "right" });
  }

  doc.save(`${nota.numero || "nota-contabilidad"}.pdf`);
}

function fechaHora(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota" });
  } catch {
    return "";
  }
}

function recortar(doc, texto, ancho) {
  const t = String(texto ?? "");
  if (doc.getTextWidth(t) <= ancho) return t;
  let corto = t;
  while (corto.length > 1 && doc.getTextWidth(corto + "…") > ancho) corto = corto.slice(0, -1);
  return corto + "…";
}
