// Nota de contabilidad (comprobante de contabilidad).
//
// QUÉ ES. El documento con el que se registran los AJUSTES que no tienen documento propio:
// reclasificaciones, provisiones, depreciación y amortización, causación de diferidos, cierres
// y corrección de errores. Es un comprobante de contabilidad del art. 124 del Decreto 2649 y
// debe quedar en el libro diario con su soporte.
//
// QUÉ NO ES. No sirve para registrar ventas, compras, recaudos, pagos ni nómina: esas tienen
// documento propio y su propio módulo. Es el mal uso más común, así que se dice en la interfaz
// y se bloquean las cuentas que otros módulos mantienen (ver `CUENTAS_BLINDADAS`).
//
// PREFIJO. `CC-` (comprobante de contabilidad). `NC-` ya lo usa la nota crédito
// (`Nota.numero`, `lib/motivosNota.js`) y sería una colisión real de numeración.

import { normalizarDocumento } from "@/lib/retencionesPracticadas";

import { esFechaISOValida, hoyBogota } from "@/lib/fechas";

const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round((x + Number.EPSILON) * 100) / 100 : 0;
};

// LA APERTURA ES EL ÚNICO TIPO QUE LEVANTA EL BLINDAJE.
//
// Ninguna empresa empieza en ceros: al estrenar el sistema hay que cargar la cartera por
// cliente, las cuentas por pagar, los bancos, el inventario y el patrimonio. Esas son
// exactamente las cuentas que el blindaje protege, así que sin esta excepción el sistema no se
// podía estrenar con una empresa en marcha.
//
// Se permite solo aquí y una sola vez por ejercicio, porque el riesgo que el blindaje evita
// —que el libro y los saldos materializados se separen— es real: una apertura NO crea facturas
// ni compras, así que la cartera del libro no va a coincidir con los documentos pendientes de
// cobro hasta que el usuario registre también esos documentos. La pantalla lo advierte.
export const TIPO_APERTURA = "apertura";

export const TIPOS_AJUSTE = [
  {
    id: TIPO_APERTURA,
    nombre: "Saldos de apertura",
    ayuda:
      "Carga los saldos con los que la empresa entra al sistema. Es el único tipo que puede mover cartera, proveedores y tesorería.",
  },
  { id: "ajuste", nombre: "Ajuste", ayuda: "Corrige un saldo por un hecho posterior o un cálculo pendiente." },
  { id: "reclasificacion", nombre: "Reclasificación", ayuda: "Mueve un saldo entre cuentas sin cambiar el patrimonio." },
  { id: "provision", nombre: "Provisión", ayuda: "Reconoce una obligación estimada — un PASIVO (NIC 37 / Sección 21)." },
  // El deterioro NO es una provisión: es una cuenta correctora del ACTIVO. Confundirlos es el
  // error de clasificación más común, y sin este tipo la provisión de cartera de fin de mes
  // —la nota más frecuente en Colombia— no tenía dónde ir.
  { id: "deterioro", nombre: "Deterioro", ayuda: "Deterioro de cartera, inventarios o activos (NIC 36 / Secciones 11 y 27)." },
  { id: "depreciacion", nombre: "Depreciación o amortización", ayuda: "Consumo del activo del periodo (NIC 16 / NIC 38)." },
  { id: "diferido", nombre: "Causación de diferido", ayuda: "Lleva al gasto la parte del periodo de un pago anticipado." },
  { id: "diferencia_cambio", nombre: "Diferencia en cambio", ayuda: "Reexpresión de partidas en moneda extranjera (NIC 21 / Sección 30)." },
  { id: "impuesto_diferido", nombre: "Impuesto diferido", ayuda: "Diferencias temporarias entre lo contable y lo fiscal (NIC 12 / Sección 29)." },
  { id: "reversion", nombre: "Reversión", ayuda: "Deshace un ajuste anterior que ya no procede." },
  { id: "cierre", nombre: "Cierre", ayuda: "Cancela cuentas de resultado contra el patrimonio." },
  { id: "correccion", nombre: "Corrección de error", ayuda: "Enmienda un registro equivocado (NIC 8 / Sección 10)." },
];

