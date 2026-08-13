// Asientos que generan las OPERACIONES.
//
// EL PROBLEMA QUE RESUELVE. Hasta ahora solo los comprobantes de tesorería y las notas de
// contabilidad escribían en `Asiento`. Las ventas, las compras, las notas D/C, los documentos
// soporte y la nómina no llegaban al libro por ninguna vía, así que el "libro diario" era en
// realidad el auxiliar de bancos más los ajustes. El art. 125 del Decreto 2649 exige que el
// diario registre TODAS las operaciones del periodo, en orden cronológico.
//
// CUANDO FALTA UNA CUENTA NO SE BLOQUEA EL DOCUMENTO. Un usuario que no ha terminado su mapa
// de cuentas tiene que poder facturar: bloquear la emisión convertiría una tarea de
// configuración en una parálisis del negocio. En su lugar el documento se emite con
// `asientoId: null` y queda en la lista de PENDIENTES POR CONTABILIZAR, que la pantalla de
// Contabilidad muestra con su contador. Así el hueco es visible y recuperable, en vez de
// silencioso — que es exactamente el defecto que este módulo viene a corregir.
//
// SIGNO. Cada generador devuelve movimientos con `debito` y `credito` positivos; nunca un
// débito negativo. Un importe negativo en el libro es imposible de leer y de sumar.

const r2 = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round((x + Number.EPSILON) * 100) / 100 : 0;
};

// Marca temporal de reserva. Es un valor imposible como id de asiento, así que un documento
// que quedara con este valor por una caída sería detectable; en la práctica no ocurre porque
// se escribe y se resuelve dentro de la misma transacción.
const RESERVADO = "__contabilizando__";

/** Acumulador de movimientos que ignora los importes en cero y agrupa por cuenta. */
function crearAsiento() {
  const filas = [];
  const faltantes = [];

  function poner(lado, cuenta, valor, { concepto, tercero } = {}) {
    const v = r2(valor);
    if (v <= 0) return; // una línea en cero no aporta nada y ensucia el impreso
    if (!cuenta) {
      // Se registra qué concepto quedó sin cuenta, no solo que "falta algo".
      if (!faltantes.includes(concepto)) faltantes.push(concepto);
      return;
    }
    filas.push({ cuenta, [lado]: v, otro: lado === "debito" ? "credito" : "debito", tercero: tercero || null });
  }

  return {
    debito: (cuenta, valor, opciones) => poner("debito", cuenta, valor, opciones),
    credito: (cuenta, valor, opciones) => poner("credito", cuenta, valor, opciones),
    /** Movimientos listos para `AsientoMovimiento`, agrupados por cuenta y tercero. */
    resultado() {
      const porClave = new Map();
      for (const f of filas) {
        const clave = `${f.cuenta}|${f.tercero || ""}`;
        if (!porClave.has(clave)) {
          porClave.set(clave, { cuenta: f.cuenta, tercero: f.tercero, debito: 0, credito: 0 });
        }
        const m = porClave.get(clave);
        m.debito = r2(m.debito + (f.debito || 0));
        m.credito = r2(m.credito + (f.credito || 0));
      }

      // Una cuenta que quedó con débito y crédito a la vez se neta: es el mismo saldo y dos
      // líneas opuestas en la misma cuenta no dicen nada.
      const movimientos = [];
      for (const m of porClave.values()) {
        const neto = r2(m.debito - m.credito);
        if (neto === 0) continue;
        movimientos.push({
          cuenta: m.cuenta,
          tercero: m.tercero,
          debito: neto > 0 ? neto : 0,
          credito: neto < 0 ? -neto : 0,
        });
      }

      const totalDebitos = r2(movimientos.reduce((a, m) => a + m.debito, 0));
      const totalCreditos = r2(movimientos.reduce((a, m) => a + m.credito, 0));
      return {
        movimientos,
        totalDebitos,
        totalCreditos,
        diferencia: r2(Math.abs(totalDebitos - totalCreditos)),
        faltantes,
      };
    },
  };
}

/** Identificación del tercero para el auxiliar y los medios magnéticos. */
const t3 = (nombre, doc) => (doc ? `${doc}` : nombre || null);

