import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { retencionesParaCertificado, normalizarDocumento } from "@/lib/retencionesPracticadas";
import { siguienteConsecutivo, numeroFinal } from "@/lib/consecutivos";
import {
  periodosDisponibles,
  buscarPeriodo,
  plazoExpedicion,
  SANCION_NO_EXPEDIR,
} from "@/lib/periodosCertificado";

const TIPOS = ["retefuente", "reteiva", "reteica"];

// Dónde se arregla cada documento cuyo concepto falta. Mandar siempre a /compras era mentira
// cuando el documento era un DS-.
const MODULO_ORIGEN = {
  compra: { ruta: "/compras", texto: "Ir a Compras" },
  documento_soporte: { ruta: "/documentos-soportes", texto: "Ir a Documentos soporte" },
  comprobante: { ruta: "/comprobantes?tipo=egreso", texto: "Ir a Comprobantes de egreso" },
};

// GET /api/certificados?anio=2026
//   → terceros a los que se les retuvo ese año, con lo pendiente por certificar.
// GET /api/certificados?anio=2026&terceroDoc=800123456&tipo=retefuente[&periodo=][&municipio=]
//   → la vista previa del certificado, agregada por concepto. NO lo expide.
export async function GET(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const anio = Number(sp.get("anio")) || new Date().getFullYear();
  const terceroDoc = (sp.get("terceroDoc") || "").trim();
  const tipo = TIPOS.includes(sp.get("tipo")) ? sp.get("tipo") : null;

  if (!terceroDoc) return NextResponse.json(await listadoTerceros(sesion.id, anio));

  const periodo = tipo ? buscarPeriodo(tipo, anio, sp.get("periodo")) : null;
  const municipio = (sp.get("municipio") || "").trim() || null;

  const datos = await retencionesParaCertificado(prisma, {
    usuarioId: sesion.id,
    anio,
    terceroDocumento: terceroDoc,
    tipo,
    municipio,
    desde: periodo?.desde,
    hasta: periodo?.hasta,
  });

  const cfg = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });

  // Ya expedidos para este tercero y año, INCLUIDOS los anulados: quien recibe un reemplazo
  // necesita ver cuál se anuló y cuál rige.
  const expedidos = await prisma.certificadoRetencion.findMany({
    where: {
      usuarioId: sesion.id,
      anio,
      terceroNumeroDocumento: normalizarDocumento(terceroDoc).numero,
      ...(tipo ? { tipo } : {}),
    },
    orderBy: { expedidoEn: "desc" },
  });

  return NextResponse.json({
    anio,
    tipo,
    ...datos,
    periodos: tipo ? periodosDisponibles(tipo, anio) : [],
    periodo,
    plazo: tipo ? plazoExpedicion(tipo, anio, periodo) : null,
    emisor: cfg ? snapshotEmisor(cfg) : null,
    expedidos,
    // Lo que impide expedir, dicho antes de intentarlo.
    faltantes: faltantesParaExpedir(cfg, datos, tipo, periodo, municipio),
  });
}

