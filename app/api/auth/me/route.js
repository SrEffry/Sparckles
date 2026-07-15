import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/session";

export async function GET() {
  const usuario = await obtenerSesion();
  return NextResponse.json({ usuario });
}
