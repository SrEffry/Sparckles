// Representación gráfica (PDF) de la factura de venta. Client-side con jsPDF.
// Nota: no es la factura electrónica DIAN (sin CUFE/QR); es su representación imprimible.

const BRAND = [128, 25, 49]; // #801931
const SOFT = [134, 134, 139];
const DARK = [29, 29, 31];

const money = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export async function generarFacturaPDF(f) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const emisor = f.emisorSnapshot || {};

  // ---- Encabezado: emisor ----
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...BRAND);
  doc.text(f.emisorRazonSocial || "Emisor", M, 54);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SOFT);
  const emisorLineas = [
    `NIT: ${f.emisorNit || "—"}   ${f.emisorRegimen || ""}`,
    [emisor.direccion, emisor.ciudad].filter(Boolean).join(", "),
    [emisor.telefono && `Tel: ${emisor.telefono}`, emisor.email].filter(Boolean).join("   "),
  ].filter(Boolean);
  emisorLineas.forEach((t, i) => doc.text(t, M, 70 + i * 12));

  // ---- Caja documento (derecha) ----
  const boxW = 190;
  const boxX = W - M - boxW;
  doc.setDrawColor(...BRAND).setLineWidth(1).roundedRect(boxX, 44, boxW, 70, 6, 6);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...BRAND);
  doc.text("FACTURA DE VENTA", boxX + boxW / 2, 62, { align: "center" });
  doc.setFontSize(15).setTextColor(...DARK);
  doc.text(f.numeroCompleto || "", boxX + boxW / 2, 84, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...SOFT);
  doc.text(`Fecha: ${f.fecha || "—"}`, boxX + boxW / 2, 100, { align: "center" });
  if (emisor.resNumero)
    doc.text(`Resolución DIAN: ${emisor.resNumero}`, boxX + boxW / 2, 110, { align: "center" });

  // ---- Estado (marca de agua si anulada) ----
  if (f.estado === "anulada") {
    doc.setFont("helvetica", "bold").setFontSize(60).setTextColor(211, 47, 47);
    doc.saveGraphicsState?.();
    doc.text("ANULADA", W / 2, 420, { align: "center", angle: 30 });
    doc.restoreGraphicsState?.();
  }

  // ---- Cliente ----
  let y = 140;
  doc.setDrawColor(224).setFillColor(250, 250, 250).roundedRect(M, y, W - 2 * M, 58, 6, 6, "FD");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...SOFT);
  doc.text("CLIENTE", M + 14, y + 18);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...DARK);
  doc.text(f.clienteNombre || "—", M + 14, y + 34);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SOFT);
  const docCli = `${f.clienteTipoDocumento || ""} ${f.clienteNumeroDocumento || ""}${f.clienteDv ? "-" + f.clienteDv : ""}`.trim();
  doc.text(
    [docCli, f.clienteTelefono, f.clienteEmail].filter(Boolean).join("   "),
    M + 14,
    y + 48
  );
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SOFT);
  doc.text(`Forma de pago: ${f.formaPago || "—"}`, W - M - 14, y + 34, { align: "right" });
  if (f.fechaVencimiento)
    doc.text(`Vence: ${f.fechaVencimiento}`, W - M - 14, y + 48, { align: "right" });

  // ---- Ítems ----
  y += 74;
  autoTable(doc, {
    startY: y,
    head: [["#", "Descripción", "Cant.", "P. Unit.", "Dto.", "IVA", "Base", "Total"]],
    body: (f.items || []).map((it, i) => [
      i + 1,
      it.descripcion,
      Number(it.cantidad),
      money(it.precioUnitario),
      money(it.descuento),
      `${Number(it.tarifaIva)}%`,
      money(it.base),
      money(it.subtotal),
    ]),
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 5, textColor: DARK },
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 244, 246] },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  // ---- Totales ----
  let ty = doc.lastAutoTable.finalY + 16;
  const tbX = W - M - 220;
  const fila = (label, val, bold, color) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 11 : 9);
    doc.setTextColor(...(color || (bold ? BRAND : SOFT)));
    doc.text(label, tbX, ty);
    doc.setTextColor(...(color || (bold ? BRAND : DARK)));
    doc.text(val, W - M, ty, { align: "right" });
    ty += bold ? 20 : 15;
  };
  // TODAS las partidas que mueven el total van impresas. El impreso mostraba solo subtotal, IVA
  // y ReteFuente, así que en una factura con INC, ReteIVA o ReteICA los renglones visibles NO
  // sumaban el TOTAL A COBRAR: el cliente veía una diferencia sin explicación y el documento
  // dejaba de ser verificable. El INC va aparte del IVA a propósito —no es IVA, no es
  // descontable y se declara en su propio formulario—.
  fila("Subtotal", money(f.subtotal));
  if (Number(f.totalDescuentos) > 0) fila("Descuentos", `-${money(f.totalDescuentos)}`);
  fila("IVA", money(f.iva));
  if (Number(f.inc) > 0) fila("Impuesto al consumo", money(f.inc));
  if (Number(f.otrosImpuestos) > 0) fila("Otros impuestos", money(f.otrosImpuestos));
  // El total facturado, antes de las retenciones: es el renglón que el cliente concilia contra
  // su propia contabilización de la compra. Solo se imprime si difiere del total a cobrar.
  if (Number(f.total) > 0 && Number(f.total) !== Number(f.totalACobrar))
    fila("Total factura", money(f.total));
  if (Number(f.retenciones) > 0) fila("ReteFuente", `-${money(f.retenciones)}`, false, [45, 122, 75]);
  if (Number(f.reteIva) > 0) fila("ReteIVA", `-${money(f.reteIva)}`, false, [45, 122, 75]);
  if (Number(f.reteIca) > 0) fila("ReteICA", `-${money(f.reteIca)}`, false, [45, 122, 75]);
  doc.setDrawColor(...BRAND).setLineWidth(1).line(tbX, ty - 6, W - M, ty - 6);
  fila("TOTAL A COBRAR", money(f.totalACobrar), true);

  // ---- Observaciones + pie ----
  if (f.observaciones) {
    doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(...SOFT);
    doc.text(doc.splitTextToSize(`Observaciones: ${f.observaciones}`, W - 2 * M - 240), M, doc.lastAutoTable.finalY + 24);
  }
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...SOFT);
  doc.text(
    "Representación gráfica de la factura de venta. Este documento no reemplaza la factura electrónica DIAN (CUFE).",
    W / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: "center" }
  );

  doc.save(`${f.numeroCompleto || "factura"}.pdf`);
}
