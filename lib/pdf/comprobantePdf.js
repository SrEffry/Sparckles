// Comprobante de ingreso / egreso en PDF.
//
// FORMATO: A5 VERTICAL (420,94 × 595,28 pt). A5 es exactamente la mitad de una A4, así que el
// comprobante gasta media hoja de verdad y conserva la orientación vertical de un documento
// contable. Quien quiera aprovechar la hoja completa imprime dos páginas por cara.
//
// El ancho útil es de ~369 pt, la mitad que en A4, así que la maquetación está pensada para
// esa medida: los datos del tercero van en dos columnas y no en cuatro, y la tabla de
// imputación no repite el tercero en cada línea — desde que un comprobante corresponde a un
// solo tercero, ese dato vive en el encabezado y repetirlo era gastar ancho en vano.
//
// `copias: 2` añade una SEGUNDA PÁGINA marcada COPIA (el "original y copia" de caja).
//
// Qué se recortó de la plantilla original y por qué se puede:
//   · El Decreto 2649 art. 124 exige "las personas que lo elaboraron y autorizaron", e
//     indicación de las personas — NO rúbrica manuscrita. Un comprobante que imprime el
//     usuario autenticado con fecha y hora cumple mejor que una raya en blanco.
//   · "Revisado por — Contador Público" es costumbre, no norma: el contador firma estados
//     financieros, no cada comprobante. Se eliminó.
//   · "Contabilizado — firma y sello" no es una persona, es un estado. Se reemplazó por el
//     número del asiento, que además da la trazabilidad que el art. 124 sí exige.
//   · La firma de recibido se imprime SOLO en efectivo o cheque. En transferencia el soporte
//     es el extracto bancario, y una raya para firmar sobra.

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

const ETIQUETAS = {
  ingreso: { titulo: "COMPROBANTE DE INGRESO", tercero: "RECIBIDO DE", neto: "NETO RECIBIDO" },
  egreso: { titulo: "COMPROBANTE DE EGRESO", tercero: "PAGADO A", neto: "NETO PAGADO" },
};

const RET = { retefuente: "ReteFuente", reteiva: "ReteIVA", reteica: "ReteICA" };

const M = 26; // margen

/**
 * @param comprobante      con aplicaciones y retenciones
 * @param opciones.emisor  respaldo del encabezado si el comprobante no tiene snapshot
 * @param opciones.asiento asiento contabilizado, para imprimir la imputación
 * @param opciones.copias  1 (por defecto) o 2 para original + copia, en páginas separadas
 */
export async function generarComprobantePDF(comprobante, opciones = {}) {
  const { jsPDF } = await import("jspdf");

  // A5 vertical. Se usa el formato con nombre en vez de medidas sueltas: al pasar
  // `[ancho, alto]` jsPDF los reordena según la orientación y la página salía girada.
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a5" });

  // Se leen del documento, no de constantes: si el formato cambia, el dibujo se adapta en
  // vez de salirse del papel en silencio.
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  dibujar(doc, comprobante, opciones, W, H);

  if (opciones.copias === 2) {
    doc.addPage("a5", "portrait");
    dibujar(doc, comprobante, { ...opciones, copia: true }, W, H);
  }

  doc.save(`${comprobante.numero || "comprobante"}.pdf`);
}