const IDS_TIPO = new Set(TIPOS_AJUSTE.map((t) => t.id));

export function nombreTipoAjuste(id) {
  return TIPOS_AJUSTE.find((t) => t.id === id)?.nombre || null;
}

/**
 * Cuentas cuyo saldo lo mantiene OTRO módulo y que por tanto no se pueden mover a mano.
 *
 * Cartera, proveedores y tesorería tienen saldos materializados: los comprobantes de ingreso y
 * egreso los calculan a partir de facturas, compras y aplicaciones. Un asiento manual contra
 * esas cuentas mueve el libro pero NO el saldo materializado, y a partir de ahí el libro y los
 * pendientes por cobrar dejan de coincidir sin que nada avise.
 *
 * Se resuelve desde el mapa de cuentas del usuario, no con códigos cableados: cada empresa usa
 * sus propios auxiliares.
 */
export function cuentasBlindadas(mapa) {
  if (!mapa) return new Map();
  const m = new Map();
  const marcar = (codigo, motivo) => {
    const c = T(codigo);
    if (c) m.set(c, motivo);
  };

  marcar(mapa.clientes, "la cartera la mantienen las facturas y los comprobantes de ingreso");
  marcar(mapa.proveedores, "el saldo a proveedores lo mantienen las compras y los comprobantes de egreso");
  marcar(mapa.anticipoClientes, "los anticipos los mantienen los comprobantes de ingreso");
  return m;
}

/**
 * Añade las cuentas de tesorería del usuario al blindaje. Van aparte porque son varias filas
 * (`CuentaTesoreria`) y no un campo del mapa.
 */
export function blindarTesoreria(blindadas, cuentasTesoreria) {
  for (const ct of cuentasTesoreria || []) {
    const c = T(ct.cuentaPuc);
    if (c) blindadas.set(c, "el saldo de esta cuenta lo mueven los comprobantes de tesorería");
  }
  return blindadas;
}

/**
 * Normaliza y valida el cuerpo de una nota. Puro: no toca la BD.
 * Las cuentas se validan aparte con `validarCuentasPUC`, que sí consulta el catálogo.
 */
