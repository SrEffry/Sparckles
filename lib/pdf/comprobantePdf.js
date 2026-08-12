// Comprobante de ingreso / egreso en PDF.
//
// OPTIMIZACIÓN DE PAPEL. La plantilla de referencia usaba una hoja A4 completa por
// comprobante, con mucho aire y hasta cinco bloques de firma.
//
// Aquí la PÁGINA mide media A4 (595 × 421 pt). Imprimir dos copias del mismo comprobante en
// una A4 no ahorraba nada: gastaba la misma hoja. Con una página de media A4, el documento
// ocupa de verdad la mitad, y quien quiera aprovechar la hoja completa imprime dos páginas
// por cara desde el diálogo de impresión.
//
// `copias: 2` añade una SEGUNDA PÁGINA marcada COPIA (para el "original y copia" de caja),
// no una segunda mitad en la misma hoja.
//
// Qué se recortó y por qué se puede:
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
const LINEA = [210, 210, 214];

const money = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(
    Number(v) || 0
  );

const ETIQUETAS = {
  ingreso: { titulo: "COMPROBANTE DE INGRESO", tercero: "RECIBIDO DE", neto: "NETO RECIBIDO" },
  egreso: { titulo: "COMPROBANTE DE EGRESO", tercero: "PAGADO A", neto: "NETO PAGADO" },
};

const RET = { retefuente: "ReteFuente", reteiva: "ReteIVA", reteica: "ReteICA" };

// Media A4 en puntos. Ancho de A4, la mitad de su alto.
const ANCHO = 595.28;
const ALTO = 420.94;

/**
 * @param comprobante      con aplicaciones y retenciones
 * @param opciones.emisor  respaldo del encabezado si el comprobante no tiene snapshot
 * @param opciones.asiento asiento contabilizado, para imprimir la imputación
 * @param opciones.copias  1 (por defecto) u 2 para original + copia, en páginas separadas
 */
export async function generarComprobantePDF(comprobante, opciones = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: [ANCHO, ALTO] });

  dibujar(doc, comprobante, opciones, 0, ANCHO, ALTO);

  if (opciones.copias === 2) {
    doc.addPage([ANCHO, ALTO]);
    dibujar(doc, comprobante, { ...opciones, copia: true }, 0, ANCHO, ALTO);
  }

  doc.save(`${comprobante.numero || "comprobante"}.pdf`);
}