// ============================ Factura de venta ============================
//
// DR Clientes (lo que queda por cobrar, ya neto de las retenciones que nos practicaron)
// DR ReteFuente / ReteIVA / ReteICA a favor  ← son un ANTICIPO de impuesto, un activo
// CR Ingresos por ventas (el subtotal, sin impuestos)
// CR IVA generado
// CR Impuesto al consumo por pagar  ← NO es IVA: otro tributo, otro formulario
export function movimientosDeFactura(f, mapa, causadas = true) {
  const a = crearAsiento();
  const tercero = t3(f.clienteNombre, f.clienteNumeroDocumento);

  // LA POLÍTICA DECIDE QUIÉN RECONOCE LA RETENCIÓN. Si se causan (lo estándar), la factura
  // reconoce el activo y la cartera queda por el NETO. Si el usuario las registra al pagar, el
  // comprobante de ingreso lo hace y aquí la cartera va por el BRUTO: reconocerlas en los dos
  // sitios duplicaba el anticipo declarado y dejaba la cartera con saldo crédito.
  if (causadas) {
    a.debito(mapa.clientes, f.totalACobrar, { concepto: "Clientes (cartera)", tercero });
    a.debito(mapa.reteFuenteFavor, f.retenciones, { concepto: "ReteFuente a favor", tercero });
    a.debito(mapa.reteIvaFavor, f.reteIva, { concepto: "ReteIVA a favor", tercero });
    a.debito(mapa.reteIcaFavor, f.reteIca, { concepto: "ReteICA a favor", tercero });
  } else {
    a.debito(mapa.clientes, f.total, { concepto: "Clientes (cartera)", tercero });
  }

  a.credito(mapa.ingresosVentas, f.subtotal, { concepto: "Ingresos por ventas", tercero });
  a.credito(mapa.ivaGenerado, f.iva, { concepto: "IVA generado", tercero });
  a.credito(mapa.incPorPagar, f.inc, { concepto: "Impuesto al consumo por pagar", tercero });
  // `otrosImpuestos` (bolsas, licores, etc.) va contra la misma cuenta del INC mientras no
  // exista una propia: son tributos que se recaudan y se deben, no ingreso.
  a.credito(mapa.incPorPagar, f.otrosImpuestos, { concepto: "Otros impuestos por pagar", tercero });

  return a.resultado();
}

// ============================ Nota crédito / débito ============================
//
// La nota crédito NO se registra como un ingreso negativo: va a DEVOLUCIONES EN VENTAS, que es
// una cuenta propia (4175). El ingreso bruto del periodo debe seguir viéndose, con su
// devolución al lado; netearlos borra información que la declaración de renta pide.
export function movimientosDeNota(n, mapa) {
  const a = crearAsiento();
  const tercero = t3(n.clienteNombre, n.clienteDocumento);
  const esCredito = n.tipo === "credito";

  if (esCredito) {
    // Menos por cobrar, y la venta se devuelve.
    a.debito(mapa.devolucionesVentas, n.subtotal, { concepto: "Devoluciones en ventas", tercero });
    a.debito(mapa.ivaGenerado, n.totalIva, { concepto: "IVA generado", tercero });
    a.credito(mapa.clientes, n.totalNota, { concepto: "Clientes (cartera)", tercero });
  } else {
    // Nota débito: más por cobrar. Es un mayor valor de la venta.
    a.debito(mapa.clientes, n.totalNota, { concepto: "Clientes (cartera)", tercero });
    a.credito(mapa.ingresosVentas, n.subtotal, { concepto: "Ingresos por ventas", tercero });
    a.credito(mapa.ivaGenerado, n.totalIva, { concepto: "IVA generado", tercero });
  }

  return a.resultado();
}

