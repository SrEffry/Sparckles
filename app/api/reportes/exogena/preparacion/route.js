import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { hoyBogota } from "@/lib/fechas";
import { normalizarDocumento } from "@/lib/retencionesPracticadas";
import { diagnosticoExogena } from "@/lib/exogenaPreparacion";
import { plazoDe, diasHasta, ANIOS_CON_PLAZOS } from "@/lib/data/plazosExogena";

/**
 * ¿El informante es gran contribuyente?
 *
 * IMPORTA MUCHO MÁS DE LO QUE PARECE: los plazos de grandes contribuyentes caen hasta CINCO
 * SEMANAS antes que los de personas jurídicas. Antes esto estaba cableado en `false`, así que a
 * un gran contribuyente con NIT terminado en 6 la pantalla le decía el 3 de junio cuando su
 * plazo real era el 7 de mayo: 27 días de extemporaneidad, en la única pantalla que existe para
 * evitarla.
 *
 * El dato vive en `Empresa.caracteristicasTributarias`. Se busca la empresa del informante por
 * NIT; si hay una sola, se usa esa.
 *
 * Devuelve `null` —no `false`— cuando NO SE SABE. La diferencia es la que importa: asumir que no
 * es gran contribuyente es exactamente el error que se está corrigiendo, así que cuando no hay
 * con qué decidirlo, la pantalla lo pregunta en vez de suponerlo.
 */
async function esGranContribuyente(usuarioId, nitInformante) {
  const empresas = await prisma.empresa.findMany({
    where: { usuarioId },
    select: { nit: true, razonSocial: true, caracteristicasTributarias: true },
  });
  if (empresas.length === 0) return null;

  const buscado = normalizarDocumento(nitInformante).numero;
  const porNit = buscado
    ? empresas.find((e) => normalizarDocumento(e.nit).numero === buscado)
    : null;

  const empresa = porNit || (empresas.length === 1 ? empresas[0] : null);
  if (!empresa) return null; // varias empresas y ninguna cuadra con el NIT: no se adivina

  return (empresa.caracteristicasTributarias || []).includes("granContribuyente");
}

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
  const gc = cfg?.nit ? await esGranContribuyente(sesion.id, cfg.nit) : null;
  const plazo = cfg?.nit && gc !== null ? plazoDe(anio, cfg.nit, gc) : null;

  return NextResponse.json({
    ...diagnostico,
    hoy,
    informante: cfg ? { razonSocial: cfg.razonSocial, nit: cfg.nit } : null,
    // `plazo: null` no es un error: puede ser que falte el NIT, que no se sepa si el informante
    // es gran contribuyente, o que la DIAN todavía no haya publicado el calendario de ese año.
    // La pantalla distingue los tres casos, y en ninguno se inventa una fecha.
    plazo: plazo
      ? { ...plazo, diasRestantes: diasHasta(plazo.fecha, hoy), granContribuyente: gc }
      : null,
    plazosPublicados: ANIOS_CON_PLAZOS,
    sinNit: !cfg?.nit,
    granContribuyenteDesconocido: !!cfg?.nit && gc === null,
  });
}
