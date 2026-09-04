// Extractos de información exógena, con las columnas del layout oficial.
//
// QUÉ SON Y QUÉ NO SON. Son un BORRADOR PARA REVISIÓN del contador, no el archivo que se
// presenta. Salen con las columnas y en el orden del layout para poder pegarlos en el
// PREVALIDADOR de la DIAN, que es quien genera el XML. Nosotros no serializamos XML: son quince
// esquemas que cambian cada año —para el AG 2025 la resolución se modificó cuatro veces— y un
// XML mal versionado se rechaza, y un rechazo cuenta como no presentado.
//
// CINCO FORMATOS: 1001, 1003, 1005, 1006 y 1007 — los que el modelo de datos puede alimentar.
// El **1001 vive en `lib/exogena1001.js`** porque no se parece a los demás: no sale de los
// documentos sino del LIBRO AUXILIAR por cuenta y tercero. Se deriva del GASTO y no de la
// retención, porque un pago que no llega a la base mínima no retiene y aun así se reporta.
//
// CADA EXTRACTO LLEVA SUS AVISOS. Lo que el sistema no puede llenar se dice en la hoja LÉEME
// del propio archivo, no solo en la pantalla: el archivo viaja y la pantalla no.

import { prisma } from "@/lib/prisma";
import { normalizarDocumento } from "@/lib/retencionesPracticadas";
import { codigoDianDesdeTexto } from "@/lib/data/tiposDocumentoDian";
import { CODIGO_PAIS_COLOMBIA } from "@/lib/data/dane";
import {
  NIT_CUANTIAS_MENORES,
  TIPO_DOC_CUANTIAS_MENORES,
} from "@/lib/data/tiposDocumentoDian";
import {
  CATEGORIA_A_1003,
  CONCEPTO_RETEIVA_1003,
  CONCEPTO_1007_POR_DEFECTO,
} from "@/lib/data/conceptosExogena";
import { buscarConcepto } from "@/lib/conceptosRetencion";
import { generar1001 } from "@/lib/exogena1001";

const n2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Identidad de "cuantías menores": el registro con el que la exógena acumula las operaciones
 * cuyo tercero NO se puede identificar.
 *
 * Antes esas filas salían con el documento en blanco y el prevalidador las rechazaba —o peor,
 * las dejaba pasar con una identificación vacía—. La DIAN tiene un registro previsto justo para
 * esto: NIT 222222222, tipo de documento 43, razón social "CUANTÍAS MENORES".
 */
const identidadCuantiasMenores = () => ({
  tipoDocumento: TIPO_DOC_CUANTIAS_MENORES,
  documento: NIT_CUANTIAS_MENORES,
  dv: "",
  primerApellido: "",
  segundoApellido: "",
  primerNombre: "",
  otrosNombres: "",
  razonSocial: "CUANTÍAS MENORES",
  direccion: "",
  codigoDepartamento: "",
  codigoMunicipio: "",
  codigoPais: CODIGO_PAIS_COLOMBIA,
  cuantiasMenores: true,
});

/**
 * Si el tercero no quedó identificado, se acumula en cuantías menores en vez de salir vacío.
 *
 * ⚠️ **NO SE USA EN EL 1003.** El registro de cuantías menores existe para acumular operaciones
 * cuyo tercero no es individualizable —ventas POS, pagos bajo la cuantía mínima— y está previsto
 * para los formatos 1001, 1005, 1006, 1007, 1008, 1009 y 1159. En el 1003 el informado es **el
 * agente que NOS retuvo**, y una retención sin agente identificable no existe: tenemos su
 * certificado del art. 381 E.T., con su NIT. Usarlo ahí convertiría "no pude identificarlo" en
 * una afirmación falsa ante la DIAN, y encima taparía el dato que hay que corregir. En el 1003
 * esas filas salen SIN identificación, entran en `incompletos` y se avisan.
 */
const identificable = (ident) => (ident?.documento ? ident : identidadCuantiasMenores());
const rango = (anio) => ({ gte: `${anio}-01-01`, lte: `${anio}-12-31` });

/**
 * Facturas que estaban VIGENTES al cierre del año gravable.
 *
 * Filtrar por `estado: "emitida"` a secas borraba del reporte las facturas anuladas DESPUÉS del
 * corte —y esas sí se declararon en su año—. Ejemplo: FE-100 del 15-mar-2025 por $10.000.000 +
 * IVA, anulada el 20-feb-2026: se declaró en 2025 como ingreso y como IVA generado (el
 * contraasiento va fechado en 2026), pero el extracto del AG 2025, generado en mayo de 2026, la
 * excluía. Diez millones menos en el 1007 y $1.900.000 menos en el 1006 que lo declarado.
 *
 * Es el mismo criterio que ya se adoptó para los saldos del 1008/1009, y `fechaAnulacion` existe
 * justo para esto.
 */
const vigentesAlCorte = (anio) => ({
  OR: [
    { estado: "emitida" },
    { estado: "anulada", fechaAnulacion: { gt: `${anio}-12-31` } },
  ],
});

/** Identificación de un tercero del registro. */
function identidadDeTercero(t) {
  if (!t) return null;
  return {
    tipoDocumento: t.tipoDocumentoDian || "",
    documento: t.documento || "",
    dv: t.dv || "",
    primerApellido: t.primerApellido || "",
    segundoApellido: t.segundoApellido || "",
    primerNombre: t.primerNombre || "",
    otrosNombres: t.otrosNombres || "",
    razonSocial: t.tipo === "natural" ? "" : t.razonSocial || t.nombre || "",
    direccion: t.direccion || "",
    codigoDepartamento: t.codigoDepartamento || "",
    codigoMunicipio: t.codigoMunicipio || "",
    codigoPais: t.codigoPais || "",
  };
}