// ============================ Compra ============================
//
// DR Inventario o compras (el subtotal)
// DR IVA descontable
// CR ReteFuente / ReteIVA / ReteICA por pagar  ← las que NOSOTROS practicamos: un PASIVO
// CR Proveedores (lo que queda por pagar, ya neto de las retenciones)
export function movimientosDeCompra(c, mapa, causadas = true) {
  const a = crearAsiento();
  const tercero = t3(c.proveedorNombre, c.proveedorNit);
  const r = c.retenciones || {};

  a.debito(mapa.comprasInventario, c.subtotal, { concepto: "Compras o inventario", tercero });
  a.debito(mapa.ivaDescontable, c.totalIva, { concepto: "IVA descontable", tercero });

  // Espejo de la factura: con la política estándar la compra reconoce el pasivo por retención
  // y proveedores queda por el neto; si se registran al pagar, lo hace el comprobante de
  // egreso y aquí proveedores va por el bruto. Acreditarlas dos veces significaba declarar y
  // consignar a la DIAN el doble de lo retenido.
  if (causadas) {
    a.credito(mapa.reteFuentePorPagar, r.retefuente?.valor, { concepto: "ReteFuente por pagar", tercero });
    a.credito(mapa.reteIvaPorPagar, r.reteiva?.valor, { concepto: "ReteIVA por pagar", tercero });
    a.credito(mapa.reteIcaPorPagar, r.reteica?.valor, { concepto: "ReteICA por pagar", tercero });
    a.credito(mapa.proveedores, c.totalAPagar, { concepto: "Proveedores", tercero });
  } else {
    a.credito(mapa.proveedores, c.totalBruto, { concepto: "Proveedores", tercero });
  }

  return a.resultado();
}

// ============================ Documento soporte ============================
//
// Adquisición a no obligados a facturar. No lleva IVA descontable: el proveedor no lo cobra.
// LA CONTRAPARTIDA DEPENDE DE QUÉ OCURRIÓ PRIMERO.
//
//   · Soporte normal: se causa la obligación y se paga después → CR Proveedores.
//   · Soporte que legaliza un pago ya hecho: la plata salió antes y el egreso la dejó en
//     ANTICIPOS POR LEGALIZAR (1330); el soporte cancela ese anticipo, no crea un pasivo.
//     Acreditar proveedores aquí dejaría esa cuenta con saldo DÉBITO —un activo disfrazado de
//     pasivo— y el gasto sin reconocer entre el pago y la legalización.
export function movimientosDeSoporte(s, mapa) {
  const a = crearAsiento();
  const tercero = t3(s.proveedorNombre, s.proveedorDocumento);
  const legalizaUnPago = !!s.generadoDesdeComprobanteId;

  a.debito(mapa.gastosGenerales, s.bruto, { concepto: "Gastos generales", tercero });
  a.credito(mapa.reteFuentePorPagar, s.reteFuente, { concepto: "ReteFuente por pagar", tercero });
  a.credito(mapa.reteIcaPorPagar, s.reteIca, { concepto: "ReteICA por pagar", tercero });
  a.credito(legalizaUnPago ? mapa.anticiposPorLegalizar : mapa.proveedores, s.neto, {
    concepto: legalizaUnPago ? "Anticipos por legalizar" : "Proveedores",
    tercero,
  });

  return a.resultado();
}

// ============================ Nómina ============================
//
// El GASTO es el devengo completo. La salud y la pensión descontadas al trabajador no son un
// gasto menor: son un pasivo con la EPS y el fondo, que la empresa consigna después. Restarlas
// del gasto subestimaría el costo laboral del periodo.
//
// Este asiento cubre solo la NÓMINA DEL TRABAJADOR. Los aportes patronales (salud, pensión,
// ARL, parafiscales) y las prestaciones sociales (cesantías, intereses, prima, vacaciones) son
// gasto adicional del empleador y este módulo todavía no los liquida.
export function movimientosDeNomina(n, mapa) {
  const a = crearAsiento();
  const tercero = t3(n.empleadoNombre, n.empleadoDocumento);

  a.debito(mapa.gastoNomina, n.totalDevengos, { concepto: "Gasto de nómina", tercero });

  a.credito(mapa.saludPorPagar, n.salud, { concepto: "Aportes de salud por pagar", tercero });
  a.credito(mapa.pensionPorPagar, n.pension, { concepto: "Aportes de pensión por pagar", tercero });
  // El descuento del préstamo ABONA la cuenta por cobrar al trabajador: no es un pasivo nuevo.
  a.credito(mapa.prestamosEmpleados, n.prestamos, { concepto: "Préstamos a empleados", tercero });
  a.credito(mapa.otrasDeduccionesNomina, n.otrasDeducciones, { concepto: "Otras deducciones de nómina", tercero });
  a.credito(mapa.salariosPorPagar, n.neto, { concepto: "Salarios por pagar", tercero });

  return a.resultado();
}

