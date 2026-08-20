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
      { clave: "gastoNomina", etiqueta: "Gasto de nómina", ayuda: "Sueldos, horas extra, recargos y comisiones, antes de deducciones." },
      {
        clave: "gastoAuxilioTransporte",
        etiqueta: "Gasto de auxilio de transporte",
        ayuda: "Va aparte del sueldo: no es salario (art. 128 CST) y la nómina electrónica lo pide identificado.",
      },
      { clave: "salariosPorPagar", etiqueta: "Salarios por pagar", ayuda: "El neto que queda por entregarle al trabajador." },
      { clave: "saludPorPagar", etiqueta: "Salud por pagar", ayuda: "El 4% descontado, que se le consigna a la EPS." },
      { clave: "pensionPorPagar", etiqueta: "Pensión por pagar", ayuda: "El 4% descontado, que se le consigna al fondo." },
      {
        clave: "prestamosEmpleados",
        etiqueta: "Préstamos a empleados",
        ayuda: "El descuento ABONA esta cuenta por cobrar; no crea un pasivo nuevo.",
      },
      { clave: "otrasDeduccionesNomina", etiqueta: "Otras deducciones", ayuda: "Embargos, libranzas, fondo de empleados." },
      // El gasto de los aportes del EMPLEADOR y el de las PRESTACIONES va desagregado, una cuenta
      // por componente. Acumularlo todo en una sola cuenta obligaba a elegir el nombre de uno de
      // los componentes —quedaba, por ejemplo, la ARL y los parafiscales sumados bajo "Aportes a
      // EPS"— y así ni el estado de resultados ni un requerimiento de la UGPP se pueden leer.
      {
        clave: "gastoSaludPatronal",
        etiqueta: "Gasto de salud (empleador)",
        ayuda: "El 8,5% a cargo de la empresa. Es cero cuando aplica la exoneración del art. 114-1 E.T.",
      },
      {
        clave: "gastoPensionPatronal",
        etiqueta: "Gasto de pensión (empleador)",
        ayuda: "El 12% a cargo de la empresa. Nunca se exonera.",
      },
      {
        clave: "gastoArl",
        etiqueta: "Gasto de ARL",
        ayuda: "Del 0,522% al 6,96% según la clase de riesgo del cargo. Lo paga entero el empleador.",
      },
      {
        clave: "gastoParafiscales",
        etiqueta: "Gasto de parafiscales",
        ayuda: "SENA (2%), ICBF (3%) y caja de compensación (4%). La caja se paga siempre, incluso con exoneración.",
      },
      {
        clave: "gastoCesantias",
        etiqueta: "Gasto de cesantías",
        ayuda: "Un mes de salario por año. Se causa cada mes aunque se consigne en febrero (NIC 19 / Sección 28).",
      },
      {
        clave: "gastoInteresesCesantias",
        etiqueta: "Gasto de intereses sobre cesantías",
        ayuda: "12% anual sobre las cesantías. Se pagan al trabajador en enero.",
      },
      {
        clave: "gastoPrima",
        etiqueta: "Gasto de prima de servicios",
        ayuda: "Un mes de salario por año, pagadero en junio y diciembre.",
      },
      {
        clave: "gastoVacaciones",
        etiqueta: "Gasto de vacaciones",
        ayuda: "15 días hábiles por año. Su base excluye las horas extra (art. 192 num. 2 CST).",
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
    gastosGenerales: "519505",
    gastoNomina: "51050501",
    gastoAuxilioTransporte: "510515",
    salariosPorPagar: "25050501",
    // El catálogo NIIF cargado NO trae cuentas de salud y pensión por pagar (2370), ni de
    // cuentas por cobrar a trabajadores (1365). No se inventa un código: se deja en blanco y
    // la nómina queda pendiente por contabilizar hasta que el usuario elija sus auxiliares.
    saludPorPagar: "237005",
    pensionPorPagar: "237006",
    prestamosEmpleados: "136505",
    otrasDeduccionesNomina: "238095",
    gastoSaludPatronal: "510527",
    gastoPensionPatronal: "510528",
    gastoArl: "510529",
    gastoParafiscales: "510531",
    gastoCesantias: "510530",
    gastoInteresesCesantias: "510533",
    gastoPrima: "510536",
    gastoVacaciones: "510539",
    arlPorPagar: "237010",
    parafiscalesPorPagar: "237015",
    cesantiasPorPagar: "250510",
    interesesCesantiasPorPagar: "250515",
    primaPorPagar: "250520",
    vacacionesPorPagar: "250525",
    obligacionesFinancieras: null,
    aportesSociales: null,
    gmf: "530530",
    descuentoProntoPago: "530535",
    ajusteAlPeso: "519530",
  },
  esal: {
    clientes: "132005",
    // `proveedores` es CAMPO MÍNIMO y estaba en `null` teniendo la cuenta exacta en el catálogo:
    // sin él, una ESAL no podía contabilizar NI UNA compra ni un documento soporte. Era el hueco
    // más caro de los que quedaban.
    proveedores: "2205",
    anticipoClientes: null,
    // Contrapartida de la legalización de un egreso con documento soporte (ver
    // `lib/soporteDesdeComprobante.js`). Es la 1330 del comercial: la plata ya salió y el
    // soporte cancela el anticipo, no una cuenta por pagar.
    anticiposPorLegalizar: "133005",
    reteFuenteFavor: "133505",
    reteIvaFavor: "133515",
    reteIcaFavor: "133520",
    reteFuentePorPagar: "242095",
    reteIvaPorPagar: "2425",
    reteIcaPorPagar: "2430",
    // Las DOS al mismo código, y es correcto: el catálogo ESAL trae la 2410 agregada, sin
    // auxiliares de generado y descontable. Es el modelo clásico de la 2408 —el IVA por pagar
    // es la cuenta neta— y ninguno de los dos lados queda bajo el nombre de otra cuenta. Quien
    // quiera verlos separados abre dos auxiliares en su plan y los mapea aquí.
    ivaGenerado: "2410",
    ivaDescontable: "2410",
    incPorPagar: null,
    // Sin sugerir A PROPÓSITO: el catálogo ESAL separa el ingreso por PRESTACIÓN DE SERVICIOS
    // (4125) del de VENTA DE BIENES (4130), y cuál de los dos usa la entidad es su modelo de
    // negocio, no algo que el sistema pueda deducir de una factura. Queda pendiente y a la
    // vista, que es preferible a acertar la mitad de las veces.
    ingresosVentas: null,
    // Esta sí es inequívoca: la 4140 es la cuenta de devoluciones, de naturaleza débito dentro
    // de la clase 4 (no es un gasto).
    devolucionesVentas: "4140",
    comprasInventario: "1420",
    // 5195 "GASTOS DIVERSOS" de ADMINISTRACIÓN, que es el destino por defecto del gasto de un
    // documento soporte. Una ESAL que compre para un programa lo va a querer en la 5295, pero
    // eso el sistema no lo puede adivinar por documento: se deja el defecto administrativo,
    // que es el conservador, y el usuario lo cambia si su operación es al revés.
    gastosGenerales: "519595",
    // Nómina. El catálogo ESAL sí tiene las cuentas: dejarlas todas en `null` obligaba a una
    // fundación con empleados a configurar veinte cuentas a mano antes de poder liquidar.
    // Las que quedan en `null` es porque en el catálogo ESAL solo existen AGREGADAS (510540
    // "Aportes a seguridad social", 2335 "Aportes parafiscales" no imputable): sugerirlas sería
    // repetir el defecto que se acaba de corregir en el comercial —el gasto de ARL bajo el
    // nombre de otra cuenta—. Quedan visibles como pendientes para que las elija el usuario.
    gastoNomina: "510505",
    gastoAuxilioTransporte: "510515",
    salariosPorPagar: "2305",
    saludPorPagar: "233005",
    pensionPorPagar: "233010",
    // 134005 "Préstamos", no 133015 "Anticipos a empleados": son cosas distintas. Un anticipo
    // es nómina pagada por adelantado y se cruza contra el devengo del mes; un préstamo es una
    // cuenta por cobrar que se amortiza por descuento. Estaba apuntando al anticipo, y con eso
    // cada préstamo descontado en nómina abonaba una cuenta que nunca se había debitado.
    // El equivalente de la 136505 del comercial es esta.
    prestamosEmpleados: "134005",
    otrasDeduccionesNomina: "2340",
    gastoSaludPatronal: null,
    gastoPensionPatronal: null,
    gastoArl: null,
    gastoParafiscales: "510545",
    gastoCesantias: "510520",
    gastoInteresesCesantias: "510525",
    gastoPrima: "510530",
    gastoVacaciones: "510535",
    arlPorPagar: "233015",
    parafiscalesPorPagar: null,
    cesantiasPorPagar: "2310",
    interesesCesantiasPorPagar: "2315",
    primaPorPagar: "2320",
    vacacionesPorPagar: "2325",
    // En ESAL la 2105 es "Bancos nacionales" y es imputable, así que aquí sí hay dónde llevar
    // el pago de un crédito. (En el comercial la 2105 es "Obligaciones a corto plazo", de
    // agrupación: por eso allá sigue en `null`.)
    obligacionesFinancieras: "2105",
    // Sin sugerir: el patrimonio de una ESAL se reparte entre 3105 "Fondo social",
    // 3110 "Aportes de fundadores" y 3115 "Aportes de asociados", y cuál aplica lo dicen los
    // estatutos de la entidad. No es una cuenta que el software pueda elegir por ella.
    aportesSociales: null,
    // Las tres existían ya en el catálogo ESAL y estaban sin enchufar. 5420 es el GMF con ese
    // nombre exacto; 5495 "Otros gastos financieros" es donde cae el descuento por pronto pago
    // concedido, igual que la 530535 del comercial. El ajuste al peso sí hubo que agregarlo
    // (519530), dentro del grupo 5195 que ya era de agrupación: colgar un auxiliar de 5420 o
    // 5495 —que son imputables— habría obligado a volverlas de agrupación y a romperle el mapa
    // a quien ya las usara.
    gmf: "5420",
    descuentoProntoPago: "5495",
    ajusteAlPeso: "519530",
  },
};