/**
 * Identificación de un cliente.
 *
 * LA IDENTIDAD VIVE EN `Tercero`, no en `Cliente`. Un mismo NIT que nos vende y nos compra es UN
 * tercero, y la DIAN cruza el 1007 del receptor contra el 1001 del pagador: dos identidades para
 * un NIT es un cruce que no cuadra. Por eso se lee la ficha primero.
 *
 * Sin ficha se cae a los datos del cliente —que alcanzan para identificarlo pero no traen
 * códigos DANE— y el llamador lo cuenta para avisarlo.
 */
function identidadDeCliente(c) {
  if (c.tercero) return { ...identidadDeTercero(c.tercero), desdeTercero: true };

  const esNatural = c.tipo === "natural";
  const { numero, dv } = normalizarDocumento(esNatural ? c.numeroDocumento : c.nit);
  return {
    tipoDocumento: codigoDianDesdeTexto(esNatural ? c.tipoDocumento : "NIT") || "",
    documento: numero || "",
    dv: c.dv || dv || "",
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    otrosNombres: "",
    razonSocial: esNatural ? "" : c.razonSocial || c.nombreCompleto || "",
    direccion: c.direccion || "",
    codigoDepartamento: "",
    codigoMunicipio: "",
    codigoPais: "",
    sinTercero: true,
  };
}

/**
 * Identificación tomada del SNAPSHOT de la factura, cuando su cliente ya no tiene ficha.
 *
 * `Factura.clienteId` no tiene llave foránea: si alguien borró el cliente, el id apunta a nada.
 * Antes esas facturas se saltaban con un `continue` silencioso y desaparecían del 1003, del 1006
 * y del 1007 —sin aparecer en ningún aviso—, dejando los ingresos y el IVA generado por debajo
 * de lo declarado. Pero la factura trae todo lo necesario congelado, así que se reporta igual.
 *
 * (El borrado ya está cerrado en `DELETE /api/clientes/[id]`, que ahora inactiva en vez de
 * borrar. Esto cubre lo que se borró antes de esa guarda.)
 */
function identidadDeSnapshot(f) {
  const { numero, dv } = normalizarDocumento(f.clienteNumeroDocumento);
  return {
    tipoDocumento: codigoDianDesdeTexto(f.clienteTipoDocumento) || "",
    documento: numero || "",
    dv: f.clienteDv || dv || "",
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    otrosNombres: "",
    razonSocial: f.clienteNombre || "",
    direccion: f.clienteDireccion || "",
    codigoDepartamento: "",
    codigoMunicipio: "",
    codigoPais: "",
    desdeSnapshot: true,
  };
}


/**
 * Identificación tomada del SNAPSHOT de una NOTA crédito/débito.
 *
 * Es el mismo caso que `identidadDeSnapshot` para las facturas, y faltaba: las notas se saltaban
 * con un `continue` mudo cuando su cliente ya no tenía ficha, así que el IVA de una nota débito
 * no llegaba al 1006 y el de una crédito no llegaba a la columna J del 1005 —sin salir en ningún
 * aviso—, dejando los dos formatos por debajo del formulario 300. `Nota` guarda el snapshot del
 * cliente, así que hay con qué reportarla.
 *
 * El tipo de documento va VACÍO a propósito: el snapshot no lo guarda y adivinarlo por la
 * longitud es justo lo que se acaba de quitar. La fila entra en `incompletos` y se avisa.
 */
function identidadDeNota(nt) {
  const { numero, dv } = normalizarDocumento(nt.clienteDocumento);
  return {
    tipoDocumento: "",
    documento: numero || "",
    dv: dv || "",
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    otrosNombres: "",
    razonSocial: nt.clienteNombre || "",
    direccion: "",
    codigoDepartamento: "",
    codigoMunicipio: "",
    codigoPais: "",
    desdeNota: true,
  };
}

/**
 * Identificación de un proveedor tomada del SNAPSHOT de la compra, cuando no tiene ficha.
 *
 * Descartar la compra garantiza que el 1005 NO cuadre contra las declaraciones de IVA del año, y
 * el propio aviso del formato dice que si no cuadra no se presente. Las ventas ya caían a su
 * snapshot; las compras no, y eso era asimétrico sin razón.
 */
function identidadDeCompra(c) {
  const { numero, dv } = normalizarDocumento(c.proveedorNit);
  return {
    tipoDocumento: "",
    documento: numero || "",
    dv: dv || "",
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    otrosNombres: "",
    razonSocial: c.proveedorNombre || "",
    direccion: "",
    codigoDepartamento: "",
    codigoMunicipio: "",
    codigoPais: "",
    desdeSnapshotCompra: true,
  };
}

/**
 * ¿La factura de la que cuelga esta nota estaba vigente al cierre?
 *
 * `vigentesAlCorte` filtra las FACTURAS, pero las notas se consultaban solo por su propia fecha:
 * una nota crédito de abril seguía restando aunque su factura se hubiera anulado entera en julio
 * del mismo año. El 1007 mostraba entonces "ingresos 0 y devoluciones $1.000.000" para ese
 * cliente: una devolución sin ingreso que la respalde.
 *
 * Es el mismo criterio de `vigentesAlCorte`, evaluado en memoria para poder CONTAR las excluidas
 * en vez de dejarlas caer en el `where`.
 */
function facturaVigenteAlCorte(f, anio) {
  if (!f) return false;
  if (f.estado === "emitida") return true;
  return f.estado === "anulada" && !!f.fechaAnulacion && f.fechaAnulacion > `${anio}-12-31`;
}