// ============================ Registro en el libro ============================

const GENERADORES = {
  factura: movimientosDeFactura,
  nota: movimientosDeNota,
  compra: movimientosDeCompra,
  documento_soporte: movimientosDeSoporte,
  nomina: movimientosDeNomina,
};

/** Cómo se describe cada documento en el libro y con qué prefijo se numera su asiento. */
const META = {
  factura: { etiqueta: "Factura de venta", prefijo: "FV" },
  nota: { etiqueta: "Nota", prefijo: "NT" },
  compra: { etiqueta: "Compra", prefijo: "CP" },
  documento_soporte: { etiqueta: "Documento soporte", prefijo: "DS" },
  nomina: { etiqueta: "Nómina", prefijo: "NM" },
};

export const TIPOS_CONTABILIZABLES = Object.keys(GENERADORES);

/**
 * Genera el asiento de un documento y lo escribe, dentro de la transacción que se le pase.
 *
 * No numera con un consecutivo propio: usa la REFERENCIA del documento (`FV-FE-001`,
 * `CP-FP-450`). El asiento no es un documento aparte que necesite su propia serie — es el
 * reflejo del que sí la tiene, y así el libro dice de un vistazo de dónde salió cada línea.
 *
 * @returns { asiento } si se contabilizó, o { faltantes } si el mapa está incompleto.
 */
export async function contabilizarDocumento(tx, { usuarioId, tipo, documento, mapa, descripcion, docRef, fecha }) {
  const generador = GENERADORES[tipo];
  if (!generador) throw new Error(`Tipo de documento no contabilizable: ${tipo}`);
  if (!mapa) return { faltantes: ["El mapa de cuentas no está configurado"] };

  const causadas = mapa.retencionesEnCausacion !== false;
  const propuesta = generador(documento, mapa, causadas);
  let { movimientos, totalDebitos, totalCreditos, faltantes } = propuesta;
  let diferencia = propuesta.diferencia;
  if (faltantes.length) return { faltantes };
  if (movimientos.length < 2) return { faltantes: ["El documento no produce movimientos contables"] };

  // DESCUADRE DE CENTAVOS. Cada componente se redondea por separado contra un total que se
  // redondeó una sola vez, así que un peso de diferencia es normal y no es un error: es la
  // partida de cierre. Se cierra contra la cuenta de ajuste al peso en vez de rechazar el
  // documento —rechazarlo dejaría fuera del libro una compra perfectamente válida— pero solo
  // hasta $1: por encima de eso hay un error real y sí se rechaza.
  if (diferencia > 0 && diferencia <= 1 && mapa.ajusteAlPeso) {
    // El ajuste va del lado que falta. Se calcula ANTES de tocar los totales: usar el total ya
    // modificado para decidir el otro lado invierte el signo del segundo cálculo.
    const faltaDebito = totalCreditos > totalDebitos;
    movimientos.push({
      cuenta: mapa.ajusteAlPeso,
      tercero: null,
      debito: faltaDebito ? diferencia : 0,
      credito: faltaDebito ? 0 : diferencia,
    });
    totalDebitos = r2(totalDebitos + (faltaDebito ? diferencia : 0));
    totalCreditos = r2(totalCreditos + (faltaDebito ? 0 : diferencia));
    diferencia = r2(Math.abs(totalDebitos - totalCreditos));
  }

  // Falla cerrado: un asiento descuadrado en el libro es peor que no tenerlo, porque el
  // descuadre se arrastra y nadie sabe de dónde salió. Se compara contra CERO, no contra
  // 0.01: un centavo pasaba el filtro y además se guardaba diciendo `diferencia: 0`.
  if (diferencia > 0) {
    return {
      faltantes: [
        `El asiento propuesto no cuadra por ${diferencia}. Revisa las cuentas del mapa${
          mapa.ajusteAlPeso ? "" : ", o define la cuenta de Ajuste al peso para cerrar diferencias de redondeo"
        }.`,
      ],
    };
  }

  const meta = META[tipo];
  const numero = await numeroLibre(tx, usuarioId, `${meta.prefijo}-${docRef}`);

  const asiento = await tx.asiento.create({
    data: {
      usuarioId,
      numero,
      sector: mapa.sector,
      fecha,
      descripcion: `${meta.etiqueta} ${docRef}: ${descripcion}`.slice(0, 200),
      tipo,
      documentoRef: docRef,
      estado: "registrado",
      totalDebitos,
      totalCreditos,
      diferencia: 0,
      movimientos: {
        create: await conNombres(tx, mapa.sector, movimientos),
      },
    },
  });

  return { asiento };
}

