// Sugerencias iniciales del mapa de cuentas, por sector.
//
// Son SUGERENCIAS, no valores fijos: el catálogo cargado es un modelo de referencia con
// auxiliares de ejemplo, y ninguna empresa real tiene exactamente esas subcuentas. El
// sistema propone para que el usuario no arranque de cero; la decisión es suya y se
// confirma en Configuración antes de poder emitir comprobantes.
//
// Cada código se valida contra `CuentaPUC` al guardarse: debe existir en el sector elegido
// y ser imputable. Si el usuario cambia su plan de cuentas, aquí no hay nada cableado.

/** Campos del mapa, con su etiqueta y por qué existe. Ordena también la interfaz. */
export const CAMPOS_MAPA = [
  {
    grupo: "Cartera y proveedores",
    campos: [
      { clave: "clientes", etiqueta: "Cartera de clientes", ayuda: "Se acredita al recaudar una factura." },
      { clave: "proveedores", etiqueta: "Proveedores / cuentas por pagar", ayuda: "Se debita al pagar una compra." },
      {
        clave: "anticipoClientes",
        etiqueta: "Anticipos de clientes",
        ayuda:
          "Cuando se recibe dinero que NO corresponde a una factura emitida. Es un pasivo, no un ingreso: decidirlo mal cambia el IVA del periodo.",
      },
    ],
  },
  {
    grupo: "Retenciones que nos practican (activo)",
    campos: [
      { clave: "reteFuenteFavor", etiqueta: "ReteFuente a favor", ayuda: "Anticipo de impuesto de renta a nuestro favor." },
      { clave: "reteIvaFavor", etiqueta: "ReteIVA a favor", ayuda: "Se descuenta en la declaración de IVA." },
      {
        clave: "reteIcaFavor",
        etiqueta: "ReteICA a favor",
        ayuda:
          "Se descuenta en la declaración de ICA del municipio donde se practicó. Si se mezclan municipios en una sola cuenta, esa declaración se liquida mal.",
      },
    ],
  },
  {
    grupo: "Retenciones que practicamos (pasivo)",
    campos: [
      { clave: "reteFuentePorPagar", etiqueta: "ReteFuente por pagar", ayuda: "Se le debe a la DIAN." },
      { clave: "reteIvaPorPagar", etiqueta: "ReteIVA por pagar", ayuda: "Se le debe a la DIAN." },
      { clave: "reteIcaPorPagar", etiqueta: "ReteICA por pagar", ayuda: "Se le debe al municipio." },
    ],
  },
  {
    grupo: "Impuestos",
    campos: [
      { clave: "ivaGenerado", etiqueta: "IVA generado", ayuda: "IVA cobrado en las ventas." },
      { clave: "ivaDescontable", etiqueta: "IVA descontable", ayuda: "IVA pagado en las compras." },
      {
        clave: "incPorPagar",
        etiqueta: "Impuesto al Consumo por pagar",
        ayuda: "El INC no es IVA: se declara aparte y no se compensa con el IVA descontable.",
      },
    ],
  },
  {
    grupo: "Otros conceptos del pago",
    campos: [
      { clave: "gmf", etiqueta: "GMF (4x1000)", ayuda: "Gravamen a los movimientos financieros, cuando la cuenta está gravada." },
      { clave: "descuentoProntoPago", etiqueta: "Descuento por pronto pago", ayuda: "Su tratamiento (ingreso financiero o menor valor) lo decide el contador." },
      { clave: "ajusteAlPeso", etiqueta: "Ajuste al peso", ayuda: "Diferencias de redondeo. Nunca debe usarse para cuadrar descuadres reales." },
    ],
  },
];

/**
 * Sugerencias por sector. Solo se proponen las que existen en el catálogo cargado; el
 * endpoint descarta las que no encuentre en vez de guardar un código inválido.
 */
export const SUGERENCIAS = {
  comercial: {
    clientes: "13050501",
    proveedores: "220510",
    anticipoClientes: null,
    reteFuenteFavor: "13551501",
    reteIvaFavor: "13551701",
    reteIcaFavor: "13551801",
    reteFuentePorPagar: "23654001",
    reteIvaPorPagar: "23670501",
    reteIcaPorPagar: "23680501",
    ivaGenerado: "24080501",
    ivaDescontable: "24081001",
    incPorPagar: null,
    gmf: null,
    descuentoProntoPago: null,
    ajusteAlPeso: null,
  },
  esal: {
    clientes: "132005",
    proveedores: null,
    anticipoClientes: null,
    reteFuenteFavor: "133505",
    reteIvaFavor: "133515",
    reteIcaFavor: "133520",
    reteFuentePorPagar: "242095",
    reteIvaPorPagar: null,
    reteIcaPorPagar: null,
    ivaGenerado: null,
    ivaDescontable: null,
    incPorPagar: null,
    gmf: null,
    descuentoProntoPago: null,
    ajusteAlPeso: null,
  },
};

/** Cuentas de tesorería sugeridas al arrancar. */
export const TESORERIA_SUGERIDA = {
  comercial: [
    { nombre: "Caja general", cuentaPuc: "11050501", tipo: "caja", medioPago: "Efectivo", gravadaGmf: false, predeterminada: false },
    { nombre: "Banco — Cuenta corriente", cuentaPuc: "11100501", tipo: "banco", medioPago: "Transferencia", gravadaGmf: true, predeterminada: true },
    { nombre: "Banco — Cuenta de ahorros", cuentaPuc: "11100502", tipo: "banco", medioPago: null, gravadaGmf: true, predeterminada: false },
  ],
  esal: [],
};

/** Campos que deben estar definidos para poder emitir comprobantes de tesorería. */
export const CAMPOS_MINIMOS = ["clientes", "proveedores"];
