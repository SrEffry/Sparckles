// Documento soporte en adquisiciones con no obligados a facturar — Art. 1.6.1.4.12 del DUT
// 1625/2016 y Res. DIAN 000167 de 2021.
//
// QUÉ ES ESTE PAPEL Y POR QUÉ NO SE PARECE A UNA FACTURA. Cuando le compramos a alguien que no
// está obligado a facturar, la factura no existe: el soporte de nuestro costo o gasto lo
// fabricamos NOSOTROS. Por eso el documento tiene dos partes que una factura no tiene —el
// ADQUIRENTE (nosotros) es quien lo expide, y el VENDEDOR solo es identificado— y por eso el
// art. 771-2 del E.T. lo condiciona: sin él, ese costo no es deducible y ese IVA no es
// descontable. Un requerimiento de la DIAN se responde con este impreso.
//
// LO QUE LA RESOLUCIÓN EXIGE, y por eso está cada bloque:
//   · Denominación expresa "Documento soporte en adquisiciones efectuadas a no obligados a
//     facturar". No basta con un título bonito: la denominación es un requisito.
//   · Numeración consecutiva autorizada, apellido y nombre o razón social y NIT del ADQUIRENTE.
//   · Apellido y nombre o razón social y NIT del VENDEDOR, con su tipo de documento.
//   · FECHA DE LA OPERACIÓN — no la del pago. Son cosas distintas y el impreso las separa.
//   · Descripción específica del bien o servicio, y valor total.
//
// FORMATO: A5 vertical, como el comprobante de tesorería. Es media hoja real y el documento
// cabe de sobra: una sola operación, un solo tercero.
//
// LO QUE ESTE IMPRESO **NO** ES. No es el documento soporte ELECTRÓNICO con CUDS y validación
// previa de la DIAN, que va por proveedor tecnológico autorizado. Es su representación gráfica,
// y el pie lo dice en vez de dejar que alguien lo suponga.

import { dibujarLogo } from "./logo";

import { numeroALetras } from "@/lib/numeroALetras";

const BRAND = [128, 25, 49];
const SOFT = [134, 134, 139];
const DARK = [29, 29, 31];
const LINEA = [214, 214, 218];
const ZEBRA = [249, 246, 247];

const money = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(
    Number(v) || 0
  );

const RET = { retefuente: "ReteFuente", reteiva: "ReteIVA", reteica: "ReteICA" };

const M = 26; // margen

/**
 * @param soporte              el documento, con `retencionesPracticadas` y `pagos`
 * @param opciones.emisor      respaldo del adquirente si el soporte no tiene snapshot
 * @param opciones.asiento     asiento contabilizado, para la imputación
 * @param opciones.comprobanteOrigen  egreso desde el que se generó, si se usó el atajo
 */
export async function generarSoportePDF(soporte, opciones = {}) {
  const { jsPDF } = await import("jspdf");

  // Formato con nombre, no medidas sueltas: al pasar `[ancho, alto]` jsPDF los reordena según
  // la orientación y la página sale girada.
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a5" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  dibujar(doc, soporte, opciones, W, H);

  doc.save(`${soporte.numero || "documento-soporte"}.pdf`);
}