/**
 * De dónde saca cada tipo su referencia, su fecha y su descripción para el libro.
 *
 * Vive aquí y no en cada endpoint para que "cómo se ve una compra en el libro" se decida en un
 * solo sitio: si mañana cambia, cambia para el documento nuevo y para el backfill a la vez.
 */
const DATOS_LIBRO = {
  factura: (f) => ({ docRef: f.numeroCompleto, fecha: f.fecha, descripcion: f.clienteNombre }),
  nota: (n) => ({ docRef: n.numero, fecha: n.fecha, descripcion: `${n.motivoLabel} — ${n.clienteNombre || ""}` }),
  compra: (c) => ({ docRef: c.numFactura, fecha: c.fecha, descripcion: c.proveedorNombre }),
  documento_soporte: (s) => ({ docRef: s.numero, fecha: s.fecha, descripcion: s.concepto }),
  nomina: (n) => ({
    docRef: `${n.id.slice(-6).toUpperCase()}`,
    // `fechaLiquidacion` es un DateTime; el libro trabaja con 'AAAA-MM-DD'.
    fecha: new Date(n.fechaLiquidacion).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }),
    descripcion: `${n.empleadoNombre} — ${n.diasTrabajados} días`,
  }),
};

/** El modelo de Prisma donde vive cada tipo, para poder enlazar el `asientoId`. */
const MODELO = {
  factura: "factura",
  nota: "nota",
  compra: "compra",
  documento_soporte: "documentoSoporte",
  nomina: "nomina",
};

/**
 * Contabiliza un documento y le enlaza el asiento. Es lo que llaman los endpoints.
 *
 * Si el mapa está incompleto NO falla: devuelve los conceptos que faltan y deja el documento
 * sin contabilizar, para que se recupere después desde Contabilidad.
 *
 * @returns { asiento } | { faltantes } | { yaContabilizado: true }
 */
export async function contabilizarYEnlazar(tx, { usuarioId, tipo, documento, mapa }) {
  if (documento.asientoId) return { yaContabilizado: true };

  const modelo = MODELO[tipo];

  // RESERVA ATÓMICA. El documento se relee y se marca dentro de la transacción con un
  // `updateMany` condicionado a `asientoId: null`. Sin esto, dos peticiones concurrentes a
  // /api/contabilizar (dos pestañas, o un reintento tras un timeout del cliente) leían la
  // misma lista de pendientes y ambas creaban asiento: el segundo tomaba número con sufijo
  // `-2`, así que ni siquiera chocaba contra el @@unique, y quedaban DOS asientos vivos para
  // el mismo documento, uno de ellos invisible e irreversable.
  const reserva = await tx[modelo].updateMany({
    where: { id: documento.id, usuarioId, asientoId: null },
    data: { asientoId: RESERVADO },
  });
  if (reserva.count !== 1) return { yaContabilizado: true };

  const datos = DATOS_LIBRO[tipo](documento);
  const resultado = await contabilizarDocumento(tx, { usuarioId, tipo, documento, mapa, ...datos });

  await tx[modelo].update({
    where: { id: documento.id },
    // Si no se pudo contabilizar, la reserva se suelta: el documento vuelve a pendientes.
    data: { asientoId: resultado.asiento?.id || null },
  });
  return resultado;
}

/**
 * Reversa el asiento de un documento con un CONTRAASIENTO.
 *
 * No se borra ni se anula el original: el art. 125 del Decreto 2649 no admite huecos en el
 * libro. Un documento anulado, eliminado o editado deja su asiento y suma el que lo invierte.
 */
