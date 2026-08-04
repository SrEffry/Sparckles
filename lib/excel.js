// Utilidades de Excel (.xlsx) para importar/exportar. Solo servidor (exceljs es una lib de Node).
import ExcelJS from "exceljs";

// Construye un .xlsx a partir de columnas [{key, header, width}] y filas [{key: valor}].
export async function construirXlsx({ hoja = "Datos", columnas, filas }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sparkles";
  const ws = wb.addWorksheet(hoja);
  ws.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF801931" } };
  head.alignment = { vertical: "middle" };
  head.height = 20;
  filas.forEach((f) => ws.addRow(f));
  ws.views = [{ state: "frozen", ySplit: 1 }]; // fija la cabecera
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// Normaliza el valor de una celda a un primitivo (texto/número), resolviendo rich-text y fórmulas.
function valorCelda(v) {
  if (v == null) return "";
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("text" in v) return v.text; // hyperlink / rich text
    if ("result" in v) return v.result; // fórmula
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    return String(v);
  }
  return v;
}

// Lee la primera hoja y devuelve { filas: [{Encabezado: valor}] }. Ignora filas vacías.
export async function leerXlsx(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return { filas: [] };

  const headers = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(valorCelda(cell.value) ?? "").trim();
  });

  const filas = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj = {};
    let vacia = true;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const h = headers[col];
      if (!h) return;
      const v = valorCelda(cell.value);
      obj[h] = v;
      if (v !== "" && v != null) vacia = false;
    });
    if (!vacia) filas.push(obj);
  }
  return { filas };
}
