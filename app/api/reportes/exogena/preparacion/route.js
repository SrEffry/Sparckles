import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { hoyBogota } from "@/lib/fechas";
import { diagnosticoExogena } from "@/lib/exogenaPreparacion";
import { plazoDe, diasHasta, ANIOS_CON_PLAZOS } from "@/lib/data/plazosExogena";

// GET /api/reportes/exogena/preparacion?anio=2026
//
// Diagnóstico de qué datos faltan para poder reportar exógena, más el plazo del informante.
// NO genera ningún archivo ni envía nada a la DIAN: solo mira lo que hay.
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const hoy = hoyBogota();
  // Por defecto el año EN CURSO: la gracia del tablero es arreglar los datos del año que se
  // está viviendo, no del que ya se reportó.
  const anio = Number(sp.get("anio")) || Number(hoy.slice(0, 4));

  const diagnostico = await diagnosticoExogena(sesion.id, anio);

  // El plazo se calcula con el NIT del informante, que sale de la configuración de facturación.
  const cfg = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });
  const plazo = cfg?.nit ? plazoDe(anio, cfg.nit, false) : null;

  return NextResponse.json({
    ...diagnostico,
    hoy,
    informante: cfg ? { razonSocial: cfg.razonSocial, nit: cfg.nit } : null,
    // `plazo: null` no es un error: puede ser que no haya NIT configurado o que la DIAN todavía
    // no haya publicado el calendario de ese año. La pantalla distingue los dos casos, y en
    // ninguno se inventa una fecha.
    plazo: plazo ? { ...plazo, diasRestantes: diasHasta(plazo.fecha, hoy) } : null,
    plazosPublicados: ANIOS_CON_PLAZOS,
    sinNit: !cfg?.nit,
  });
}