export async function reversarAsientoDe(tx, { usuarioId, asientoId, fecha, motivo }) {
  if (!asientoId) return null;
  const original = await tx.asiento.findUnique({ where: { id: asientoId }, include: { movimientos: true } });
  if (!original || original.usuarioId !== usuarioId) return null;

  // Si YA tiene contraasiento, no se reversa dos veces: dejaría el saldo invertido.
  //
  // Se comprueba por `reversaAId`, no por el texto de la descripción. Comparando por prefijo,
  // "Reversión de CP-450" parecía la reversión de "CP-45" —`numFactura` es texto libre del
  // proveedor— y el segundo asiento se quedaba sin contraasiento y sin documento que lo
  // soportara, contra el art. 124 del Decreto 2649.
  const yaReversado = await tx.asiento.findFirst({
    where: { usuarioId, reversaAId: original.id },
    select: { id: true },
  });
  if (yaReversado) return yaReversado;

  const contra = await tx.asiento.create({
    data: {
      usuarioId,
      numero: await numeroLibre(tx, usuarioId, `REV-${original.numero}`),
      reversaAId: original.id,
      sector: original.sector,
      fecha,
      descripcion: `Reversión de ${original.numero}${motivo ? `: ${motivo}` : ""}`.slice(0, 200),
      tipo: original.tipo,
      documentoRef: original.documentoRef,
      estado: "registrado",
      totalDebitos: original.totalCreditos,
      totalCreditos: original.totalDebitos,
      diferencia: 0,
      movimientos: {
        create: original.movimientos.map((m) => ({
          cuenta: m.cuenta,
          nombreCuenta: m.nombreCuenta,
          debito: m.credito, // invertido
          credito: m.debito,
          tercero: m.tercero,
        })),
      },
    },
  });

  // El original queda ENLAZADO con su contraasiento, pero NO se marca `anulado`.
  //
  // Un asiento reversado no está anulado: sigue en el libro y es el contraasiento el que lo
  // neutraliza. Los DOS tienen que contar. Marcar solo el original lo sacaría de los totales
  // dejando dentro al contraasiento, y el saldo de cada cuenta quedaría invertido.
  await tx.asiento.update({
    where: { id: original.id },
    data: { reversadoPorId: contra.id },
  });

  return contra;
}

/**
 * Primer número libre de la serie: `CP-FP-450`, y si está tomado, `CP-FP-450-2`.
 *
 * Hace falta porque el asiento se numera con la referencia del documento y un documento se
 * puede contabilizar más de una vez: editar una compra reversa su asiento y registra el nuevo,
 * y el nuevo llevaría el mismo número. El `@@unique([usuarioId, numero])` lo rechazaría con un
 * P2002 que el usuario no puede interpretar.
 */
async function numeroLibre(tx, usuarioId, base) {
  const parecidos = await tx.asiento.findMany({
    where: { usuarioId, numero: { startsWith: base } },
    select: { numero: true },
  });
  const tomados = new Set(parecidos.map((a) => a.numero));
  if (!tomados.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidato = `${base}-${i}`;
    if (!tomados.has(candidato)) return candidato;
  }
  throw new Error(`No hay número libre para la serie ${base}.`);
}

/**
 * El nombre de la cuenta lo pone el CATÁLOGO, no quien arma el asiento.
 *
 * Es la misma regla que ya aplica `validarCuentasPUC`: ese nombre se imprime en documentos
 * contables, y un código correcto con el nombre de otra cuenta queda por escrito.
 */
async function conNombres(tx, sector, movimientos) {
  const codigos = [...new Set(movimientos.map((m) => m.cuenta))];
  const cuentas = await tx.cuentaPUC.findMany({
    where: { sector, codigo: { in: codigos } },
    select: { codigo: true, nombre: true },
  });
  const porCodigo = new Map(cuentas.map((c) => [c.codigo, c.nombre]));
  return movimientos.map((m) => ({
    cuenta: m.cuenta,
    nombreCuenta: porCodigo.get(m.cuenta) || m.cuenta,
    debito: m.debito,
    credito: m.credito,
    tercero: m.tercero,
  }));
}