function dibujar(doc, c, opciones, W, H) {
  // El emisor sale del snapshot congelado al contabilizar. `opciones.emisor` es solo
  // respaldo: un comprobante histórico debe seguir mostrando la razón social de entonces.
  const emisor = c.emisorSnapshot || opciones.emisor || {};
  const asiento = opciones.asiento;
  const et = ETIQUETAS[c.tipo] || ETIQUETAS.ingreso;
  const util = W - 2 * M;
  let y = M + 4;

  // ---------------- Encabezado ----------------
  // La caja del documento va arriba a la derecha; el emisor ocupa lo que queda a su izquierda.
  const boxW = 150;
  const boxX = W - M - boxW;
  const anchoEmisor = boxX - M - 10;

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...BRAND);
  doc.text(recortar(doc, emisor.razonSocial || c.emisorRazonSocial || "—", anchoEmisor), M, y + 8);

  doc.setFont("helvetica", "normal").setFontSize(6.4).setTextColor(...SOFT);
  const lineasEmisor = [
    emisor.nit ? `NIT: ${emisor.nit}` : null,
    [emisor.direccion, emisor.ciudad].filter(Boolean).join(", ") || null,
    [emisor.telefono, emisor.email].filter(Boolean).join(" · ") || null,
  ].filter(Boolean);
  lineasEmisor.forEach((t, i) => doc.text(recortar(doc, t, anchoEmisor), M, y + 19 + i * 7.5));

  doc.setDrawColor(...BRAND).setLineWidth(0.8).roundedRect(boxX, y, boxW, 40, 3, 3);
  doc.setFont("helvetica", "bold").setFontSize(7.4).setTextColor(...BRAND);
  doc.text(et.titulo, boxX + boxW / 2, y + 12, { align: "center" });
  doc.setFontSize(12).setTextColor(...DARK);
  doc.text(c.numero || "BORRADOR", boxX + boxW / 2, y + 26, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(6.4).setTextColor(...SOFT);
  doc.text(`${c.fecha}${c.ciudad ? " · " + c.ciudad : ""}`, boxX + boxW / 2, y + 35, { align: "center" });

  if (opciones.copia) {
    doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...SOFT);
    doc.text("COPIA", boxX + boxW, y - 3, { align: "right" });
  }

  y += Math.max(44, 19 + lineasEmisor.length * 7.5);

  // Marca de agua de estado, centrada en la página.
  if (c.estado === "anulado" || c.estado === "reversado") {
    doc.setFont("helvetica", "bold").setFontSize(38).setTextColor(211, 47, 47);
    doc.text(c.estado.toUpperCase(), W / 2, H / 2, { align: "center", angle: 20 });
  }

  // ---------------- Tercero y pago, en dos columnas ----------------
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
  par(et.tercero, c.terceroNombre, 0, 0);
  par("NIT / C.C.", c.terceroDocumento, 1, 0);
  par("MEDIO DE PAGO", c.medioPago, 0, 1);
  par("N.º TRANSACCIÓN", c.numTransaccion, 1, 1);
  y += 40;

  // Datos que se capturan y antes no llegaban al impreso.
  const extras = [
    c.cuentaTesoreriaNombre
      ? `CUENTA: ${c.cuentaTesoreriaNombre}${c.cuentaTesoreriaPuc ? ` (${c.cuentaTesoreriaPuc})` : ""}`
      : null,
    // La dirección del beneficiario la exige el certificado de retención.
    c.terceroDireccion ? `DIRECCIÓN: ${c.terceroDireccion}` : null,
    c.chequeBanco ? `CHEQUE: ${c.chequeBanco}${c.chequeFecha ? ` del ${c.chequeFecha}` : ""}` : null,
    c.reversadoEn ? `REVERSADO EL ${c.reversadoEn}` : null,
  ].filter(Boolean);

  if (extras.length) {
    doc.setFont("helvetica", "normal").setFontSize(5.9).setTextColor(...SOFT);
    for (const linea of extras) {
      doc.text(recortar(doc, linea, util), M, y);
      y += 8;
    }
    y += 2;
  }

  // ---------------- Concepto ----------------
  doc.setDrawColor(...LINEA).line(M, y, W - M, y);
  y += 9;
  doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(...SOFT);
  doc.text("CONCEPTO", M, y);
  y += 8;
  doc.setFont("helvetica", "normal").setFontSize(7.2).setTextColor(...DARK);
  const concepto = doc.splitTextToSize(c.concepto || "", util);
  const lineasConcepto = concepto.slice(0, 3);
  doc.text(lineasConcepto, M, y);
  y += lineasConcepto.length * 8.6 + 5;

  // Presupuesto de espacio: se reserva lo que ocupan la liquidación, la imputación y el pie,
  // para que las tablas se trunquen en vez de escribir encima.
  const altoPie = necesitaFirma(c) ? 46 : 24;
  const altoLiquidacion = 40;
  const altoImputacion = asiento?.movimientos?.length
    ? 12 + (asiento.movimientos.length + 1) * 10.5 + 6
    : 0;
  const limiteTablas = H - M - altoPie - altoLiquidacion - altoImputacion;

  // ---------------- Documentos aplicados ----------------
  if (c.aplicaciones?.length) {
    y = tabla(doc, {
      x: M,
      y,
      ancho: util,
      cabeceras: ["DOCUMENTO", "VALOR", "SALDO ANTES", "APLICADO", "SALDO DESP."],
      filas: c.aplicaciones.map((a) => [
        a.docRef,
        money(a.valorDocumento),
        money(a.saldoAnterior),
        money(a.valorAplicado),
        money(a.saldoNuevo),
      ]),
      proporciones: [0.22, 0.195, 0.195, 0.195, 0.195],
      alinearDerechaDesde: 1,
      limiteY: limiteTablas,
    });
  }

  // ---------------- Retenciones ----------------
  if (c.retenciones?.length) {
    y = tabla(doc, {
      x: M,
      y: y + 3,
      ancho: util,
      cabeceras: ["RETENCIÓN", "CONCEPTO", "BASE", "TARIFA", "VALOR"],
      filas: c.retenciones.map((r) => [
        RET[r.tipo] || r.tipo,
        // El municipio del ICA decide en qué declaración municipal se descuenta.
        [r.concepto, r.municipio].filter(Boolean).join(" · ") || "—",
        money(r.base),
        `${Number(r.tarifa)}${r.unidad}`,
        money(r.valor),
      ]),
      proporciones: [0.19, 0.28, 0.2, 0.13, 0.2],
      alinearDerechaDesde: 2,
      limiteY: limiteTablas,
    });
  }

  // ---------------- Liquidación y valor en letras ----------------
  y += 7;
  const cajaX = W - M - 165;
  doc.setFont("helvetica", "normal").setFontSize(6.6).setTextColor(...SOFT);
  doc.text("Valor bruto", cajaX, y);
  doc.setTextColor(...DARK).text(money(c.valorBruto), W - M, y, { align: "right" });
  y += 9.5;
  if (Number(c.totalRetenciones) > 0) {
    doc.setTextColor(...SOFT).text("(−) Retenciones", cajaX, y);
    doc.setTextColor(...DARK).text(money(c.totalRetenciones), W - M, y, { align: "right" });
    y += 9.5;
  }
  doc.setDrawColor(...BRAND).setLineWidth(0.8).line(cajaX, y - 3.5, W - M, y - 3.5);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...BRAND);
  doc.text(et.neto, cajaX, y + 6);
  doc.text(money(c.neto), W - M, y + 6, { align: "right" });

  // El valor en letras es sobre el NETO: es lo que se entregó o se recibió.
  doc.setFont("helvetica", "italic").setFontSize(6.4).setTextColor(...DARK);
  const letras = doc.splitTextToSize(`Son: ${numeroALetras(c.neto)}`, cajaX - M - 8);
  doc.text(letras.slice(0, 3), M, y - 1);
  y += 15;

  // ---------------- Imputación contable ----------------
  // Sin columna de tercero: un comprobante corresponde a UN tercero, que ya está arriba.
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
  const pieY = H - M - (necesitaFirma(c) ? 30 : 6);
  doc.setDrawColor(...LINEA).setLineWidth(0.5).line(M, pieY - 8, W - M, pieY - 8);

  doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(...SOFT);
  const trazabilidad = [
    c.elaboradoPor ? `Elaborado por: ${c.elaboradoPor}` : null,
    c.elaboradoEn ? fechaHora(c.elaboradoEn) : null,
    c.autorizadoPor ? `Autorizado por: ${c.autorizadoPor}` : null,
    asiento?.numero ? `Asiento ${asiento.numero}` : null,
    c.anuladoPor ? `Anulado por: ${c.anuladoPor} el ${c.fechaAnulacion || ""}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(doc.splitTextToSize(trazabilidad, util).slice(0, 2), M, pieY);

  // Firma de recibido: solo en efectivo o cheque. En transferencia el soporte es el extracto.
  if (necesitaFirma(c)) {
    const fy = H - M - 8;
    doc.setDrawColor(...DARK).setLineWidth(0.5).line(M, fy, M + 180, fy);
    doc.setFontSize(5.6).setTextColor(...SOFT);
    doc.text("FIRMA DE RECIBIDO — Nombre, C.C. y fecha", M, fy + 7);
  }
}

function necesitaFirma(c) {
  const m = (c.medioPago || "").toLowerCase();
  return m.includes("efectivo") || m.includes("cheque");
}

function fechaHora(iso) {
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

/**
 * Tabla densa: es lo que permite que el comprobante quepa en A5. Si las filas no caben antes
 * de `limiteY`, se trunca indicando cuántas quedaron fuera, en vez de escribir sobre el pie.
 */
function tabla(doc, { x, y, ancho, cabeceras, filas, proporciones, alinearDerechaDesde, ultimaEnNegrita = false, limiteY = null }) {
  const alturaFila = 10.5;
  const anchos = proporciones.map((p) => ancho * p);

  if (limiteY) {
    const caben = Math.floor((limiteY - y - 11) / alturaFila);
    if (caben < 1) return y; // no hay sitio: se omite la tabla entera antes que romper la página
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
