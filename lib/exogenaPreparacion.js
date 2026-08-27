// Diagnóstico de PREPARACIÓN para la información exógena.
//
// QUÉ HACE Y QUÉ NO. No genera ningún reporte ni produce ningún archivo para la DIAN. Contesta,
// mientras todavía hay meses por delante, la pregunta que en abril ya no da tiempo de contestar:
// ¿qué datos me faltan por tercero?
//
// POR QUÉ ESTO ES LO PRIMERO QUE HAY QUE CONSTRUIR. La exógena identifica al tercero por
// documento y agrupa el año entero por él; diez de los quince formatos piden además dirección y
// códigos DANE. Esos datos se capturan al crear el cliente o al registrar la compra —es decir,
// durante todo el año—, pero solo se echan de menos al armar el reporte. Un tablero que los
// pide en agosto vale más que un generador de formatos que en abril descubre que faltan.
//
// Y no puede costar una sanción: al no emitir nada hacia la DIAN no hay riesgo del art. 651.
// Es diagnóstico puro.

import { prisma } from "@/lib/prisma";
import { normalizarDocumento } from "@/lib/retencionesPracticadas";
import { codigoDianDesdeTexto } from "@/lib/data/tiposDocumentoDian";
import { resolverMunicipio, resolverDepartamento } from "@/lib/data/dane";
import { pendientesDeTercero } from "@/lib/terceros";

/**
 * Qué le falta a un tercero para poder reportarlo.
 *
 * Se distingue lo que IMPIDE reportar de lo que solo falta por completar:
 *   · `criticos`  → sin esto la fila del formato no se puede armar (documento, tipo, nombre).
 *   · `faltantes` → columnas exigidas que quedarían vacías (dirección, códigos, país).
 *
 * La distinción importa para que la pantalla no ponga al mismo nivel "no tiene NIT" —que hace
 * imposible el reporte— con "le falta el código de municipio", que se completa en un minuto.
 */
function revisarTercero(t) {
  const criticos = [];
  const faltantes = [];

  const doc = normalizarDocumento(t.numeroDocumento);
  if (!doc.numero) criticos.push("Sin número de identificación");

  // El tipo puede venir ya en código DIAN o como el texto viejo ("CC", "NIT"), que se traduce.
  const codTipo = t.tipoDocumentoDian || codigoDianDesdeTexto(t.tipoDocumento);
  if (!codTipo) criticos.push("Sin tipo de documento DIAN");

  if (t.tipo === "natural") {
    // Los cuatro campos van separados y NO se deducen partiendo el nombre completo: un apellido
    // mal partido es información errónea, no información faltante.
    if (!t.primerApellido || !t.primerNombre) criticos.push("Faltan apellidos y nombres separados");
  } else if (!t.razonSocial && !t.nombreCompleto) {
    criticos.push("Sin razón social");
  }

  if (!t.direccion) faltantes.push("Dirección");

  // Los códigos DANE: si no están pero el nombre escrito a mano se puede resolver contra el
  // catálogo, se ofrece la sugerencia en vez de solo señalar el hueco. `resolverMunicipio`
  // devuelve null si hay ambigüedad, así que aquí nunca se sugiere a ciegas.
  let sugerencia = null;
  if (!t.codigoMunicipio || !t.codigoDepartamento) {
    faltantes.push("Código DANE de departamento y municipio");
    const dep = t.departamento ? resolverDepartamento(t.departamento) : null;
    const mun = resolverMunicipio(t.ciudad, dep?.codigo || null);
    if (mun) {
      sugerencia = {
        codigoDepartamento: mun.departamento,
        codigoMunicipio: mun.codigo.slice(2),
        codigoCompleto: mun.codigo,
        etiqueta: `${mun.nombre} (${mun.nombreDepartamento})`,
      };
    }
  }

  if (!t.codigoPais) faltantes.push("País");

  return { criticos, faltantes, sugerencia, documento: doc.numero, tipoDocumentoDian: codTipo };
}

/**
 * Diagnóstico completo del usuario para un año gravable.
 *
 * Los proveedores NO son una entidad todavía: viven como texto dentro de cada `Compra` y cada
 * `DocumentoSoporte`. Aquí se DERIVAN agrupando por documento normalizado, que es justo lo que
 * permite ver el problema más caro: el mismo proveedor escrito de varias formas, que en el
 * reporte se convertiría en varios terceros y descuadraría el cruce de la DIAN.
 */
