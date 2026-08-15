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
        clave: "anticiposPorLegalizar",
        etiqueta: "Anticipos por legalizar",
        ayuda:
          "Cuando el pago sale ANTES de tener el documento que lo soporta. Es un activo (1330): entregamos plata y todavía no tenemos el bien, el servicio ni el documento. Llevarlo a proveedores dejaría esa cuenta con saldo débito y el gasto sin reconocer.",
      },
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
    grupo: "Ventas y compras",
    ayuda:
      "Sin estas cuentas, las facturas, las compras y los documentos soporte NO llegan al libro diario: se emiten, pero quedan pendientes por contabilizar.",
    campos: [
      { clave: "ingresosVentas", etiqueta: "Ingresos por ventas", ayuda: "Se acredita con el subtotal de cada factura, sin impuestos." },
      {
        clave: "devolucionesVentas",
        etiqueta: "Devoluciones en ventas",
        ayuda:
          "Destino de las notas crédito. No se registran como ingreso negativo: netearlas borra el ingreso bruto del periodo, que la declaración de renta sí pide.",
      },
      {
        clave: "comprasInventario",
        etiqueta: "Compras o inventario",
        ayuda:
          "Contrapartida de la compra. ⚠️ El sistema NO descarga inventario ni registra costo de ventas al facturar, así que si eliges una cuenta de inventario (14) el saldo crecerá sin bajar y la utilidad saldrá inflada. Mientras no haya costeo, usa una cuenta de COMPRAS (62, método periódico).",
      },
      {
        clave: "gastosGenerales",
        etiqueta: "Gastos generales",
        ayuda:
          "Contrapartida del documento soporte. ⚠️ El pasivo que crea el soporte todavía no se puede cancelar por tesorería —el comprobante de egreso solo se aplica a compras—, así que el saldo de proveedores por soportes crece y no baja.",
      },
    ],
  },
  {
    grupo: "Nómina",
    ayuda:
      "La salud y la pensión DESCONTADAS al trabajador no son menor gasto: son un pasivo con la EPS y el fondo. El gasto es el devengo completo.",
    campos: [
      { clave: "gastoNomina", etiqueta: "Gasto de nómina", ayuda: "Se debita con el total devengado, antes de deducciones." },
      { clave: "salariosPorPagar", etiqueta: "Salarios por pagar", ayuda: "El neto que queda por entregarle al trabajador." },
      { clave: "saludPorPagar", etiqueta: "Salud por pagar", ayuda: "El 4% descontado, que se le consigna a la EPS." },
      { clave: "pensionPorPagar", etiqueta: "Pensión por pagar", ayuda: "El 4% descontado, que se le consigna al fondo." },
      {
        clave: "prestamosEmpleados",
        etiqueta: "Préstamos a empleados",
        ayuda: "El descuento ABONA esta cuenta por cobrar; no crea un pasivo nuevo.",
      },
      { clave: "otrasDeduccionesNomina", etiqueta: "Otras deducciones", ayuda: "Embargos, libranzas, fondo de empleados." },
      {
        clave: "gastoAportesPatronales",
        etiqueta: "Gasto de aportes patronales",
        ayuda: "Salud, pensión, ARL y parafiscales a cargo del empleador. Es costo adicional, no se le descuenta a nadie.",
      },
      {
        clave: "gastoPrestaciones",
        etiqueta: "Gasto de prestaciones sociales",
        ayuda: "Cesantías, intereses, prima y vacaciones. Se causan cada mes aunque se paguen después (NIC 19 / Sección 28).",
      },
      { clave: "arlPorPagar", etiqueta: "ARL por pagar", ayuda: "La tarifa depende de la clase de riesgo del cargo, del 0,522% al 6,96%." },
      { clave: "parafiscalesPorPagar", etiqueta: "Parafiscales por pagar", ayuda: "SENA, ICBF y caja de compensación." },
      { clave: "cesantiasPorPagar", etiqueta: "Cesantías por pagar", ayuda: "Se consignan al fondo antes del 14 de febrero." },
      { clave: "interesesCesantiasPorPagar", etiqueta: "Intereses sobre cesantías por pagar", ayuda: "12% anual sobre las cesantías; se pagan al trabajador en enero." },
      { clave: "primaPorPagar", etiqueta: "Prima de servicios por pagar", ayuda: "Se paga en junio y en diciembre." },
      { clave: "vacacionesPorPagar", etiqueta: "Vacaciones por pagar", ayuda: "15 días hábiles por año trabajado." },
    ],
  },
  {
    grupo: "Entradas que no son ingreso",
    ayuda:
      "Un préstamo crea una obligación y un aporte va al patrimonio. Registrarlos como ingreso infla el resultado y la base del IVA.",
    campos: [
      {
        clave: "obligacionesFinancieras",
        etiqueta: "Obligaciones financieras",
        ayuda: "Destino de un préstamo recibido. Es un pasivo, no un ingreso.",
      },
      {
        clave: "aportesSociales",
        etiqueta: "Aportes sociales / capital",
        ayuda: "Destino de un aporte de socios. Va al patrimonio.",
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
    anticiposPorLegalizar: "133005",
    reteFuenteFavor: "13551501",
    reteIvaFavor: "13551701",
    reteIcaFavor: "13551801",
    reteFuentePorPagar: "23654001",
    reteIvaPorPagar: "23670501",
    reteIcaPorPagar: "23680501",
    ivaGenerado: "24080501",
    ivaDescontable: "24081001",
    incPorPagar: null,
    ingresosVentas: "41350501",
    devolucionesVentas: "41750501",
    comprasInventario: "14350501",
    gastosGenerales: null,
    gastoNomina: "51050501",
    salariosPorPagar: "25050501",
    // El catálogo NIIF cargado NO trae cuentas de salud y pensión por pagar (2370), ni de
    // cuentas por cobrar a trabajadores (1365). No se inventa un código: se deja en blanco y
    // la nómina queda pendiente por contabilizar hasta que el usuario elija sus auxiliares.
    saludPorPagar: "237005",
    pensionPorPagar: "237006",
    prestamosEmpleados: "136505",
    otrasDeduccionesNomina: "238095",
    gastoAportesPatronales: "510527",
    gastoPrestaciones: "510536",
    arlPorPagar: "237010",
    parafiscalesPorPagar: "237015",
    cesantiasPorPagar: "250510",
    interesesCesantiasPorPagar: "250515",
    primaPorPagar: "250520",
    vacacionesPorPagar: "250525",
    obligacionesFinancieras: null,
    aportesSociales: null,
    gmf: null,
    descuentoProntoPago: null,
    ajusteAlPeso: null,
  },
  esal: {
    clientes: "132005",
    proveedores: null,
    anticipoClientes: null,
    anticiposPorLegalizar: null,
    reteFuenteFavor: "133505",
    reteIvaFavor: "133515",
    reteIcaFavor: "133520",
    reteFuentePorPagar: "242095",
    reteIvaPorPagar: null,
    reteIcaPorPagar: null,
    ivaGenerado: null,
    ivaDescontable: null,
    incPorPagar: null,
    ingresosVentas: null,
    devolucionesVentas: null,
    comprasInventario: null,
    gastosGenerales: null,
    gastoNomina: null,
    salariosPorPagar: null,
    saludPorPagar: null,
    pensionPorPagar: null,
    prestamosEmpleados: null,
    otrasDeduccionesNomina: null,
    gastoAportesPatronales: null,
    gastoPrestaciones: null,
    arlPorPagar: null,
    parafiscalesPorPagar: null,
    cesantiasPorPagar: null,
    interesesCesantiasPorPagar: null,
    primaPorPagar: null,
    vacacionesPorPagar: null,
    obligacionesFinancieras: null,
    aportesSociales: null,
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