export function normalizarNota(body) {
  const errors = [];
  const fecha = T(body.fecha);
  const ciudad = T(body.ciudad);
  const concepto = T(body.concepto);
  const tipoAjuste = T(body.tipoAjuste);
  const periodoAfectado = T(body.periodoAfectado);
  const sector = body.sector === "esal" ? "esal" : "comercial";
  const estado = body.estado === "emitido" ? "emitido" : "borrador";

  if (!fecha) errors.push("La fecha de la nota es obligatoria.");
  else if (!esFechaISOValida(fecha)) errors.push("La fecha no es válida. Usa el formato AAAA-MM-DD.");
  // Una nota con fecha futura toma consecutivo de una serie que aún no empieza y queda en el
  // libro fuera de orden cronológico, contra el art. 125 del Decreto 2649.
  else if (fecha > hoyBogota()) errors.push("La fecha de la nota no puede ser futura.");
  if (!concepto) errors.push("El concepto y la justificación son obligatorios: es el soporte del ajuste.");
  if (concepto && concepto.length < 15) {
    errors.push("El concepto debe explicar el ajuste. Un texto de menos de 15 caracteres no es una justificación.");
  }
  if (!tipoAjuste) errors.push("Indica el tipo de ajuste.");
  else if (!IDS_TIPO.has(tipoAjuste)) errors.push("El tipo de ajuste no es válido.");

  // El periodo afectado es lo que distingue un ajuste de un registro corriente: una nota
  // fechada en enero puede estar ajustando diciembre.
  if (!periodoAfectado) errors.push("Indica el periodo contable afectado (AAAA-MM).");
  else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodoAfectado)) {
    errors.push("El periodo afectado debe tener el formato AAAA-MM.");
  }

  // Un ajuste no puede afectar un periodo posterior a su propia fecha: sería registrar el
  // futuro. Al revés sí (ajustar diciembre en enero es lo normal).
  if (fecha && /^\d{4}-\d{2}$/.test(periodoAfectado) && periodoAfectado > fecha.slice(0, 7)) {
    errors.push("El periodo afectado no puede ser posterior a la fecha de la nota.");
  }

  const raw = Array.isArray(body.movimientos) ? body.movimientos : [];
  const movimientos = [];
  let totalDebitos = 0;
  let totalCreditos = 0;

  raw.forEach((m, i) => {
    const cuenta = T(m.cuenta);
    if (!cuenta) return; // línea vacía: se ignora, no es un error
    const debito = Number(m.debito) || 0;
    const credito = Number(m.credito) || 0;

    if (debito < 0 || credito < 0) errors.push(`Línea ${i + 1}: los valores no pueden ser negativos.`);
    if (debito > 0 && credito > 0) errors.push(`Línea ${i + 1}: no puede tener débito y crédito a la vez.`);
    if (debito === 0 && credito === 0) errors.push(`Línea ${i + 1}: ingresa un valor en débito o en crédito.`);

    totalDebitos += debito;
    totalCreditos += credito;
    movimientos.push({
      cuenta,
      nombreCuenta: T(m.nombreCuenta), // lo reemplaza el catálogo en validarCuentasPUC
      debito: r2(debito),
      credito: r2(credito),
      // NORMALIZADO: es la misma clave con la que agrupa el libro auxiliar y el formato 1001.
      // Si el usuario escribe un nombre en vez de un documento, `normalizarDocumento` devuelve
      // vacío y se guarda null — mejor sin tercero que con un nombre en la casilla del NIT.
      tercero: normalizarDocumento(T(m.tercero)).numero || null,
      detalle: T(m.detalle) || null,
    });
  });

  if (movimientos.length < 2) errors.push("La nota debe tener al menos 2 movimientos (partida doble).");

  const diferencia = r2(Math.abs(totalDebitos - totalCreditos));
  // El borrador puede estar descuadrado mientras se arma; emitir, no.
  if (estado === "emitido" && diferencia > 0.01) {
    errors.push(`La nota no está balanceada. Diferencia: ${diferencia}.`);
  }

  return {
    data: {
      sector,
      fecha,
      ciudad: ciudad || null,
      concepto,
      tipoAjuste,
      periodoAfectado,
      documentoRef: T(body.documentoRef) || null,
      anexos: T(body.anexos) || null,
      estado,
      totalDebitos: r2(totalDebitos),
      totalCreditos: r2(totalCreditos),
      diferencia,
    },
    movimientos,
    errors,
  };
}

/**
 * Rechaza los movimientos contra cuentas que mantiene otro módulo.
 *
 * Se aplica al EMITIR, no al guardar el borrador: así el usuario ve el error con la nota ya
 * armada y entiende de qué línea se trata.
 */
export function validarCuentasBlindadas(movimientos, blindadas, tipoAjuste) {
  // La apertura es la excepción: son justamente esas cuentas las que hay que cargar para
  // estrenar el sistema con una empresa en marcha. Ver la nota de `TIPO_APERTURA`.
  if (tipoAjuste === TIPO_APERTURA) return [];

  const errors = [];
  for (const m of movimientos || []) {
    const motivo = blindadas.get(m.cuenta);
    if (!motivo) continue;
    errors.push(
      `La cuenta ${m.cuenta} (${m.nombreCuenta || "sin nombre"}) no se puede mover con una nota de contabilidad: ${motivo}. Usa el módulo correspondiente${
        blindadas.size ? ", o una nota de Saldos de apertura si estás cargando los saldos iniciales" : ""
      }.`
    );
  }
  return errors;
}