export async function diagnosticoExogena(usuarioId, anioGravable) {
  const enElAnio = { gte: `${anioGravable}-01-01`, lte: `${anioGravable}-12-31` };

  const [clientes, compras, soportes, empleados] = await Promise.all([
    prisma.cliente.findMany({ where: { usuarioId }, include: { tercero: true } }),
    prisma.compra.findMany({
      where: { usuarioId, fecha: enElAnio },
      select: { proveedorNombre: true, proveedorNit: true, tercero: true },
    }),
    prisma.documentoSoporte.findMany({
      where: { usuarioId, fecha: enElAnio, estado: { not: "Anulado" } },
      select: {
        proveedorNombre: true,
        proveedorDocumento: true,
        proveedorTipoDocumento: true,
        tercero: true,
      },
    }),
    prisma.empleado.findMany({ where: { usuarioId } }),
  ]);

  // ---- Clientes ----
  //
  // La identidad se evalúa sobre la FICHA DE TERCERO, que es donde vive desde la unificación.
  // `ciudad` y `departamento` del cliente se siguen mirando para poder SUGERIR el código DANE:
  // son texto libre, no sirven para reportar, pero sí para adivinar bien lo que falta.
  const clientesRevisados = clientes.map((c) => {
    const esNatural = c.tipo === "natural";
    const t = c.tercero;
    const r = revisarTercero({
      tipo: t?.tipo === "juridica" ? "empresa" : esNatural ? "natural" : "empresa",
      nombreCompleto: c.nombreCompleto,
      tipoDocumento: esNatural ? c.tipoDocumento : "NIT",
      tipoDocumentoDian: t?.tipoDocumentoDian,
      numeroDocumento: t?.documento || (esNatural ? c.numeroDocumento : c.nit),
      direccion: t?.direccion || c.direccion,
      ciudad: c.ciudad,
      departamento: c.departamento,
      codigoDepartamento: t?.codigoDepartamento,
      codigoMunicipio: t?.codigoMunicipio,
      codigoPais: t?.codigoPais,
      primerApellido: t?.primerApellido,
      primerNombre: t?.primerNombre,
      razonSocial: t?.razonSocial || c.razonSocial,
    });
    // Sin ficha no hay dónde guardar los códigos DANE: es lo primero que hay que arreglar.
    if (!t) r.criticos = [...r.criticos, "Sin ficha de tercero (consolida en Terceros)"];
    return {
      id: c.id,
      terceroId: t?.id || null,
      origen: "cliente",
      nombre: c.nombreCompleto,
      tipo: c.tipo,
      ...r,
    };
  });

  // ---- Proveedores derivados (todavía no hay tabla) ----
  const porDoc = new Map();
  const registrar = (nombre, documento, tipoDoc, tercero) => {
    const { numero } = normalizarDocumento(documento);
    // Sin documento no hay forma de agrupar: cada uno queda suelto, y eso es exactamente lo que
    // hay que reportar como problema.
    const clave = numero || `sin-doc:${(nombre || "").trim().toLowerCase()}`;
    if (!porDoc.has(clave)) {
      porDoc.set(clave, {
        clave,
        documento: numero,
        nombres: new Set(),
        grafias: new Set(),
        tipoDoc,
        documentos: 0,
        tercero: null,
      });
    }
    const p = porDoc.get(clave);
    // Si el documento ya está enlazado a una ficha de tercero, ESA es la fuente de verdad: es
    // donde viven la dirección y los códigos DANE que el snapshot nunca va a tener.
    if (tercero && !p.tercero) p.tercero = tercero;
    if (nombre) p.nombres.add(nombre.trim());
    if (documento) p.grafias.add(documento.toString().trim());
    p.documentos += 1;
    if (!p.tipoDoc && tipoDoc) p.tipoDoc = tipoDoc;
  };

  compras.forEach((c) => registrar(c.proveedorNombre, c.proveedorNit, null, c.tercero));
  soportes.forEach((s) =>
    registrar(s.proveedorNombre, s.proveedorDocumento, s.proveedorTipoDocumento, s.tercero)
  );

  const proveedores = [...porDoc.values()].map((p) => {
    // Con ficha de tercero, se evalúa la ficha —que es la que puede estar completa—. Sin ella,
    // solo queda lo que trae el snapshot, y ahí faltará siempre la ubicación.
    let criticos = [];
    let faltantes = [];
    if (p.tercero) {
      ({ criticos, faltantes } = pendientesDeTercero(p.tercero));
    } else {
      if (!p.documento) criticos.push("Sin número de identificación");
      if (!p.tipoDoc || !codigoDianDesdeTexto(p.tipoDoc))
        criticos.push("Sin tipo de documento DIAN");
      faltantes.push("Sin ficha de tercero: no tiene dónde guardar dirección ni códigos DANE");
    }

    return {
      id: p.tercero?.id || p.clave,
      terceroId: p.tercero?.id || null,
      origen: "proveedor",
      nombre: p.tercero?.nombre || [...p.nombres][0] || "(sin nombre)",
      documento: p.documento,
      documentos: p.documentos,
      criticos,
      faltantes,
      // El hallazgo caro. Varias grafías del mismo NIT se resuelven solas al normalizar; el
      // mismo NIT con varios nombres es un dato que alguien tiene que mirar.
      variasGrafias: p.grafias.size > 1 ? [...p.grafias] : null,
      variosNombres: p.nombres.size > 1 ? [...p.nombres] : null,
    };
  });

  // ---- Empleados (formato 2276) ----
  const empleadosRevisados = empleados.map((e) => {
    const doc = normalizarDocumento(e.documento);
    const criticos = [];
    if (!doc.numero) criticos.push("Sin número de identificación");
    // `Empleado` no guarda tipo de documento, ni dirección, ni ubicación, y el 2276 los pide.
    criticos.push("Sin tipo de documento DIAN");
    return {
      id: e.id,
      origen: "empleado",
      nombre: e.nombreCompleto || [e.nombres, e.apellidos].filter(Boolean).join(" ") || "(sin nombre)",
      documento: doc.numero,
      criticos,
      faltantes: ["Dirección y códigos DANE (el empleado no los guarda)"],
    };
  });

  const todos = [...clientesRevisados, ...proveedores, ...empleadosRevisados];
  const conCriticos = todos.filter((t) => t.criticos.length > 0).length;
  const listos = todos.filter((t) => !t.criticos.length && !t.faltantes.length).length;

  return {
    anioGravable,
    totales: {
      terceros: todos.length,
      listos,
      conCriticos,
      incompletos: todos.length - listos - conCriticos,
      clientes: clientesRevisados.length,
      proveedores: proveedores.length,
      empleados: empleadosRevisados.length,
    },
    alertas: {
      mismoDocumentoVariosNombres: proveedores.filter((p) => p.variosNombres).length,
      proveedoresSinDocumento: proveedores.filter((p) => !p.documento).length,
    },
    clientes: clientesRevisados,
    proveedores,
    empleados: empleadosRevisados,
  };
}