// ============================ 1003 — retenciones que nos practicaron ============================
//
// Sale de las facturas de venta: lo que el CLIENTE nos retuvo. Se agrupa por (tercero, concepto),
// que es como lo pide el formato — el concepto sale de `retencionesPorConcepto`, que la factura
// ya guarda.
async function formato1003(usuarioId, anio) {
  const facturas = await prisma.factura.findMany({
    where: { usuarioId, ...vigentesAlCorte(anio), fecha: rango(anio) },
    select: {
      clienteId: true,
      retenciones: true,
      reteIva: true,
      reteIca: true,
      iva: true,
      subtotal: true,
      retencionesPorConcepto: true,
      clienteNombre: true,
      clienteTipoDocumento: true,
      clienteNumeroDocumento: true,
      clienteDv: true,
      clienteDireccion: true,
    },
  });

  const clientes = await prisma.cliente.findMany({ where: { usuarioId }, include: { tercero: true } });
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const acc = new Map(); // clave: documento|concepto
  const sumar = (ident, concepto, base, valor) => {
    if (!(valor > 0)) return;
    const clave = `${ident.documento}|${concepto}`;
    if (!acc.has(clave)) acc.set(clave, { ...ident, concepto, base: 0, valor: 0 });
    const a = acc.get(clave);
    a.base += Number(base) || 0;
    a.valor += Number(valor) || 0;
  };

  let sinConcepto = 0;
  let conReteIca = 0;
  let sinFicha = 0;
  let baseInflada = 0;
  let sinIdentificar = 0;

  for (const f of facturas) {
    // Sin ficha se cae al SNAPSHOT de la factura, que trae todo lo necesario congelado. Antes
    // aquí había un `continue` silencioso y la factura desaparecía del reporte entero.
    const cliente = porId[f.clienteId];
    const bruta = cliente ? identidadDeCliente(cliente) : identidadDeSnapshot(f);
    if (bruta.desdeSnapshot) sinFicha += 1;
    // SIN fallback a cuantías menores: ver la nota de `identificable`. La fila sale sin
    // identificación, `generarFormato` la cuenta en `incompletos` y el aviso la reclama.
    const ident = bruta;
    if (!ident.documento) sinIdentificar += 1;

    // ReteFuente, desglosada por concepto. `retencionesPorConcepto` guarda base y valor de cada
    // uno, así que no hay que repartir nada a ojo.
    const detalle = Array.isArray(f.retencionesPorConcepto) ? f.retencionesPorConcepto : [];
    if (detalle.length) {
      for (const d of detalle) {
        const interno = buscarConcepto(d.concepto);
        const cod = CATEGORIA_A_1003[interno?.categoria] || "1308";
        if (!interno) sinConcepto += 1;
        sumar(ident, cod, d.base, d.valor);
      }
    } else if (Number(f.retenciones) > 0) {
      // Factura antigua sin desglose: cae a "otros conceptos" y se avisa, en vez de repartirla.
      // ⚠️ La base va con el SUBTOTAL COMPLETO, que la infla si solo algunas líneas estaban
      // sujetas a retención. No hay forma de saberlo sin el desglose, y dejar la base en cero
      // sería peor: el formato la exige.
      sinConcepto += 1;
      baseInflada += 1;
      sumar(ident, "1308", f.subtotal, f.retenciones);
    }

    // ReteIVA tiene concepto propio. Su base es el IVA, no el subtotal.
    sumar(ident, CONCEPTO_RETEIVA_1003, f.iva, f.reteIva);

    if (Number(f.reteIca) > 0) conReteIca += 1;
  }

  // ---- Retenciones registradas AL PAGAR ----
  //
  // Con la política `retencionesEnCausacion: false`, la retención que nos practican no se anota
  // en la factura sino en el comprobante de INGRESO que la recauda. El 1003 no las veía por
  // ninguna vía, así que salía de la causación mientras la contabilidad (cuenta 1355) salía de
  // la caja: dos cifras distintas para el mismo renglón, y la que la DIAN cruza contra la
  // declaración de renta es la contable.
  //
  // Se leen SOLO cuando esa es la política: con `true` la retención ya vino en la factura y
  // sumar las dos la contaría dos veces.
  const mapa = await prisma.mapaCuentas.findUnique({ where: { usuarioId } });
  let desdeComprobantes = 0;
  let retSinFicha = 0;
  if (mapa && mapa.retencionesEnCausacion === false) {
    const retenciones = await prisma.comprobanteRetencion.findMany({
      where: {
        comprobante: {
          usuarioId,
          tipo: "ingreso",
          // POSITIVO, no `not: "Anulado"`. `ComprobanteTesoreria` usa estados en MINÚSCULA
          // (borrador | emitido | anulado | reversado); el literal en mayúscula venía de
          // `DocumentoSoporte`, que sí los usa así, y como no coincidía con ninguno la
          // condición era SIEMPRE verdadera: entraban al 1003 comprobantes en borrador,
          // anulados y reversados, con retenciones que nunca se practicaron.
          estado: "emitido",
          fecha: rango(anio),
        },
      },
      select: {
        tipo: true,
        concepto: true,
        base: true,
        valor: true,
        comprobante: { select: { terceroNombre: true, terceroDocumento: true } },
      },
    });

    // La identidad se BUSCA en el registro, no se adivina. Antes el tipo de documento salía de
    // la longitud (`>= 9 → 31 NIT`, si no `13 CC`) y eso convierte en persona jurídica a
    // cualquier cédula moderna: las emitidas desde ~1985 tienen 10 dígitos. La exógena
    // identifica al tercero por el PAR (tipo, número) y ese par tiene que coincidir con el RUT.
    const docsRet = [
      ...new Set(
        retenciones
          .map((r) => normalizarDocumento(r.comprobante?.terceroDocumento).numero)
          .filter(Boolean)
      ),
    ];
    const fichas = docsRet.length
      ? await prisma.tercero.findMany({ where: { usuarioId, documento: { in: docsRet } } })
      : [];
    const fichaPorDoc = new Map(fichas.map((f) => [f.documento, f]));

    for (const r of retenciones) {
      if (r.tipo === "reteica") continue; // municipal: no va en el 1003
      const { numero, dv } = normalizarDocumento(r.comprobante?.terceroDocumento);
      const ficha = numero ? fichaPorDoc.get(numero) : null;
      // Sin ficha se FALLA CERRADO: se reporta con el snapshot del comprobante y el tipo de
      // documento VACÍO, para que `generarFormato` lo cuente en `incompletos` y el aviso lo
      // diga. Un tipo inventado no se ve hasta que la DIAN no encuentra al tercero.
      const ident = (
        ficha
          ? identidadDeTercero(ficha)
          : {
              tipoDocumento: "",
              documento: numero || "",
              dv: dv || "",
              primerApellido: "",
              segundoApellido: "",
              primerNombre: "",
              otrosNombres: "",
              razonSocial: r.comprobante?.terceroNombre || "",
              direccion: "",
              codigoDepartamento: "",
              codigoMunicipio: "",
              codigoPais: "",
            }
      );
      if (!ident.documento) sinIdentificar += 1;
      if (numero && !ficha) retSinFicha += 1;
      const cod =
        r.tipo === "reteiva"
          ? CONCEPTO_RETEIVA_1003
          : CATEGORIA_A_1003[buscarConcepto(r.concepto)?.categoria] || "1308";
      sumar(ident, cod, r.base, r.valor);
      desdeComprobantes += 1;
    }
  }

  const avisos = [];
  if (desdeComprobantes)
    avisos.push(
      `${desdeComprobantes} retención(es) se tomaron de los comprobantes de INGRESO, porque el mapa de cuentas registra las retenciones al pagar y no en la causación.`
    );
  if (retSinFicha)
    avisos.push(
      `${retSinFicha} retención(es) de comprobantes son de un tercero SIN ficha en el registro: se reportaron con el nombre congelado en el comprobante y SIN tipo de documento, porque adivinarlo por la longitud del número convierte cualquier cédula de 10 dígitos en un NIT. Créales la ficha antes de presentar.`
    );
  // Lo que el sistema NO puede originar se dice, en vez de dejar creer que el formato está
  // completo. Es la misma regla que ya rige en nómina: lo que no se liquida, se avisa.
  avisos.push(
    "NO incluye conceptos que el sistema no registra: 1312 (retención sobre ingresos por tarjetas débito y crédito), 1306 (rendimientos financieros que retiene el banco), 1314 (timbre) ni autorretenciones. Si la empresa los tiene, hay que agregarlos a mano."
  );
  if (sinConcepto)
    avisos.push(
      `${sinConcepto} retención(es) sin concepto reconocido se agruparon en el 1308 "otros conceptos". Revísalas: el concepto correcto lo decide la naturaleza del pago.`
    );
  if (conReteIca)
    avisos.push(
      `${conReteIca} factura(s) tienen ReteICA y NO se incluyeron: el ICA es un tributo municipal, se declara ante el municipio y el formato 1003 no tiene concepto para él.`
    );
  if (baseInflada)
    avisos.push(
      `${baseInflada} factura(s) sin desglose por concepto: su BASE se reportó con el subtotal completo, que puede estar inflado si solo parte de las líneas estaba sujeta a retención.`
    );
  if (sinIdentificar)
    avisos.push(
      `${sinIdentificar} operación(es) quedaron SIN identificar al agente que practicó la retención. En el 1003 NO se pueden acumular en el NIT ${NIT_CUANTIAS_MENORES} ("CUANTÍAS MENORES"): ese registro no está previsto para este formato, y una retención sin agente identificable no existe —tienes su certificado del art. 381 E.T. con su NIT—. Complétalas antes de presentar.`
    );
  if (sinFicha) avisos.push(`${sinFicha} factura(s) son de un cliente que ya no tiene ficha; se reportaron con los datos congelados en el documento, que no incluyen códigos DANE. Revísalas.`);

  return {
    columnas: [
      { key: "concepto", header: "Concepto", width: 10 },
      { key: "tipoDocumento", header: "Tipo de documento", width: 16 },
      { key: "documento", header: "Número identificación del informado", width: 22 },
      { key: "dv", header: "DV", width: 6 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "direccion", header: "Dirección", width: 30 },
      { key: "codigoDepartamento", header: "Código del Departamento", width: 18 },
      { key: "codigoMunicipio", header: "Código del Municipio", width: 18 },
      // Redacción de la Res. 000233/2025, que cambió el encabezado de esta columna.
      { key: "base", header: "Valor de la base acumulada sujeta a retención", width: 26 },
      { key: "valor", header: "Retención que le practicaron", width: 22 },
    ],
    filas: [...acc.values()]
      .map((a) => ({ ...a, base: n2(a.base), valor: n2(a.valor) }))
      .sort((x, y) => x.concepto.localeCompare(y.concepto) || x.documento.localeCompare(y.documento)),
    avisos,
  };
}

