import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { obtenerSesion } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hoyBogota } from "@/lib/fechas";
import { generarFormato } from "@/lib/exogenaFormatos";

// GET /api/reportes/exogena/formato/1003?anio=2026&formato=json|xlsx
//
// `json` alimenta la vista previa en pantalla; `xlsx` descarga el extracto.
export async function GET(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { numero } = await params;
  const sp = new URL(request.url).searchParams;
  const anio = Number(sp.get("anio")) || Number(hoyBogota().slice(0, 4));
  const comoXlsx = sp.get("formato") === "xlsx";

  const r = await generarFormato(sesion.id, numero, anio);
  if (!r) return NextResponse.json({ error: "Formato no disponible." }, { status: 404 });

  if (!comoXlsx) {
    // La vista previa no manda las filas enteras: solo lo necesario para decidir si descargar.
    return NextResponse.json({
      numero: r.numero,
      nombre: r.nombre,
      anio: r.anio,
      columnas: r.columnas.map((c) => c.header),
      filas: r.filas.length,
      incompletos: r.incompletos,
      avisos: r.avisos,
      muestra: r.filas.slice(0, 5),
    });
  }

  const cfg = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });
  const buf = await construirLibro(r, cfg, hoyBogota());

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="BORRADOR-formato-${r.numero}-${anio}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Dos hojas, y el orden importa.
 *
 * La PRIMERA lleva solo el layout: encabezado en la fila 1 y datos debajo, sin títulos ni notas,
 * para poder seleccionar y pegar en el prevalidador de la DIAN. Meter una fila de advertencia
 * encima lo volvería inservible justo para lo que existe.
 *
 * La SEGUNDA lleva las advertencias. Van DENTRO del archivo y no solo en la pantalla porque el
 * archivo viaja: se manda por correo, se abre en otro computador, lo revisa otra persona.
 */
async function construirLibro(r, cfg, hoy) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sparkles";

  const ws = wb.addWorksheet(`Formato ${r.numero}`);
  ws.columns = r.columnas.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF801931" } };
  head.alignment = { vertical: "middle", wrapText: true };
  head.height = 34;
  r.filas.forEach((f) => ws.addRow(f));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const leeme = wb.addWorksheet("LÉEME");
  leeme.columns = [{ width: 110 }];
  const lineas = [
    ["BORRADOR PARA REVISIÓN DEL CONTADOR — NO ES EL ARCHIVO DE PRESENTACIÓN", true],
    ["", false],
    [`Formato ${r.numero} — ${r.nombre}`, true],
    [`Año gravable ${r.anio} · generado el ${hoy}`, false],
    [
      `Informante: ${cfg?.razonSocial || "(sin configurar)"} · NIT ${cfg?.nit || "(sin configurar)"}`,
      false,
    ],
    [`Filas: ${r.filas.length}${r.incompletos ? ` · ${r.incompletos} sin identificación completa` : ""}`, false],
    ["", false],
    ["CÓMO SE USA", true],
    [
      "La primera hoja trae las columnas en el orden del layout para pegarlas en el PREVALIDADOR de la DIAN, que es la herramienta que genera el archivo XML. Sparkles no genera XML: son quince esquemas que cambian cada año y un archivo mal versionado se rechaza, y un rechazo cuenta como no presentado.",
      false,
    ],
    ["", false],
    ["ANTES DE PRESENTAR", true],
    [
      "Estas cifras salen de los documentos registrados en el sistema. No las revisó ningún contador y no constituyen la declaración. La información no suministrada, errónea o extemporánea se sanciona por el art. 651 del Estatuto Tributario.",
      false,
    ],
    ["", false],
  ];
  if (r.avisos.length) {
    lineas.push(["LO QUE ESTE EXTRACTO NO CUBRE", true]);
    r.avisos.forEach((a) => lineas.push([`· ${a}`, false]));
  }

  lineas.forEach(([texto, negrita]) => {
    const fila = leeme.addRow([texto]);
    fila.getCell(1).alignment = { wrapText: true, vertical: "top" };
    if (negrita) fila.getCell(1).font = { bold: true };
  });
  // El aviso principal, en el color de marca para que no pase inadvertido.
  leeme.getRow(1).getCell(1).font = { bold: true, size: 13, color: { argb: "FF801931" } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