function dibujar(doc, c, opciones, offsetY, W, alto) {
  // El emisor sale del snapshot congelado al contabilizar. Se acepta `opciones.emisor` como
  // respaldo, pero el snapshot manda: un comprobante histórico debe seguir mostrando la
  // razón social que tenía la empresa entonces.
  const emisor = c.emisorSnapshot || opciones.emisor || {};
  const asiento = opciones.asiento;
  const et = ETIQUETAS[c.tipo] || ETIQUETAS.ingreso;
  const M = 34;
  let y = offsetY + 26;

  // ---------- Encabezado: emisor a la izquierda, documento a la derecha ----------
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...BRAND);
  doc.text(emisor.razonSocial || c.emisorRazonSocial || "—", M, y);

  doc.setFont("helvetica", "normal").setFontSize(6.8).setTextColor(...SOFT);
  const lineasEmisor = [
    emisor.nit ? `NIT: ${emisor.nit}` : null,
    [emisor.direccion, emisor.ciudad].filter(Boolean).join(", ") || null,
    [emisor.telefono, emisor.email].filter(Boolean).join(" · ") || null,
  ].filter(Boolean);
  lineasEmisor.forEach((t, i) => doc.text(t, M, y + 10 + i * 7.5));

  // Caja del documento
  const boxW = 150;
  const boxX = W - M - boxW;
  doc.setDrawColor(...BRAND).setLineWidth(0.8).roundedRect(boxX, y - 12, boxW, 40, 3, 3);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...BRAND);
  doc.text(et.titulo, boxX + boxW / 2, y - 1, { align: "center" });
  doc.setFontSize(12).setTextColor(...DARK);
  doc.text(c.numero || "BORRADOR", boxX + boxW / 2, y + 13, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(6.8).setTextColor(...SOFT);
  doc.text(`Fecha: ${c.fecha}${c.ciudad ? " · " + c.ciudad : ""}`, boxX + boxW / 2, y + 23, { align: "center" });

  if (opciones.copia) {
    doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(...SOFT);
    doc.text("COPIA", boxX + boxW - 4, y - 16, { align: "right" });
  }

  // Marca de anulado / reversado
  if (c.estado === "anulado" || c.estado === "reversado") {
    doc.setFont("helvetica", "bold").setFontSize(34).setTextColor(211, 47, 47);
    doc.text(c.estado.toUpperCase(), W / 2, offsetY + alto / 2, { align: "center", angle: 18 });
  }

  y += 40;

  // ---------- Tercero y medio de pago, en una franja compacta ----------
  doc.setDrawColor(...LINEA).setLineWidth(0.5).line(M, y, W - M, y);
  y += 11;

  const col = (W - 2 * M) / 4;
  const dato = (etiqueta, valor, i) => {
    doc.setFont("helvetica", "normal").setFontSize(6).setTextColor(...SOFT);
    doc.text(etiqueta, M + col * i, y);
    doc.setFont("helvetica", "bold").setFontSize(7.8).setTextColor(...DARK);
    doc.text(recortar(doc, valor || "—", col - 6), M + col * i, y + 9);
  };
  dato(et.tercero, c.terceroNombre, 0);
  dato("NIT / C.C.", c.terceroDocumento, 1);
  dato("MEDIO DE PAGO", c.medioPago, 2);
  dato("N.º TRANSACCIÓN", c.numTransaccion, 3);

  y += 18;

  // Segunda franja: datos que se capturan y antes no llegaban al impreso. La dirección del
  // beneficiario la exige el certificado de retención, y el cheque hay que poder rastrearlo.
  const extras = [
    c.cuentaTesoreriaNombre
      ? `CUENTA: ${c.cuentaTesoreriaNombre}${c.cuentaTesoreriaPuc ? ` (${c.cuentaTesoreriaPuc})` : ""}`
      : null,
    c.terceroDireccion ? `DIRECCIÓN: ${c.terceroDireccion}` : null,
    c.chequeBanco ? `CHEQUE: ${c.chequeBanco}${c.chequeFecha ? ` del ${c.chequeFecha}` : ""}` : null,
    // Un comprobante reversado o reversor debe decirlo en el papel, no solo en pantalla.
    c.reversadoEn ? `REVERSADO EL ${c.reversadoEn}` : null,
  ].filter(Boolean);

  if (extras.length) {
    doc.setFont("helvetica", "normal").setFontSize(6).setTextColor(...SOFT);
    for (const linea of extras) {
      doc.text(recortar(doc, linea, W - 2 * M), M, y);
      y += 8.5;
    }
    y += 2;
  }

  // ---------- Concepto ----------
  doc.setDrawColor(...LINEA).line(M, y, W - M, y);
  y += 10;
  doc.setFont("helvetica", "normal").setFontSize(6).setTextColor(...SOFT);
  doc.text("CONCEPTO", M, y);
  y += 8;
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...DARK);
  const concepto = doc.splitTextToSize(c.concepto || "", W - 2 * M);
  doc.text(concepto.slice(0, 3), M, y);
  y += Math.min(concepto.length, 3) * 9 + 4;

  // Espacio disponible para las tablas antes de chocar con la liquidación y el pie. Sin este
  // control, un comprobante con muchos documentos aplicados escribía encima del pie y se
  // salía de la página.
  const pieAlto = necesitaFirma(c) ? 44 : 22;
  const reservaLiquidacion = 42;
  const limiteTablas = offsetY + alto - pieAlto - reservaLiquidacion - (asiento?.movimientos?.length ? 0 : 0);

  // ---------- Documentos aplicados ----------
  if (c.aplicaciones?.length) {
    const filas = c.aplicaciones.map((a) => [
      a.docRef,
      money(a.valorDocumento),
      money(a.saldoAnterior),
      money(a.valorAplicado),
      money(a.saldoNuevo),
    ]);
    y = tablaCompacta(
      doc,
      M,
      y,
      W - 2 * M,
      ["DOCUMENTO", "VALOR", "SALDO ANTES", "APLICADO", "SALDO DESPUÉS"],
      filas,
      [0.28, 0.18, 0.18, 0.18, 0.18],
      false,
      // Se reparte el espacio: el asiento contable también tiene que caber.
      limiteTablas - (asiento?.movimientos?.length ? 90 : 0)
    );
  }

  // ---------- Retenciones ----------
  if (c.retenciones?.length) {
    y = tablaCompacta(
      doc,
      M,
      y + 3,
      W - 2 * M,
      ["RETENCIÓN", "CONCEPTO", "BASE", "TARIFA", "VALOR"],
      c.retenciones.map((r) => [
        RET[r.tipo] || r.tipo,
        // El municipio del ICA decide en qué declaración se descuenta: sin él, esa
        // declaración municipal se liquida mal.
        [r.concepto, r.municipio].filter(Boolean).join(" · ") || "—",
        money(r.base),
        `${Number(r.tarifa)}${r.unidad}`,
        money(r.valor),
      ]),
      [0.18, 0.32, 0.2, 0.12, 0.18],
      false,
      limiteTablas - (asiento?.movimientos?.length ? 90 : 0)
    );
  }

  // ---------- Liquidación y valor en letras ----------
  y += 6;
  const cajaX = W - M - 200;
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...SOFT);
  doc.text("Valor bruto", cajaX, y);
  doc.setTextColor(...DARK).text(money(c.valorBruto), W - M, y, { align: "right" });
  y += 10;
  if (Number(c.totalRetenciones) > 0) {
    doc.setTextColor(...SOFT).text("(−) Retenciones", cajaX, y);
    doc.setTextColor(...DARK).text(money(c.totalRetenciones), W - M, y, { align: "right" });
    y += 10;
  }
  doc.setDrawColor(...BRAND).setLineWidth(0.8).line(cajaX, y - 4, W - M, y - 4);
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...BRAND);
  doc.text(et.neto, cajaX, y + 6);
  doc.text(money(c.neto), W - M, y + 6, { align: "right" });

  // El valor en letras es sobre el NETO: es lo que se entregó o se recibió.
  doc.setFont("helvetica", "italic").setFontSize(6.8).setTextColor(...DARK);
  const letras = doc.splitTextToSize(`Son: ${numeroALetras(c.neto)}`, cajaX - M - 10);
  doc.text(letras.slice(0, 3), M, y - 2);
  y += 16;

  // ---------- Imputación contable ----------
  if (asiento?.movimientos?.length) {
    y = tablaCompacta(
      doc,
      M,
      y,
      W - 2 * M,
      ["CUENTA", "DESCRIPCIÓN", "TERCERO", "DÉBITO", "CRÉDITO"],
      [
        ...asiento.movimientos.map((m) => [
          m.cuenta,
          m.nombreCuenta,
          m.tercero || "—",
          Number(m.debito) ? money(m.debito) : "",
          Number(m.credito) ? money(m.credito) : "",
        ]),
        ["", "", "SUMAS IGUALES", money(asiento.totalDebitos), money(asiento.totalCreditos)],
      ],
      [0.14, 0.36, 0.16, 0.17, 0.17],
      true
    );
  }

  // ---------- Pie: una sola franja en vez de cinco bloques ----------
  const pieY = offsetY + alto - (necesitaFirma(c) ? 44 : 22);
  doc.setDrawColor(...LINEA).setLineWidth(0.5).line(M, pieY - 8, W - M, pieY - 8);

  doc.setFont("helvetica", "normal").setFontSize(6.2).setTextColor(...SOFT);
  const trazabilidad = [
    c.elaboradoPor ? `Elaborado por: ${c.elaboradoPor}` : null,
    c.elaboradoEn ? fechaHora(c.elaboradoEn) : null,
    c.autorizadoPor ? `Autorizado por: ${c.autorizadoPor}` : null,
    asiento?.numero ? `Asiento ${asiento.numero}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(trazabilidad, M, pieY);

  // Firma de recibido: solo en efectivo o cheque. En transferencia el soporte es el extracto.
  if (necesitaFirma(c)) {
    const fy = pieY + 26;
    doc.setDrawColor(...DARK).setLineWidth(0.5);
    doc.line(M, fy, M + 190, fy);
    doc.setFontSize(6).setTextColor(...SOFT);
    doc.text("FIRMA DE RECIBIDO — Nombre, C.C. y fecha", M, fy + 8);
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
  let t = String(texto);
  while (doc.getTextWidth(t) > ancho && t.length > 3) t = t.slice(0, -2);
  return t.length < String(texto).length ? t + "…" : t;
}

/**
 * Tabla densa, sin relleno decorativo: es lo que permite que el comprobante quepa en media
 * hoja. Si `limiteY` está definido y las filas no caben, se trunca y se indica cuántas
 * quedaron fuera — antes el contenido se escribía encima del pie y se salía de la página.
 */
function tablaCompacta(doc, x, y, ancho, cabeceras, filas, proporciones, ultimaEnNegrita = false, limiteY = null) {
  const alturaFila = 11;
  const anchos = proporciones.map((p) => ancho * p);

  let omitidas = 0;
  if (limiteY) {
    const caben = Math.max(1, Math.floor((limiteY - y - 10) / alturaFila));
    if (filas.length > caben) {
      // Se deja una fila para el aviso de truncamiento.
      omitidas = filas.length - (caben - 1);
      filas = [...filas.slice(0, caben - 1), [`… y ${omitidas} más`, "", "", "", ""]];
    }
  }

  doc.setFillColor(...BRAND);
  doc.rect(x, y, ancho, 10, "F");
  doc.setFont("helvetica", "bold").setFontSize(5.8).setTextColor(255, 255, 255);
  let cx = x + 3;
  cabeceras.forEach((h, i) => {
    const alinearDerecha = i >= cabeceras.length - 2;
    doc.text(h, alinearDerecha ? cx + anchos[i] - 6 : cx, y + 6.8, {
      align: alinearDerecha ? "right" : "left",
    });
    cx += anchos[i];
  });
  y += 10;

  doc.setFont("helvetica", "normal").setFontSize(6.6);
  filas.forEach((fila, idx) => {
    const esUltima = ultimaEnNegrita && idx === filas.length - 1;
    if (idx % 2 === 1 && !esUltima) {
      doc.setFillColor(249, 246, 247).rect(x, y, ancho, alturaFila, "F");
    }
    doc.setFont("helvetica", esUltima ? "bold" : "normal").setTextColor(...(esUltima ? BRAND : DARK));
    let px = x + 3;
    fila.forEach((celda, i) => {
      const alinearDerecha = i >= fila.length - 2;
      doc.text(recortar(doc, celda, anchos[i] - 7), alinearDerecha ? px + anchos[i] - 6 : px, y + 7.5, {
        align: alinearDerecha ? "right" : "left",
      });
      px += anchos[i];
    });
    y += alturaFila;
  });

  doc.setDrawColor(...LINEA).setLineWidth(0.4).line(x, y, x + ancho, y);
  return y + 2;
}