/** Terceros con retención en el año, y cuánto queda sin certificar de cada uno. */
async function listadoTerceros(usuarioId, anio) {
  const [lineas, certificados] = await Promise.all([
    prisma.retencionPracticada.findMany({
      where: { usuarioId, anio, vinculante: true },
      select: {
        terceroNombre: true,
        terceroNumeroDocumento: true,
        terceroTipoDocumento: true,
        tipo: true,
        base: true,
        valor: true,
      },
    }),
    prisma.certificadoRetencion.findMany({
      where: { usuarioId, anio, anulado: false },
      select: { terceroNumeroDocumento: true, tipo: true },
    }),
  ]);

  const yaCertificado = new Set(certificados.map((c) => `${c.terceroNumeroDocumento}|${c.tipo}`));

  const porTercero = new Map();
  for (const l of lineas) {
    // Sin documento no hay certificado posible: se agrupa aparte para que se vea y se
    // corrija, en vez de mezclarlo con los identificados.
    const clave = l.terceroNumeroDocumento || "__sin_documento__";
    if (!porTercero.has(clave)) {
      porTercero.set(clave, {
        documento: l.terceroNumeroDocumento || null,
        tipoDocumento: l.terceroTipoDocumento || null,
        nombre: l.terceroNombre,
        retefuente: 0,
        reteiva: 0,
        reteica: 0,
        total: 0,
        pagos: 0,
        pendientes: [],
      });
    }
    const t = porTercero.get(clave);
    t[l.tipo] += Number(l.valor);
    t.total += Number(l.valor);
    t.pagos += Number(l.base);
  }

  for (const [clave, t] of porTercero) {
    if (!t.documento) continue;
    t.pendientes = TIPOS.filter((tipo) => t[tipo] > 0 && !yaCertificado.has(`${clave}|${tipo}`));
  }

  const terceros = [...porTercero.values()].sort((a, b) => b.total - a.total);
  const conPendiente = terceros.filter((t) => t.pendientes.length > 0);

  return {
    anio,
    terceros,
    // El Art. 667 sanciona con el 5% de los PAGOS, no de lo retenido: es lo que está en juego.
    pendientes: {
      terceros: conPendiente.length,
      pagosExpuestos: Math.round(conPendiente.reduce((a, t) => a + t.pagos, 0)),
      sancionEstimada: Math.round(conPendiente.reduce((a, t) => a + t.pagos, 0) * SANCION_NO_EXPEDIR),
    },
  };
}

function snapshotEmisor(cfg) {
  return {
    razonSocial: cfg.razonSocial,
    nit: cfg.nit,
    direccion: cfg.direccion,
    ciudad: cfg.ciudad,
    telefono: cfg.telefono,
    email: cfg.email,
  };
}

// Cada faltante dice QUÉ falta y DÓNDE se arregla: mandar a Configuración a quien lo que
// tiene mal es el concepto de una compra es peor que no decir nada.
function faltantesParaExpedir(cfg, datos, tipo, periodo, municipio) {
  const faltan = [];
  const cfgFalta = (texto) => faltan.push({ texto, arreglarEn: "/configuracion", arreglarTexto: "Ir a Configuración" });

  // El Art. 381 lit. b y c exige razón social, NIT y DIRECCIÓN del agente retenedor.
  if (!cfg?.razonSocial) cfgFalta("Razón social del emisor");
  if (!cfg?.nit) cfgFalta("NIT del emisor");
  if (!cfg?.direccion) cfgFalta("Dirección del agente retenedor (la exige el Art. 381 lit. c)");
  if (!cfg?.ciudad) cfgFalta("Ciudad donde se consignó la retención (Art. 381 lit. a)");
  if (!datos.tercero) faltan.push({ texto: "No hay retenciones certificables para este tercero en el periodo" });

  // ReteIVA se certifica por periodo gravable (art. 600 E.T.), no por año.
  if (tipo === "reteiva" && !periodo) {
    faltan.push({ texto: "Elige el periodo gravable: la ReteIVA se certifica por bimestre o cuatrimestre, no por año" });
  }

  // Cada ReteICA se descuenta en la declaración de SU municipio.
  if (tipo === "reteica" && !municipio && datos.municipios?.filter(Boolean).length > 1) {
    faltan.push({
      texto: `Hay ReteICA de ${datos.municipios.filter(Boolean).length} municipios. Expide un certificado por municipio: sumarlos da una cifra que no sirve para ninguna declaración`,
    });
  }

  // El lit. f exige el CONCEPTO de la retención. Un certificado que dice "Sin concepto
  // asignado" es defectuoso, así que se bloquea y se señala dónde corregirlo.
  for (const d of datos.sinConcepto || []) {
    const m = MODULO_ORIGEN[d.origen] || MODULO_ORIGEN.compra;
    faltan.push({
      texto: `Falta el concepto de retención en ${d.docRef} (Art. 381 lit. f)`,
      arreglarEn: m.ruta,
      arreglarTexto: m.texto,
    });
  }

  return faltan;
}

