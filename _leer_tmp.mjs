import fs from "fs";
import ExcelJS from "exceljs";
const f = fs.readdirSync("public").find(x => x.endsWith(".xlsx"));
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile("public/" + f);
for (const nombre of ["1003","1005","1006","1007","1008","1009"]) {
  const ws = wb.worksheets.find(w => w.name.trim() === nombre);
  console.log("=== HOJA:", nombre);
  for (let i = 3; i <= 9; i++) {
    const vals = (ws.getRow(i).values || []).map(v => (v && v.richText ? v.richText.map(t=>t.text).join("") : (v && v.result !== undefined ? v.result : v)));
    if (vals.length) console.log(i, JSON.stringify(vals));
  }
}
