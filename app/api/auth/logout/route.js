import { NextResponse } from "next/server";
import { destruirSesion } from "@/lib/session";

export async function POST() {
  await destruirSesion();
  return NextResponse.json({ ok: true });
}
