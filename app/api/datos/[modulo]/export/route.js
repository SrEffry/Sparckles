import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/session";
import { construirXlsx } from "@/lib/excel";
import { REGISTRO } from "@/lib/importExport/registro";

// GET /api/datos/<modulo>/export → descarga un .xlsx con los datos del usuario.
export async function GET(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { modulo } = await params;
  const def = REGISTRO[modulo];
  if (!def) return NextResponse.json({ error: "Módulo no válido." }, { status: 404 });

  const filas = await def.exportar(sesion.id);
  const buf = await construirXlsx({ hoja: def.hoja, columnas: def.columnas, filas });
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sparkles-${modulo}-${fecha}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
