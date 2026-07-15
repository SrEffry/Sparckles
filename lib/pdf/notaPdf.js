// Representación gráfica (PDF) de una nota débito/crédito. Client-side con jsPDF.
const BRAND = [128, 25, 49];
const SOFT = [134, 134, 139];
const DARK = [29, 29, 31];

const money = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export async function generarNotaPDF(n) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const esCredito = n.tipo === "credito";
  const titulo = esCredito ? "NOTA CRÉDITO" : "NOTA DÉBITO";

  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...BRAND);
  doc.text(titulo, M, 56);
  doc.setFontSize(13).setTextColor(...DARK);
  doc.text(n.numero || "", M, 76);

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SOFT);
  doc.text(`Fecha: ${n.fecha || "—"}`, W - M, 56, { align: "right" });
  if (n.facturaRef) doc.text(`Factura: ${n.facturaRef}`, W - M, 70, { align: "right" });

  let y = 100;
  doc.setDrawColor(224).setFillColor(250, 250, 250).roundedRect(M, y, W - 2 * M, 52, 6, 6, "FD");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...SOFT);
  doc.text("MOTIVO DIAN", M + 14, y + 18);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...DARK);
  doc.text(doc.splitTextToSize(`${n.motivoCodigo}. ${n.motivoLabel}`, W - 2 * M - 28), M + 14, y + 34);
  if (n.clienteNombre) {
    doc.setFontSize(9).setTextColor(...SOFT);
    doc.text(`Cliente: ${n.clienteNombre}`, M + 14, y + 47);
  }

  y += 68;
  autoTable(doc, {
    startY: y,
    head: [["Descripción", "Cant.", "IVA", "Subtotal"]],
    body: (n.items || []).map((it) => [it.descripcion, Number(it.cantidad), `${Number(it.iva)}%`, money(it.subtotalItem)]),
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 5, textColor: DARK },
    headStyles: { fillColor: BRAND, textColor: 255 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "right" } },
  });

  let ty = doc.lastAutoTable.finalY + 16;
  const tbX = W - M - 220;
  const fila = (label, val, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 12 : 9);
    doc.setTextColor(...(bold ? BRAND : SOFT));
    doc.text(label, tbX, ty);
    doc.setTextColor(...(bold ? BRAND : DARK));
    doc.text(val, W - M, ty, { align: "right" });
    ty += bold ? 20 : 15;
  };
  fila("Subtotal", money(n.subtotal));
  fila("IVA", money(n.totalIva));
  doc.setDrawColor(...BRAND).setLineWidth(1).line(tbX, ty - 6, W - M, ty - 6);
  fila(`TOTAL ${titulo}`, `${esCredito ? "−" : "+"}${money(n.totalNota)}`, true);

  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...SOFT);
  doc.text(
    "Representación gráfica. No reemplaza el documento electrónico DIAN.",
    W / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: "center" }
  );

  doc.save(`${n.numero || "nota"}.pdf`);
}