// ============================ 1006 — IVA generado e INC ============================
async function formato1006(usuarioId, anio) {
  const facturas = await prisma.factura.findMany({
    where: { usuarioId, ...vigentesAlCorte(anio), fecha: rango(anio) },
    select: {
      clienteId: true,
      iva: true,
      inc: true,
      clienteNombre: true,
      clienteTipoDocumento: true,
      clienteNumeroDocumento: true,
      clienteDv: true,
      clienteDireccion: true,
    },
  });
  const [clientes, notasDebito] = await Promise.all([
    prisma.cliente.findMany({ where: { usuarioId }, include: { tercero: true } }),
    prisma.nota.findMany({
      where: { usuarioId, tipo: "debito", fecha: rango(anio) },
      select: {
        totalIva: true,
        clienteNombre: true,
        clienteDocumento: true,
        factura: { select: { clienteId: true, estado: true, fechaAnulacion: true } },
      },
    }),
  ]);
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const acc = new Map();
  let sinFicha = 0;
  let menores = 0;
  let ndSnapshot = 0;
  let ndDeAnulada = 0;
  for (const f of facturas) {
    const cliente = porId[f.clienteId];
    const bruta = cliente ? identidadDeCliente(cliente) : identidadDeSnapshot(f);
    if (bruta.desdeSnapshot) sinFicha += 1;
    const ident = identificable(bruta);
    if (ident.cuantiasMenores) menores += 1;
    if (!acc.has(ident.documento))
      acc.set(ident.documento, { ...ident, generado: 0, recuperado: 0, consumo: 0 });
    const a = acc.get(ident.documento);
    a.generado += Number(f.iva) || 0;
    a.consumo += Number(f.inc) || 0;
  }

  // El IVA de las notas DÉBITO aumenta el impuesto generado y faltaba: su subtotal sí entraba al
  // 1007 pero su IVA no llegaba aquí, así que el 1006 quedaba por debajo del formulario 300.
  //
  // Las notas CRÉDITO NO se netean contra el impuesto generado, y eso es correcto: en el
  // formulario 300 la devolución en ventas no baja el generado, va como descontable (art. 484
  // E.T.) — y por eso aparece en el 1005, columna J, contra el CLIENTE.
  for (const nt of notasDebito) {
    // La nota sigue la suerte de su factura: si la factura se anuló DENTRO del año, su ND no
    // aumenta un IVA generado que ya no existe. Una nota SIN factura asociada no entra por aquí
    // —no hay vigencia que comprobar— y se reporta con su propio snapshot.
    if (nt.factura && !facturaVigenteAlCorte(nt.factura, anio)) {
      if (Number(nt.totalIva) > 0) ndDeAnulada += 1;
      continue;
    }
    const cliente = nt.factura?.clienteId ? porId[nt.factura.clienteId] : null;
    // Sin ficha se cae al snapshot de la NOTA en vez de saltarla en silencio.
    const bruta = cliente ? identidadDeCliente(cliente) : identidadDeNota(nt);
    if (bruta.desdeNota) ndSnapshot += 1;
    const ident = identificable(bruta);
    if (ident.cuantiasMenores) menores += 1;
    if (!acc.has(ident.documento))
      acc.set(ident.documento, { ...ident, generado: 0, recuperado: 0, consumo: 0 });
    acc.get(ident.documento).generado += Number(nt.totalIva) || 0;
  }

  return {
    columnas: [
      { key: "tipoDocumento", header: "Tipo de Documento", width: 16 },
      { key: "documento", header: "Número identificación", width: 22 },
      { key: "dv", header: "DV", width: 6 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "generado", header: "Impuesto generado", width: 20 },
      { key: "recuperado", header: "IVA recuperado en devoluciones en compras anuladas, rescindidas o resueltas", width: 26 },
      { key: "consumo", header: "Impuesto al consumo", width: 20 },
    ],
    filas: [...acc.values()]
      .filter((a) => a.generado > 0 || a.consumo > 0)
      .map((a) => ({ ...a, generado: n2(a.generado), consumo: n2(a.consumo), recuperado: 0 }))
      .sort((x, y) => x.documento.localeCompare(y.documento)),
    avisos: [
      'La columna "IVA recuperado en devoluciones en compras anuladas" va en CERO: el sistema no registra anulación de compras con recuperación de IVA. Si hubo, hay que agregarlo a mano.',
      ...(menores
        ? [
            `${menores} operación(es) sin tercero identificado se acumularon en el NIT ${NIT_CUANTIAS_MENORES} (tipo ${TIPO_DOC_CUANTIAS_MENORES}, "CUANTÍAS MENORES").`,
          ]
        : []),
      ...(sinFicha ? [`${sinFicha} factura(s) son de un cliente que ya no tiene ficha; se reportaron con los datos congelados en el documento, que no incluyen códigos DANE. Revísalas.`] : []),
      ...(ndSnapshot
        ? [`${ndSnapshot} nota(s) débito son de un cliente que ya no tiene ficha; se reportaron con el snapshot de la nota, SIN tipo de documento ni códigos DANE. Revísalas.`]
        : []),
      ...(ndDeAnulada
        ? [`${ndDeAnulada} nota(s) débito NO se incluyeron: su factura fue anulada dentro del año gravable, así que no hay IVA generado que aumentar.`]
        : []),
    ],
  };
}