// POST /api/certificados → expide y guarda el snapshot.
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const anio = Number(body.anio);
  const terceroDoc = (body.terceroDoc || "").trim();
  const tipo = TIPOS.includes(body.tipo) ? body.tipo : null;

  if (!anio || !terceroDoc || !tipo) {
    return NextResponse.json({ error: "Indica año, tercero y tipo de retención." }, { status: 400 });
  }

  const periodo = buscarPeriodo(tipo, anio, body.periodo);
  const municipio = (body.municipio || "").trim() || null;

  const cfg = await prisma.configFacturacion.findUnique({ where: { usuarioId: sesion.id } });
  const datos = await retencionesParaCertificado(prisma, {
    usuarioId: sesion.id,
    anio,
    terceroDocumento: terceroDoc,
    tipo,
    municipio,
    desde: periodo?.desde,
    hasta: periodo?.hasta,
  });

  const faltan = faltantesParaExpedir(cfg, datos, tipo, periodo, municipio);
  if (faltan.length) {
    return NextResponse.json({ error: `Falta: ${faltan[0].texto}`, faltantes: faltan }, { status: 400 });
  }
  if (datos.totales.valor <= 0) {
    return NextResponse.json(
      { error: "No hay retenciones de ese tipo para este tercero en el periodo." },
      { status: 400 }
    );
  }

  try {
    // UNA sola serie para los tres tipos. El número identifica el documento y el tipo va en
    // su cara; con un contador por tipo, el CR-2026-0001 de ReteIVA y el de ReteICA chocan
    // contra el @@unique del número.
    const certificado = await prisma.$transaction(async (tx) => {
      const consecutivo = await siguienteConsecutivo(tx, {
        usuarioId: sesion.id,
        tipo: "certificado_retencion",
        anio,
        // Se siembra desde el mayor número ya usado, no desde el conteo: los certificados
        // anulados siguen ocupando su número y el conteo repetiría uno existente.
        semilla: async () => {
          const previos = await tx.certificadoRetencion.findMany({
            where: { usuarioId: sesion.id, anio },
            select: { numero: true },
          });
          return previos.reduce((max, c) => Math.max(max, numeroFinal(c.numero)), 0);
        },
      });
      const numero = `CR-${anio}-${String(consecutivo).padStart(4, "0")}`;

      return tx.certificadoRetencion.create({
        data: {
          usuarioId: sesion.id,
          numero,
          tipo,
          anio,
          periodo: periodo?.id || null,
          periodoDesde: periodo?.desde || null,
          periodoHasta: periodo?.hasta || null,
          municipio,
          terceroNombre: datos.tercero.nombre,
          terceroTipoDocumento: datos.tercero.tipoDocumento,
          terceroNumeroDocumento: datos.tercero.numeroDocumento,
          terceroDv: datos.tercero.dv,
          totalBase: datos.totales.base,
          totalValor: datos.totales.valor,
          totalOperacion: tipo === "reteiva" ? datos.totales.baseOperacion : null,
          detalle: datos.conceptos,
          emisorSnapshot: snapshotEmisor(cfg),
          ciudadConsignacion: (body.ciudadConsignacion || cfg.ciudad || "").trim() || null,
          expedidoPor: sesion.nombreCompleto || sesion.email,
          reemplazaAId: (body.reemplazaAId || "").trim() || null,
        },
      });
    });

    return NextResponse.json({ certificado }, { status: 201 });
  } catch (e) {
    // El @@unique del número es la red de seguridad del consecutivo. Si salta, el usuario
    // merece saber qué pasó y que reintentar sirve, no un 500 en blanco.
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Conflicto de numeración al expedir el certificado. Intenta de nuevo." },
        { status: 409 }
      );
    }
    throw e;
  }
}
