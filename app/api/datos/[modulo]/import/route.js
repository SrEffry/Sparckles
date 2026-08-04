import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/session";
import { leerXlsx } from "@/lib/excel";
import { REGISTRO } from "@/lib/importExport/registro";

// POST /api/datos/<modulo>/import → recibe un .xlsx (multipart, campo "archivo") y crea registros.
export async function POST(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { modulo } = await params;
  const def = REGISTRO[modulo];
  if (!def) return NextResponse.json({ error: "Módulo no válido." }, { status: 404 });
  if (!def.soportaImport)
    return NextResponse.json({ error: "Este módulo no admite importación." }, { status: 400 });

  let buffer;
  try {
    const form = await request.formData();
    const file = form.get("archivo");
    if (!file || typeof file === "string") throw new Error("sin archivo");
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "No se recibió un archivo válido." }, { status: 400 });
  }

  let filas;
  try {
    ({ filas } = await leerXlsx(buffer));
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo. ¿Es un .xlsx válido?" }, { status: 400 });
  }
  if (!filas.length)
    return NextResponse.json({ error: "El archivo no tiene filas de datos." }, { status: 400 });

  const { creados, errores } = await def.importar(sesion.id, filas);
  return NextResponse.json({ creados, errores, total: filas.length });
}