// ============================ 1005 — IVA descontable ============================
async function formato1005(usuarioId, anio) {
  const [cfg, compras, notasCredito] = await Promise.all([
    prisma.configFacturacion.findUnique({ where: { usuarioId } }),
    prisma.compra.findMany({
      where: { usuarioId, fecha: rango(anio) },
      select: {
        totalIva: true,
        tercero: true,
        proveedorNombre: true,
        proveedorNit: true,
        // Para poder separar el IVA de los ACTIVOS FIJOS, que no es descontable.
        items: { select: { base: true, iva: true, esActivoFijo: true } },
      },
    }),
    // La columna J del 1005 es "IVA resultante por devoluciones en VENTAS anuladas", y se
    // reporta contra el CLIENTE, no contra el proveedor: es el descontable del art. 484 E.T.
    // Faltaba, y con ella el cliente ni siquiera aparecía en este formato.
    prisma.nota.findMany({
      where: { usuarioId, tipo: "credito", fecha: rango(anio) },
      select: {
        totalIva: true,
        motivoCodigo: true,
        clienteNombre: true,
        clienteDocumento: true,
        factura: { select: { clienteId: true, estado: true, fechaAnulacion: true } },
      },
    }),
  ]);
  const clientes = notasCredito.length
    ? await prisma.cliente.findMany({ where: { usuarioId }, include: { tercero: true } })
    : [];
  const porCliente = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const acc = new Map();
  let sinFicha = 0;
  let sinDocumento = 0;
  let ivaDeActivosFijos = 0;
  let ncNoDevolucion = 0;
  let ncSnapshot = 0;
  let ncDeAnulada = 0;
  for (const c of compras) {
    // Con ficha se usa la ficha; sin ella se cae al SNAPSHOT de la compra, que trae el NIT y el
    // nombre congelados. Solo se descarta cuando no hay ni siquiera un documento con el que
    // identificar al proveedor: ahí sí no hay fila que armar.
    let ident = identidadDeTercero(c.tercero);
    if (!ident || !ident.documento) {
      const snap = identidadDeCompra(c);
      if (snap.documento) {
        ident = snap;
        if (Number(c.totalIva) > 0) sinFicha += 1;
      } else {
        // Solo cuenta como problema si la compra TENÍA IVA: una compra sin IVA no deja nada fuera
        // del formato, y engordar el aviso con ellas pide trabajo que no cambia el reporte.
        if (Number(c.totalIva) > 0) sinDocumento += 1;
        continue;
      }
    }
    if (!acc.has(ident.documento))
      acc.set(ident.documento, { ...ident, descontable: 0, devoluciones: 0, mayorValor: 0 });
    // EL IVA DE LOS ACTIVOS FIJOS NO ES DESCONTABLE (art. 491 E.T.): va al costo del activo o
    // al descuento del art. 258-1 en renta. Reportarlo aquí sería declarar un descontable que no
    // existe, y es de los que la DIAN cruza contra la declaración de IVA.
    let ivaFijos = 0;
    for (const it of c.items || []) {
      if (it.esActivoFijo) ivaFijos += (Number(it.base) || 0) * ((Number(it.iva) || 0) / 100);
    }
    // `Math.max(0, …)`, no `if (> 0)`: `CompraItem.base` se persiste ya redondeado mientras
    // `Compra.totalIva` se redondea una sola vez al final, así que la resta puede arrastrar
    // centavos y quedar levemente negativa. Con el `if`, esa compra perdía la fila ENTERA —no
    // solo el sobrante— y el formato dejaba de cuadrar por mucho más que los centavos.
    const descontable = Math.max(0, (Number(c.totalIva) || 0) - ivaFijos);
    ivaDeActivosFijos += ivaFijos;
    acc.get(ident.documento).descontable += descontable;
  }

  // Las devoluciones en ventas, contra el cliente. Si el mismo NIT ya aparece como proveedor,
  // cae en la MISMA fila: por eso la identidad está unificada en `Tercero`.
  let devolucionesEnVentas = 0;
  for (const nt of notasCredito) {
    if (!(Number(nt.totalIva) > 0)) continue;
    // La columna es "IVA resultante por devoluciones en ventas ANULADAS, RESCINDIDAS O
    // RESUELTAS" (art. 484 lit. b E.T.). Solo los motivos 1 (devolución parcial) y 2 (anulación)
    // del Anexo 1.9 lo son: una rebaja (3), un ajuste de precio (4), un pronto pago (6) o un
    // descuento por volumen (7) ajustan la base gravable y tienen otro tratamiento en el
    // formulario 300. Meterlos aquí infla el descontable del art. 484.
    if (nt.motivoCodigo !== "1" && nt.motivoCodigo !== "2") {
      ncNoDevolucion += 1;
      continue;
    }
    // Sin factura asociada no hay vigencia que comprobar: se reporta con el snapshot de la nota.
    if (nt.factura && !facturaVigenteAlCorte(nt.factura, anio)) {
      ncDeAnulada += 1;
      continue;
    }
    const cliente = nt.factura?.clienteId ? porCliente[nt.factura.clienteId] : null;
    const bruta = cliente ? identidadDeCliente(cliente) : identidadDeNota(nt);
    if (bruta.desdeNota) ncSnapshot += 1;
    const ident = identificable(bruta);
    if (!acc.has(ident.documento))
      acc.set(ident.documento, { ...ident, descontable: 0, devoluciones: 0, mayorValor: 0 });
    acc.get(ident.documento).devoluciones += Number(nt.totalIva) || 0;
    devolucionesEnVentas += Number(nt.totalIva) || 0;
  }

  // ⚠️ EL LAYOUT DEL 1005 CAMBIA CON EL AÑO. La columna "IVA tratado como mayor valor del costo
  // (Art. 490 E.T.)" fue suprimida a partir del año gravable 2026 —el propio libro del cliente lo
  // anota en la celda K2: "Para próximo año 2026 esta columna no aplica"—, por duplicidad con el
  // 1001. Y esto NO es cosmético: el archivo existe para pegarlo en el prevalidador, y una
  // columna de más corre todo lo que va a su derecha o hace fallar la validación estructural.
  //
  // Las fuentes se contradicen sobre si la supresión rige desde el AG 2025 o desde el AG 2026.
  // Se toma la nota del propio layout (desde 2026) y SE AVISA, porque esto lo tiene que confirmar
  // un contador contra el anexo técnico del año que se va a reportar.
  const llevaColumna490 = anio <= 2025;

  const avisos = [
    llevaColumna490
      ? 'La columna "IVA tratado como mayor valor del costo (Art. 490 E.T.)" va en CERO: el sistema no distingue el IVA descontable del que se lleva al costo. Si la empresa tiene ingresos gravados y excluidos, el prorrateo del art. 490 hay que hacerlo aparte.'
      : 'La columna del art. 490 NO se incluye: fue suprimida a partir del año gravable 2026. CONFIRMA la versión del formato contra el anexo técnico de la DIAN antes de presentar.',
    "No incluye los documentos soporte: el modelo no guarda IVA en ellos. (Excepción a vigilar: el IVA teórico asumido en compras a no residentes SÍ es descontable y sí va aquí; el modelo no lo representa.)",
    // Compuerta que faltaba: reportar IVA descontable siendo no responsable es el cruce más fácil
    // de detectar que existe — un contribuyente que ni siquiera presenta declaración de IVA.
    ...(cfg && cfg.responsableIva === false
      ? [
          "⚠️ Esta empresa NO es responsable de IVA, así que NO debería presentar el 1005: el IVA de sus compras es mayor valor del costo, no descontable. Revísalo antes de reportar.",
        ]
      : []),
    ...(ivaDeActivosFijos > 0
      ? [
          `Se EXCLUYERON ${ivaDeActivosFijos.toLocaleString("es-CO")} de IVA en compras marcadas como ACTIVO FIJO: ese IVA no es descontable (art. 491 E.T.), va al costo del activo o al descuento del art. 258-1 en renta.`,
        ]
      : []),
    "El total de este formato debe cuadrar contra la suma de 'impuestos descontables' de las declaraciones de IVA del año. Si no cuadra, no lo presentes.",
  ];
  if (devolucionesEnVentas > 0)
    avisos.push(
      `Incluye ${devolucionesEnVentas.toLocaleString("es-CO")} de IVA por devoluciones en ventas (notas crédito), reportado contra el CLIENTE en la columna correspondiente. Es el descontable del art. 484 E.T., no un IVA de compras.`
    );
  if (sinFicha)
    avisos.push(
      `${sinFicha} compra(s) sin ficha de tercero SÍ se incluyeron, con el NIT y el nombre congelados en la compra: no traen tipo de documento ni códigos DANE. Consolida los terceros en Configuración → Terceros y vuelve a generarlo.`
    );
  if (sinDocumento)
    avisos.push(
      `${sinDocumento} compra(s) con IVA quedaron FUERA: no tienen NIT del proveedor, así que no hay con qué identificarlo. Complétalas antes de presentar.`
    );
  if (ncNoDevolucion)
    avisos.push(
      `${ncNoDevolucion} nota(s) crédito NO entraron en la columna de devoluciones: su motivo DIAN no es devolución ni anulación (rebaja, ajuste de precio, pronto pago o volumen), y esa columna es solo del art. 484 E.T. Si alguna era motivo 5 "Otras" y sí correspondía, agrégala a mano.`
    );
  if (ncDeAnulada)
    avisos.push(
      `${ncDeAnulada} nota(s) crédito NO se incluyeron: su factura fue anulada dentro del año gravable, así que no hay venta que devolver.`
    );
  if (ncSnapshot)
    avisos.push(
      `${ncSnapshot} nota(s) crédito son de un cliente que ya no tiene ficha; se reportaron con el snapshot de la nota, SIN tipo de documento ni códigos DANE. Revísalas.`
    );

  return {
    columnas: [
      { key: "tipoDocumento", header: "Tipo de documento", width: 16 },
      { key: "documento", header: "Número identificación", width: 22 },
      { key: "dv", header: "DV", width: 6 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "descontable", header: "Impuesto Descontable", width: 20 },
      { key: "devoluciones", header: "IVA resultante por devoluciones en ventas anuladas, rescindidas o resueltas", width: 26 },
      ...(llevaColumna490
        ? [{ key: "mayorValor", header: "IVA tratado como mayor valor del costo o gasto (Art. 490 E.T.)", width: 26 }]
        : []),
    ],
    filas: [...acc.values()]
      .filter((a) => a.descontable > 0 || a.devoluciones > 0)
      .map((a) => ({
        ...a,
        descontable: n2(a.descontable),
        devoluciones: n2(a.devoluciones),
        mayorValor: 0,
      }))
      .sort((x, y) => x.documento.localeCompare(y.documento)),
    avisos,
  };
}