/**
 * Clase de PUC que le corresponde a cada campo del mapa.
 *
 * POR QUÉ EXISTE ESTO. El mapa validaba que la cuenta EXISTIERA y fuera IMPUTABLE, y nada más.
 * Con eso se podía mapear "Gastos generales" a una cuenta de INGRESOS (clase 4) sin que nada
 * chistara: cada documento soporte debitaba una cuenta de ingresos, y el estado de resultados
 * salía mal por los dos lados sin un solo error en pantalla. Un dígito equivocado al elegir del
 * catálogo bastaba.
 *
 * Se valida solo el PRIMER dígito, que es la clase. Dentro de la clase el usuario elige el
 * auxiliar que quiera: ahí sí manda su plan de cuentas, no el software.
 *
 * Las clases: 1 activo · 2 pasivo · 3 patrimonio · 4 ingresos · 5 gastos · 6 costos de ventas ·
 * 7 costos de producción.
 */
export const CLASES_ESPERADAS = {
  // Activos
  clientes: ["1"],
  anticiposPorLegalizar: ["1"],
  reteFuenteFavor: ["1"],
  reteIvaFavor: ["1"],
  reteIcaFavor: ["1"],
  ivaDescontable: ["1", "2"], // según el plan, el IVA descontable vive en 2408 o en 1355
  prestamosEmpleados: ["1"],
  comprasInventario: ["1", "6", "7"], // inventario, costo de ventas o costo de producción

  // Pasivos
  proveedores: ["2"],
  anticipoClientes: ["2"],
  reteFuentePorPagar: ["2"],
  reteIvaPorPagar: ["2"],
  reteIcaPorPagar: ["2"],
  ivaGenerado: ["2"],
  incPorPagar: ["2"],
  salariosPorPagar: ["2"],
  saludPorPagar: ["2"],
  pensionPorPagar: ["2"],
  otrasDeduccionesNomina: ["2"],
  arlPorPagar: ["2"],
  parafiscalesPorPagar: ["2"],
  cesantiasPorPagar: ["2"],
  interesesCesantiasPorPagar: ["2"],
  primaPorPagar: ["2"],
  vacacionesPorPagar: ["2"],
  obligacionesFinancieras: ["2"],

  // Patrimonio
  aportesSociales: ["3"],

  // Ingresos
  ingresosVentas: ["4"],

  // Devoluciones en ventas: es una cuenta de la clase 4 con naturaleza débito (4175). No es un
  // gasto, y por eso no se admite la 5.
  devolucionesVentas: ["4"],

  // Gastos
  gastosGenerales: ["5"],
  gastoNomina: ["5", "7"], // la nómina de producción va a la 7
  gastoAuxilioTransporte: ["5", "7"],
  gastoSaludPatronal: ["5", "7"],
  gastoPensionPatronal: ["5", "7"],
  gastoArl: ["5", "7"],
  gastoParafiscales: ["5", "7"],
  gastoCesantias: ["5", "7"],
  gastoInteresesCesantias: ["5", "7"],
  gastoPrima: ["5", "7"],
  gastoVacaciones: ["5", "7"],
  gmf: ["5"],

  // El descuento por pronto pago concedido es gasto financiero; el recibido, ingreso. Se admiten
  // las dos porque depende de qué lado lo use la empresa.
  descuentoProntoPago: ["4", "5"],

  // El ajuste al peso puede llevarse a ingresos o a gastos según el signo de la diferencia.
  ajusteAlPeso: ["4", "5"],
};

/** Nombre legible de la clase, para poder decir en el error qué se esperaba. */
export const NOMBRE_CLASE = {
  1: "activo",
  2: "pasivo",
  3: "patrimonio",
  4: "ingresos",
  5: "gastos",
  6: "costos de ventas",
  7: "costos de producción",
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
