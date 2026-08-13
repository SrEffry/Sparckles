// Certificado de retención en la fuente.
//
// CONTENIDO OBLIGATORIO — Art. 381 E.T., literales a–g:
//   a) Año gravable y CIUDAD DONDE SE CONSIGNÓ la retención
//   b) Razón social y NIT del retenedor
//   c) DIRECCIÓN del agente retenedor   ← la del retenedor, no la del retenido
//   d) Nombre o razón social y NIT de la persona a quien se le practicó
//   e) Monto total y concepto del pago sujeto a retención
//   f) Concepto y cuantía de la retención efectuada
//   g) Firma del pagador o agente retenedor
//
// PARA RETEIVA el contenido lo fija el art. 1.6.1.12.13 del Decreto 1625 de 2016, y pide TRES
// cifras por separado: el monto de la operación gravada SIN IVA, el IVA generado, y el
// porcentaje y la cuantía de la retención. Con una sola columna de "base" el documento sale
// incompleto y además mal rotulado: en ReteIVA la base ES el IVA, no el valor de la operación.
//
// Para AUTORRETENEDORES, el art. 1.6.1.13.2.40 del mismo decreto pide constancia de la fecha
// de la declaración y pago de la retención (no el Art. 381, como decía este comentario antes).
//
// No hay formato oficial para el Art. 381 ni para ReteIVA: basta con los datos y la firma.
// El de RENTAS DE TRABAJO (Arts. 378-379) SÍ tiene formulario oficial (Formulario 220) y este
// generador NO lo produce — por eso el título lo dice y los conceptos laborales se excluyen.
//
// Va en A4 vertical, no en media hoja: es un documento que se entrega a un tercero y se firma.

import { numeroALetras } from "@/lib/numeroALetras";

const BRAND = [128, 25, 49];
const SOFT = [134, 134, 139];
const DARK = [29, 29, 31];

const M = 48;
// Espacio que se reserva abajo para la firma y el pie legal. La tabla nunca invade esta franja.
const RESERVA_PIE = 150;

const money = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(
    Number(v) || 0
  );

const TITULO = {
  retefuente: "CERTIFICADO DE RETENCIÓN EN LA FUENTE",
  reteiva: "CERTIFICADO DE RETENCIÓN DE IVA",
  reteica: "CERTIFICADO DE RETENCIÓN DE INDUSTRIA Y COMERCIO",
};

const SUBTITULO = {
  retefuente: "Conceptos distintos a rentas de trabajo — Art. 381 E.T.",
  reteiva: "Art. 615-1 E.T. y art. 1.6.1.12.13 del Decreto 1625 de 2016",
  reteica: "Régimen de retención de industria y comercio del municipio",
};

const NORMA = {
  retefuente:
    "Expedido conforme al artículo 381 del Estatuto Tributario. NO cubre retenciones sobre rentas de trabajo (Arts. 378-379 E.T.), que se certifican en el Formulario 220 de la DIAN.",
  reteiva:
    "Expedido conforme al artículo 615-1 del Estatuto Tributario y al artículo 1.6.1.12.13 del Decreto 1625 de 2016.",
  reteica:
    "Expedido conforme al régimen de retención de industria y comercio del municipio correspondiente.",
};