// ============================ 1007 — ingresos recibidos ============================
async function formato1007(usuarioId, anio) {
  const [facturas, notas, clientes] = await Promise.all([
    prisma.factura.findMany({
      where: { usuarioId, ...vigentesAlCorte(anio), fecha: rango(anio) },
      select: {
        clienteId: true,
        subtotal: true,
        clienteNombre: true,
        clienteTipoDocumento: true,
        clienteNumeroDocumento: true,
        clienteDv: true,
        clienteDireccion: true,
      },
    }),
    // Las notas se declaran en el periodo de SU fecha, así que se filtran por la suya.
    prisma.nota.findMany({
      where: { usuarioId, fecha: rango(anio) },
      select: {
        tipo: true,
        subtotal: true,
        motivoCodigo: true,
        clienteNombre: true,
        clienteDocumento: true,
        factura: { select: { clienteId: true, estado: true, fechaAnulacion: true } },
      },
    }),
    prisma.cliente.findMany({ where: { usuarioId }, include: { tercero: true } }),
  ]);
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const acc = new Map();
  let sinFicha = 0;
  let menores = 0;
  let notaSnapshot = 0;
  let notaDeAnulada = 0;
  // La fila se acumula por (tercero, CONCEPTO): un mismo cliente puede tener ingresos ordinarios
  // y financieros, y son dos renglones del formato, no uno.
  const tocarIdent = (bruta, concepto) => {
    if (!bruta) return null;
    if (bruta.desdeSnapshot) sinFicha += 1;
    if (bruta.desdeNota) notaSnapshot += 1;
    const ident = identificable(bruta);
    if (ident.cuantiasMenores) menores += 1;
    const clave = `${ident.documento}|${concepto}`;
    if (!acc.has(clave))
      acc.set(clave, {
        ...ident,
        concepto,
        pais: ident.codigoPais || CODIGO_PAIS_COLOMBIA,
        ingresos: 0,
        devoluciones: 0,
      });
    return acc.get(clave);
  };
  // `origen` es la factura, para poder caer a su snapshot si el cliente ya no tiene ficha.
  const tocar = (clienteId, origen, concepto = CONCEPTO_1007_POR_DEFECTO) => {
    const cliente = porId[clienteId];
    if (!cliente && !origen) return null;
    return tocarIdent(cliente ? identidadDeCliente(cliente) : identidadDeSnapshot(origen), concepto);
  };

  for (const f of facturas) {
    const a = tocar(f.clienteId, f);
    if (a) a.ingresos += Number(f.subtotal) || 0;
  }
  // Solo las notas CRÉDITO restan: una nota débito aumenta el ingreso, no lo devuelve.
  let sinFactura = 0;
  for (const nt of notas) {
    // La nota sigue la suerte de su factura: si se anuló dentro del año, ni resta ni suma sobre
    // un ingreso que ya no está en el formato. Sin factura asociada no hay vigencia que
    // comprobar y se reporta con su propio snapshot, que para eso lo guarda.
    if (nt.factura && !facturaVigenteAlCorte(nt.factura, anio)) {
      notaDeAnulada += 1;
      continue;
    }
    // Una nota DÉBITO por INTERESES (motivo 1 del Anexo 1.9) no es ingreso de actividades
    // ordinarias: es un rendimiento financiero, y va al concepto 4003 en su propio renglón.
    const concepto =
      nt.tipo === "debito" && nt.motivoCodigo === "1" ? "4003" : CONCEPTO_1007_POR_DEFECTO;
    const cliente = nt.factura?.clienteId ? porId[nt.factura.clienteId] : null;
    const a = tocarIdent(cliente ? identidadDeCliente(cliente) : identidadDeNota(nt), concepto);
    if (!a || !a.documento) {
      sinFactura += 1;
      continue;
    }
    if (nt.tipo === "credito") a.devoluciones += Number(nt.subtotal) || 0;
    else a.ingresos += Number(nt.subtotal) || 0;
  }

  const avisos = [
    `Todos los ingresos se reportan con el concepto ${CONCEPTO_1007_POR_DEFECTO} (actividades ordinarias), que es lo que corresponde a la facturación de venta. Si hubo ingresos de otra naturaleza —rendimientos financieros, ganancias ocasionales— no salen de este módulo y hay que agregarlos.`,
    'El país va en 169 (Colombia) cuando el cliente no lo tiene definido. Revísalo si tienes clientes del exterior.',
  ];
  if (sinFactura)
    avisos.push(`${sinFactura} nota(s) no se pudieron imputar a un tercero (sin factura asociada y sin snapshot con documento).`);
  if (notaSnapshot)
    avisos.push(
      `${notaSnapshot} nota(s) son de un cliente que ya no tiene ficha; se reportaron con el snapshot de la nota, SIN tipo de documento ni códigos DANE. Revísalas.`
    );
  if (notaDeAnulada)
    avisos.push(
      `${notaDeAnulada} nota(s) NO se incluyeron: su factura fue anulada dentro del año gravable y no quedó ingreso que ajustar.`
    );
  if (menores)
    avisos.push(
      `${menores} operación(es) sin tercero identificado se acumularon en el NIT ${NIT_CUANTIAS_MENORES} (tipo ${TIPO_DOC_CUANTIAS_MENORES}, "CUANTÍAS MENORES"), que es el registro previsto por la DIAN para eso.`
    );
  if (sinFicha)
    avisos.push(
      `${sinFicha} factura(s) son de un cliente que ya no tiene ficha; se reportaron con los datos congelados en el documento, que no incluyen códigos DANE. Revísalas.`
    );

  return {
    columnas: [
      { key: "concepto", header: "Concepto", width: 10 },
      { key: "tipoDocumento", header: "Tipo de documento", width: 16 },
      { key: "documento", header: "Número identificación del informado", width: 22 },
      { key: "primerApellido", header: "Primer apellido del informado", width: 22 },
      { key: "segundoApellido", header: "Segundo apellido del informado", width: 22 },
      { key: "primerNombre", header: "Primer nombre del informado", width: 22 },
      { key: "otrosNombres", header: "Otros nombres del informado", width: 22 },
      { key: "razonSocial", header: "Razón social informado", width: 34 },
      { key: "pais", header: "País de residencia o domicilio", width: 18 },
      { key: "ingresos", header: "Ingresos brutos recibidos", width: 22 },
      { key: "devoluciones", header: "Devoluciones, rebajas y descuentos", width: 24 },
    ],
    filas: [...acc.values()]
      .filter((a) => a.ingresos > 0 || a.devoluciones > 0)
      .map((a) => ({ ...a, ingresos: n2(a.ingresos), devoluciones: n2(a.devoluciones) }))
      .sort((x, y) => x.documento.localeCompare(y.documento)),
    avisos,
  };
}