function dibujar(doc, s, opciones, W, H) {
  const emisor = s.emisorSnapshot || opciones.emisor || {};
  const asiento = opciones.asiento;
  const origen = opciones.comprobanteOrigen;
  const util = W - 2 * M;
  let y = M + 4;

  // ---------------- Encabezado: el ADQUIRENTE es quien expide ----------------
  const boxW = 150;
  const boxX = W - M - boxW;
  const anchoEmisor = boxX - M - 10;

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...BRAND);
  // Logo del emisor, de la configuración actual (ver `lib/pdf/logo.js`: es marca, no dato
  // fiscal, y por eso no viaja en el snapshot del documento).
  const anchoLogo = dibujarLogo(doc, opciones.logo, { x: M, y, maxAncho: 56, maxAlto: 26 });
  const xE = M + (anchoLogo ? anchoLogo + 8 : 0);

  doc.text(recortar(doc, emisor.razonSocial || "—", anchoEmisor), xE, y + 8);

  doc.setFont("helvetica", "normal").setFontSize(6.4).setTextColor(...SOFT);
  const lineasEmisor = [
    emisor.nit ? `NIT: ${emisor.nit}` : null,
    [emisor.direccion, emisor.ciudad].filter(Boolean).join(", ") || null,
    [emisor.telefono, emisor.email].filter(Boolean).join(" · ") || null,
    "Adquirente — expide este documento soporte",
  ].filter(Boolean);
  lineasEmisor.forEach((t, i) => doc.text(recortar(doc, t, anchoEmisor - (xE - M)), xE, y + 19 + i * 7.5));

  doc.setDrawColor(...BRAND).setLineWidth(0.8).roundedRect(boxX, y, boxW, 40, 3, 3);
  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(...BRAND);
  doc.text("DOCUMENTO SOPORTE", boxX + boxW / 2, y + 12, { align: "center" });
  doc.setFontSize(12).setTextColor(...DARK);
  doc.text(s.numero || "—", boxX + boxW / 2, y + 26, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(6.4).setTextColor(...SOFT);
  doc.text(`Operación del ${s.fecha}`, boxX + boxW / 2, y + 35, { align: "center" });

  y += Math.max(44, 19 + lineasEmisor.length * 7.5) + 2;

  // La DENOMINACIÓN COMPLETA es requisito de la Res. 167/2021, no decoración. Va en su propia
  // banda para que se lea a la primera y no se confunda con una factura de compra.
  doc.setFillColor(...BRAND).rect(M, y, util, 12, "F");
  doc.setFont("helvetica", "bold").setFontSize(5.9).setTextColor(255, 255, 255);
  doc.text(
    "DOCUMENTO SOPORTE EN ADQUISICIONES EFECTUADAS A NO OBLIGADOS A FACTURAR",
    M + util / 2,
    y + 8,
    { align: "center" }
  );
  y += 18;

  if (s.estado === "Anulado") {
    doc.setFont("helvetica", "bold").setFontSize(38).setTextColor(211, 47, 47);
    doc.text("ANULADO", W / 2, H / 2, { align: "center", angle: 20 });
  }

  // ---------------- El VENDEDOR, identificado ----------------
  doc.setDrawColor(...LINEA).setLineWidth(0.5).line(M, y, W - M, y);
  y += 11;

  const colW = util / 2;
  const par = (etiqueta, valor, col, fila) => {
    const px = M + col * colW;
    const py = y + fila * 20;
    doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(...SOFT);
    doc.text(etiqueta, px, py);
    doc.setFont("helvetica", "bold").setFontSize(7.6).setTextColor(...DARK);
    doc.text(recortar(doc, valor || "—", colW - 8), px, py + 8.5);
  };
  par("VENDEDOR / PRESTADOR DEL SERVICIO", s.proveedorNombre, 0, 0);
  par(
    `${s.proveedorTipoDocumento || "DOCUMENTO"}`,
    s.proveedorDocumento,
    1,
    0
  );
  // La FECHA DE LA OPERACIÓN y la del pago son cosas distintas, y el art. 1.6.1.4.12 pide la
  // primera. Cuando hay pago se muestran las dos, para que nadie las confunda.
  par("FECHA DE LA OPERACIÓN", s.fecha, 0, 1);
  par(
    origen ? "PAGADO CON" : "ESTADO",
    origen ? `${origen.numero} del ${origen.fecha}` : s.estado,
    1,
    1
  );
  y += 42;

  // Este soporte legaliza un pago que ya salió: no crea una cuenta por pagar, y el impreso
  // tiene que decirlo o el lector asume el modelo contrario.
  if (origen) {
    doc.setFont("helvetica", "italic").setFontSize(5.9).setTextColor(...SOFT);
    doc.text(
      recortar(
        doc,
        `Este documento legaliza el pago del comprobante de egreso ${origen.numero}. La retención la certifica ese comprobante.`,
        util
      ),
      M,
      y
    );
    y += 10;
  }

  // ---------------- Descripción del bien o servicio ----------------
  doc.setDrawColor(...LINEA).line(M, y, W - M, y);
  y += 9;
  doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(...SOFT);
  doc.text("DESCRIPCIÓN DEL BIEN O SERVICIO ADQUIRIDO", M, y);
  y += 8;
  doc.setFont("helvetica", "normal").setFontSize(7.2).setTextColor(...DARK);
  const concepto = doc.splitTextToSize(s.concepto || "", util).slice(0, 3);
  doc.text(concepto, M, y);
  y += concepto.length * 8.6 + 5;

  // Presupuesto de espacio: se reserva el pie y la liquidación para que las tablas se trunquen
  // en vez de escribir encima.
  const altoPie = 40;
  const altoLiquidacion = 46;
  const altoImputacion = asiento?.movimientos?.length
    ? 12 + (asiento.movimientos.length + 1) * 10.5 + 6
    : 0;
  const limiteTablas = H - M - altoPie - altoLiquidacion - altoImputacion;

  // ---------------- Retenciones practicadas ----------------
  // Se leen de `RetencionPracticada` y no de los porcentajes del documento: ahí están el
  // CONCEPTO y el MUNICIPIO, que son lo que después arma el certificado del Art. 381 y la
  // declaración municipal del ICA. Si no las hay, se cae a los porcentajes guardados.
  const retenciones = (s.retencionesPracticadas || []).length
    ? s.retencionesPracticadas.map((r) => [
        RET[r.tipo] || r.tipo,
        [r.conceptoNombre, r.municipio].filter(Boolean).join(" · ") || "—",
        money(r.base),
        `${Number(r.tarifa)}${r.unidad}`,
        money(r.valor),
      ])
    : [
        Number(s.reteFuente) > 0
          ? ["ReteFuente", "—", money(s.bruto), `${Number(s.porcReteFuente)}%`, money(s.reteFuente)]
          : null,
        Number(s.reteIca) > 0
          ? ["ReteICA", s.municipioIca || "—", money(s.bruto), `${Number(s.porcReteIca)}‰`, money(s.reteIca)]
          : null,
      ].filter(Boolean);

  if (retenciones.length) {
    y = tabla(doc, {
      x: M,
      y: y + 2,
      ancho: util,
      cabeceras: ["RETENCIÓN", "CONCEPTO", "BASE", "TARIFA", "VALOR"],
      filas: retenciones,
      proporciones: [0.19, 0.28, 0.2, 0.13, 0.2],
      alinearDerechaDesde: 2,
      limiteY: limiteTablas,
    });
  }

  // ---------------- Liquidación ----------------
  y += 7;
  const cajaX = W - M - 165;
  doc.setFont("helvetica", "normal").setFontSize(6.6).setTextColor(...SOFT);
  doc.text("Valor de la operación", cajaX, y);
  doc.setTextColor(...DARK).text(money(s.bruto), W - M, y, { align: "right" });
  y += 9.5;

  const totalRet = Number(s.reteFuente || 0) + Number(s.reteIca || 0);
  if (totalRet > 0) {
    doc.setTextColor(...SOFT).text("(−) Retenciones practicadas", cajaX, y);
    doc.setTextColor(...DARK).text(money(totalRet), W - M, y, { align: "right" });
    y += 9.5;
  }
  doc.setDrawColor(...BRAND).setLineWidth(0.8).line(cajaX, y - 3.5, W - M, y - 3.5);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...BRAND);
  doc.text("NETO A PAGAR", cajaX, y + 6);
  doc.text(money(s.neto), W - M, y + 6, { align: "right" });

  doc.setFont("helvetica", "italic").setFontSize(6.4).setTextColor(...DARK);
  const letras = doc.splitTextToSize(`Son: ${numeroALetras(s.neto)}`, cajaX - M - 8);
  doc.text(letras.slice(0, 3), M, y - 1);
  y += 16;

  // ---------------- Imputación contable ----------------
  if (asiento?.movimientos?.length) {
    y = tabla(doc, {
      x: M,
      y,
      ancho: util,
      cabeceras: ["CUENTA", "DESCRIPCIÓN", "DÉBITO", "CRÉDITO"],
      filas: [
        ...asiento.movimientos.map((m) => [
          m.cuenta,
          m.nombreCuenta,
          Number(m.debito) ? money(m.debito) : "",
          Number(m.credito) ? money(m.credito) : "",
        ]),
        ["", "SUMAS IGUALES", money(asiento.totalDebitos), money(asiento.totalCreditos)],
      ],
      proporciones: [0.17, 0.41, 0.21, 0.21],
      alinearDerechaDesde: 2,
      ultimaEnNegrita: true,
      limiteY: H - M - altoPie,
    });
  }

  // ---------------- Pie ----------------
  const pieY = H - M - 22;
  doc.setDrawColor(...LINEA).setLineWidth(0.5).line(M, pieY - 8, W - M, pieY - 8);

  doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(...SOFT);
  const trazabilidad = [
    asiento?.numero ? `Asiento ${asiento.numero}` : "Pendiente por contabilizar",
    s.estado === "Anulado" && s.fechaAnulacion
      ? `Anulado el ${s.fechaAnulacion}${s.motivoAnulacion ? `: ${s.motivoAnulacion}` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(doc.splitTextToSize(trazabilidad, util).slice(0, 2), M, pieY);

  // Se dice qué es y qué no es. Alguien tiene que poder distinguir esta representación del
  // documento electrónico validado por la DIAN sin preguntar.
  doc.setFontSize(5.2);
  doc.text(
    doc.splitTextToSize(
      "Expedido por el adquirente conforme al art. 1.6.1.4.12 del D.U.T. 1625 de 2016 y a la Res. DIAN 000167 de 2021. Representación impresa: no reemplaza el documento soporte electrónico validado por la DIAN.",
      util
    ).slice(0, 3),
    M,
    pieY + 9
  );
}

function recortar(doc, texto, ancho) {
  const t = String(texto ?? "");
  if (doc.getTextWidth(t) <= ancho) return t;
  let corto = t;
  while (corto.length > 1 && doc.getTextWidth(corto + "…") > ancho) corto = corto.slice(0, -1);
  return corto + "…";
}

/**
 * Tabla densa, igual que la del comprobante: si las filas no caben antes de `limiteY` se trunca
 * indicando cuántas quedaron fuera, en vez de escribir sobre el pie.
 */
function tabla(doc, { x, y, ancho, cabeceras, filas, proporciones, alinearDerechaDesde, ultimaEnNegrita = false, limiteY = null }) {
  const alturaFila = 10.5;
  const anchos = proporciones.map((p) => ancho * p);

  if (limiteY) {
    const caben = Math.floor((limiteY - y - 11) / alturaFila);
    if (caben < 1) return y;
    if (filas.length > caben) {
      const omitidas = filas.length - (caben - 1);
      const aviso = new Array(cabeceras.length).fill("");
      aviso[0] = `… y ${omitidas} más`;
      filas = [...filas.slice(0, caben - 1), aviso];
    }
  }

  doc.setFillColor(...BRAND).rect(x, y, ancho, 9.5, "F");
  doc.setFont("helvetica", "bold").setFontSize(5.4).setTextColor(255, 255, 255);
  let cx = x + 3;
  cabeceras.forEach((h, i) => {
    const derecha = i >= alinearDerechaDesde;
    doc.text(h, derecha ? cx + anchos[i] - 5 : cx, y + 6.5, { align: derecha ? "right" : "left" });
    cx += anchos[i];
  });
  y += 9.5;

  doc.setFontSize(6.2);
  filas.forEach((fila, idx) => {
    const esUltima = ultimaEnNegrita && idx === filas.length - 1;
    if (idx % 2 === 1 && !esUltima) doc.setFillColor(...ZEBRA).rect(x, y, ancho, alturaFila, "F");
    doc.setFont("helvetica", esUltima ? "bold" : "normal").setTextColor(...(esUltima ? BRAND : DARK));
    let px = x + 3;
    fila.forEach((celda, i) => {
      const derecha = i >= alinearDerechaDesde;
      doc.text(recortar(doc, celda, anchos[i] - 6), derecha ? px + anchos[i] - 5 : px, y + 7, {
        align: derecha ? "right" : "left",
      });
      px += anchos[i];
    });
    y += alturaFila;
  });

  doc.setDrawColor(...LINEA).setLineWidth(0.4).line(x, y, x + ancho, y);
  return y + 2;
}