export async function generarCertificadoPDF(certificado, opciones = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const util = W - 2 * M;

  const e = certificado.emisorSnapshot || {};
  const tipo = certificado.tipo;
  const esIva = tipo === "reteiva";
  const conceptos = Array.isArray(certificado.detalle) ? certificado.detalle : [];
  let y = M + 6;

  // ---------------- Encabezado: el agente retenedor ----------------
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(...BRAND);
  doc.text(e.razonSocial || "—", M, y);
  y += 15;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...SOFT);
  // NIT y dirección del retenedor: literales b) y c). Son requisito, no adorno.
  doc.text(`NIT: ${e.nit || "—"}`, M, y);
  y += 11;
  doc.text([e.direccion, e.ciudad].filter(Boolean).join(", ") || "—", M, y);
  y += 11;
  if (e.telefono || e.email) {
    doc.text([e.telefono, e.email].filter(Boolean).join(" · "), M, y);
    y += 11;
  }

  y += 12;
  doc.setDrawColor(...BRAND).setLineWidth(1.2).line(M, y, W - M, y);
  y += 24;

  // ---------------- Título ----------------
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...DARK);
  doc.text(TITULO[tipo] || "CERTIFICADO DE RETENCIÓN", W / 2, y, { align: "center" });
  y += 12;
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...SOFT);
  // El municipio va en el subtítulo del ICA: es lo que decide en qué declaración se descuenta,
  // y un certificado de ICA sin municipio no le sirve al tercero.
  const subtitulo =
    tipo === "reteica" && certificado.municipio
      ? `Municipio de ${certificado.municipio} — ${SUBTITULO.reteica}`
      : SUBTITULO[tipo] || "";
  doc.text(subtitulo, W / 2, y, { align: "center" });
  y += 13;
  doc.setFontSize(9);
  doc.text(rotuloPeriodo(certificado), W / 2, y, { align: "center" });
  y += 12;
  doc.setFontSize(8).text(`Certificado N.º ${certificado.numero}`, W / 2, y, { align: "center" });
  y += 26;

  // ---------------- Beneficiario ----------------
  doc.setFillColor(250, 248, 249).roundedRect(M, y, util, 52, 5, 5, "F");
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...SOFT);
  doc.text("SE CERTIFICA QUE A:", M + 14, y + 15);
  doc.setFont("helvetica", "bold").setFontSize(11.5).setTextColor(...DARK);
  doc.text(recortar(doc, certificado.terceroNombre, util - 28), M + 14, y + 30);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...SOFT);
  const docTercero = `${certificado.terceroTipoDocumento || "NIT/C.C."} ${certificado.terceroNumeroDocumento}${
    certificado.terceroDv ? "-" + certificado.terceroDv : ""
  }`;
  doc.text(docTercero, M + 14, y + 43);
  y += 68;

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...DARK);
  const intro = doc.splitTextToSize(
    `Durante el ${rotuloPeriodo(certificado).toLowerCase()} se le practicaron las retenciones que se detallan a continuación, sobre los pagos o abonos en cuenta relacionados:`,
    util
  );
  doc.text(intro, M, y);
  y += intro.length * 12 + 14;

  // ---------------- Detalle por concepto ----------------
  // ReteIVA lleva una columna más: el art. 1.6.1.12.13 exige la operación gravada sin IVA
  // aparte del IVA generado. Los otros dos tipos tienen una sola base.
  const cols = esIva
    ? [
        { titulo: "CONCEPTO", ancho: 0.3 },
        { titulo: "OPERACIÓN GRAVADA (SIN IVA)", ancho: 0.24, derecha: true },
        { titulo: "IVA GENERADO", ancho: 0.18, derecha: true },
        { titulo: "TARIFA", ancho: 0.1, derecha: true },
        { titulo: "RETENCIÓN", ancho: 0.18, derecha: true },
      ]
    : [
        { titulo: "CONCEPTO", ancho: 0.4 },
        { titulo: "TARIFA", ancho: 0.11, derecha: true },
        { titulo: "BASE SUJETA A RETENCIÓN", ancho: 0.26, derecha: true },
        { titulo: "RETENCIÓN PRACTICADA", ancho: 0.23, derecha: true },
      ];
  const anchos = cols.map((c) => util * c.ancho);
  const xDe = (i) => M + anchos.slice(0, i).reduce((a, b) => a + b, 0);

  doc.setFillColor(...BRAND).rect(M, y, util, 18, "F");
  // 6.6pt en los dos casos: a 8pt, "BASE SUJETA A RETENCIÓN" se desbordaba sobre la columna
  // de la izquierda y el encabezado se leía "TARIFABASE SUJETA A RETENCIÓN".
  doc.setFont("helvetica", "bold").setFontSize(6.6).setTextColor(255, 255, 255);
  cols.forEach((c, i) => {
    doc.text(c.titulo, c.derecha ? xDe(i) + anchos[i] - 6 : xDe(i) + 6, y + 12, {
      align: c.derecha ? "right" : "left",
    });
  });
  y += 18;

  // Cuántas filas caben sin invadir la franja de la firma.
  const cabenN = Math.max(1, Math.floor((H - M - RESERVA_PIE - y) / 22));
  const visibles = conceptos.slice(0, cabenN);
  const ocultos = conceptos.length - visibles.length;

  doc.setFont("helvetica", "normal").setFontSize(8.5);
  visibles.forEach((c, idx) => {
    const conMunicipio = !!c.municipio;
    const alto = conMunicipio ? 28 : 20;
    if (idx % 2 === 1) doc.setFillColor(250, 248, 249).rect(M, y, util, alto, "F");
    doc.setTextColor(...DARK);

    const tarifa = `${c.tarifa}${c.unidad || "%"}`;
    const celdas = esIva
      ? [c.conceptoNombre, money(c.baseOperacion), money(c.base), tarifa, money(c.valor)]
      : [c.conceptoNombre, tarifa, money(c.base), money(c.valor)];

    celdas.forEach((t, i) => {
      const der = cols[i].derecha;
      doc.text(recortar(doc, String(t), anchos[i] - 12), der ? xDe(i) + anchos[i] - 6 : xDe(i) + 6, y + 13, {
        align: der ? "right" : "left",
      });
    });

    // El municipio del ICA decide en qué declaración se descuenta.
    if (conMunicipio) {
      doc.setFontSize(7).setTextColor(...SOFT);
      doc.text(`Municipio: ${c.municipio}`, M + 6, y + 23);
      doc.setFontSize(8.5);
    }
    y += alto;
  });

  if (ocultos > 0) {
    doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(...SOFT);
    doc.text(`… y ${ocultos} concepto${ocultos === 1 ? "" : "s"} más.`, M + 6, y + 11);
    y += 16;
  }

  doc.setDrawColor(...BRAND).setLineWidth(1).line(M, y, W - M, y);
  y += 6;
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...BRAND);
  doc.text("TOTAL RETENIDO", M + 6, y + 12);
  // El total de la base también va: el lit. e) pide el monto del pago sujeto a retención, no
  // solo lo retenido.
  if (esIva) {
    doc.text(money(certificado.totalOperacion), xDe(1) + anchos[1] - 6, y + 12, { align: "right" });
    doc.text(money(certificado.totalBase), xDe(2) + anchos[2] - 6, y + 12, { align: "right" });
  } else {
    doc.text(money(certificado.totalBase), xDe(2) + anchos[2] - 6, y + 12, { align: "right" });
  }
  doc.text(money(certificado.totalValor), W - M - 6, y + 12, { align: "right" });
  y += 30;

  doc.setFont("helvetica", "italic").setFontSize(8.5).setTextColor(...DARK);
  const letras = doc.splitTextToSize(`Son: ${numeroALetras(certificado.totalValor)}`, util);
  doc.text(letras, M, y);
  y += letras.length * 11 + 18;

  // ---------------- Ciudad de consignación (literal a) ----------------
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...DARK);
  const consignacion = doc.splitTextToSize(
    `Las retenciones aquí certificadas fueron consignadas en ${certificado.ciudadConsignacion || e.ciudad || "—"}.`,
    util
  );
  doc.text(consignacion, M, y);
  y += consignacion.length * 12 + 6;

  if (opciones.declaracion) {
    // Constancia exigida a los autorretenedores por el art. 1.6.1.13.2.40 del Decreto 1625.
    const txt = doc.splitTextToSize(
      `Constancia de autorretenedor: la retención fue declarada y pagada mediante la declaración presentada el ${opciones.declaracion.fecha}${opciones.declaracion.formulario ? `, formulario N.º ${opciones.declaracion.formulario}` : ""}.`,
      util
    );
    doc.text(txt, M, y);
    y += txt.length * 12 + 6;
  }

  if (certificado.reemplazaANumero) {
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...BRAND);
    doc.text(`Este certificado reemplaza al ${certificado.reemplazaANumero}, anulado.`, M, y);
    y += 14;
  }

  // ---------------- Firma (literal g) ----------------
  const firmaY = Math.max(y + 40, H - M - 96);
  doc.setDrawColor(...DARK).setLineWidth(0.6).line(M, firmaY, M + 230, firmaY);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...DARK);
  doc.text(opciones.firmante?.nombre || e.razonSocial || "—", M, firmaY + 14);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...SOFT);
  doc.text(
    opciones.firmante?.documento
      ? `${opciones.firmante.documento} — Agente retenedor NIT ${e.nit || "—"}`
      : `NIT ${e.nit || "—"} — Agente retenedor`,
    M,
    firmaY + 25
  );
  if (certificado.expedidoPor) doc.text(`Expedido por: ${certificado.expedidoPor}`, M, firmaY + 36);
  doc.text(`Fecha de expedición: ${fechaCorta(certificado.expedidoEn)}`, M, firmaY + 47);

  // ---------------- Pie legal ----------------
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...SOFT);
  const pie = doc.splitTextToSize(
    `${NORMA[tipo] || ""} Este certificado se expide con base en la información registrada en la contabilidad del agente retenedor. Conserve este documento como soporte de su declaración.`,
    util
  );
  doc.text(pie, M, H - M - 8 - (pie.length - 1) * 9);

  // ---------------- Marca de agua ----------------
  // AL FINAL y traslúcida: dibujada al principio quedaba tapada por el recuadro del
  // beneficiario y los rellenos de la tabla, y un certificado anulado se reimprimía con la
  // marca medio borrada.
  if (certificado.anulado) marcaDeAgua(doc, "ANULADO", W, H);

  doc.save(`${certificado.numero}-${certificado.terceroNumeroDocumento}.pdf`);
}

function marcaDeAgua(doc, texto, W, H) {
  const gs = doc.GState ? doc.GState({ opacity: 0.18 }) : null;
  if (gs) doc.setGState(gs);
  doc.setFont("helvetica", "bold").setFontSize(70).setTextColor(211, 47, 47);
  doc.text(texto, W / 2, H / 2, { align: "center", angle: 28 });
  if (gs) doc.setGState(doc.GState({ opacity: 1 }));
}

/** "el año gravable 2026" / "el bimestre Julio – Agosto 2026". */
function rotuloPeriodo(c) {
  if (c.tipo === "reteiva" && c.periodo && c.periodoDesde) {
    const clase = c.periodo.includes("-B") ? "Bimestre" : "Cuatrimestre";
    return `${clase} ${nombrePeriodo(c.periodoDesde, c.periodoHasta)} de ${c.anio}`;
  }
  return `Año gravable ${c.anio}`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombrePeriodo(desde, hasta) {
  const m1 = MESES[Number(desde.slice(5, 7)) - 1];
  const m2 = MESES[Number(hasta.slice(5, 7)) - 1];
  return `${m1} – ${m2}`;
}

function fechaCorta(iso) {
  try {
    return new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
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