const GENERADORES = {
  // El 1001 vive en su propio archivo: no comparte nada con los demás porque no sale de los
  // documentos sino del LIBRO AUXILIAR por cuenta y tercero.
  1001: { fn: generar1001, nombre: "Pagos o abonos en cuenta y retenciones practicadas" },
  1003: { fn: formato1003, nombre: "Retenciones en la fuente que le practicaron" },
  1005: { fn: formato1005, nombre: "Impuesto a las ventas por pagar (descontable)" },
  1006: { fn: formato1006, nombre: "Impuesto a las ventas por pagar (generado) e impuesto al consumo" },
  1007: { fn: formato1007, nombre: "Ingresos recibidos" },
};

export const FORMATOS_DISPONIBLES = Object.entries(GENERADORES).map(([numero, g]) => ({
  numero,
  nombre: g.nombre,
}));

/**
 * Genera un extracto. Devuelve `{ numero, nombre, columnas, filas, avisos, incompletos }`.
 *
 * `incompletos` cuenta las filas a las que les falta identificación: son las que el prevalidador
 * va a rechazar, y conviene saberlo ANTES de pegarlas ahí.
 */
export async function generarFormato(usuarioId, numero, anio) {
  const g = GENERADORES[numero];
  if (!g) return null;

  const r = await g.fn(usuarioId, anio);
  const incompletos = r.filas.filter(
    (f) => !f.documento || !f.tipoDocumento || (!f.razonSocial && !f.primerApellido)
  ).length;

  // Avisos que valen para los cuatro formatos, así no hay que repetirlos en cada generador.
  const avisos = [...r.avisos];

  // Una factura anulada SIN `fechaAnulacion` se excluye por criterio conservador (no se puede
  // saber si la anulación fue antes o después del corte). Es lo correcto, pero callarlo deja
  // ingresos fuera del reporte sin que nadie lo sepa: son datos que alguien tiene que mirar.
  const anuladasSinFecha = await prisma.factura.count({
    where: { usuarioId, estado: "anulada", fechaAnulacion: null, fecha: rango(anio) },
  });
  if (anuladasSinFecha)
    avisos.push(
      `${anuladasSinFecha} factura(s) anuladas del año NO tienen fecha de anulación, así que se EXCLUYERON: sin esa fecha no se puede saber si la anulación fue antes o después del 31 de diciembre. Revísalas una por una.`
    );

  // El módulo no evalúa los topes de la resolución: decirlo es más honesto que dejar creer que
  // el archivo generado prueba que hay obligación (o que no la hay).
  avisos.push(
    "Este extracto NO determina si la empresa está OBLIGADA a reportar: los topes de ingresos brutos y patrimonio de la resolución vigente hay que verificarlos aparte. Generar el archivo no es prueba de que haya obligación, ni de que no la haya."
  );

  return { numero: String(numero), nombre: g.nombre, anio, ...r, avisos, incompletos };
}
