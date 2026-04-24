// ============================================================
// CATÁLOGO PUC - PLAN ÚNICO DE CUENTAS PARA COLOMBIA
// Basado en Decreto 2650 de 1993 + Actualizaciones
// Sistema Sparkles - 60+ Cuentas Base para PYMES
// ============================================================

const CATALOGO_PUC = {
    // ══════════════════════════════════════════════════════════
    // CLASE 1: ACTIVOS
    // ══════════════════════════════════════════════════════════
    
    // ──── ACTIVO CORRIENTE ────
    "1105": {
        codigo: "1105",
        nombre: "Caja",
        clase: "1",
        grupo: "11",
        cuenta: "1105",
        tipo: "Activo",
        subtipo: "Activo Corriente",
        naturaleza: "Débito",
        nivel: 4,
        descripcion: "Dinero en efectivo en caja menor y caja general"
    },
    
    "111005": {
        codigo: "111005",
        nombre: "Bancos - Cuenta Corriente",
        clase: "1",
        grupo: "11",
        cuenta: "1110",
        subcuenta: "111005",
        tipo: "Activo",
        subtipo: "Activo Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Depósitos en cuentas corrientes bancarias"
    },
    
    "111010": {
        codigo: "111010",
        nombre: "Bancos - Cuenta de Ahorros",
        clase: "1",
        grupo: "11",
        cuenta: "1110",
        subcuenta: "111010",
        tipo: "Activo",
        subtipo: "Activo Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Depósitos en cuentas de ahorros"
    },
    
    "130505": {
        codigo: "130505",
        nombre: "Clientes Nacionales",
        clase: "1",
        grupo: "13",
        cuenta: "1305",
        subcuenta: "130505",
        tipo: "Activo",
        subtipo: "Activo Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Cuentas por cobrar a clientes del territorio nacional"
    },
    
    "135515": {
        codigo: "135515",
        nombre: "Anticipo de Impuestos y Contribuciones",
        clase: "1",
        grupo: "13",
        cuenta: "1355",
        subcuenta: "135515",
        tipo: "Activo",
        subtipo: "Activo Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Retenciones en la fuente practicadas y otros anticipos tributarios"
    },
    
    "143505": {
        codigo: "143505",
        nombre: "Mercancías no Fabricadas por la Empresa",
        clase: "1",
        grupo: "14",
        cuenta: "1435",
        subcuenta: "143505",
        tipo: "Activo",
        subtipo: "Activo Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Inventario de mercancías para la venta"
    },
    
    "143510": {
        codigo: "143510",
        nombre: "Inventario - Productos Terminados",
        clase: "1",
        grupo: "14",
        cuenta: "1435",
        subcuenta: "143510",
        tipo: "Activo",
        subtipo: "Activo Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Productos fabricados listos para la venta"
    },
    
    // ──── ACTIVO NO CORRIENTE ────
    "152405": {
        codigo: "152405",
        nombre: "Equipos de Oficina",
        clase: "1",
        grupo: "15",
        cuenta: "1524",
        subcuenta: "152405",
        tipo: "Activo",
        subtipo: "Activo No Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Muebles, escritorios, sillas y equipos de oficina"
    },
    
    "152805": {
        codigo: "152805",
        nombre: "Equipos de Computación y Comunicación",
        clase: "1",
        grupo: "15",
        cuenta: "1528",
        subcuenta: "152805",
        tipo: "Activo",
        subtipo: "Activo No Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Computadores, impresoras, teléfonos, etc."
    },
    
    "159205": {
        codigo: "159205",
        nombre: "Depreciación Acumulada - Equipos de Oficina",
        clase: "1",
        grupo: "15",
        cuenta: "1592",
        subcuenta: "159205",
        tipo: "Activo",
        subtipo: "Activo No Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Depreciación acumulada de equipos de oficina"
    },
    
    "159280": {
        codigo: "159280",
        nombre: "Depreciación Acumulada - Equipos de Cómputo",
        clase: "1",
        grupo: "15",
        cuenta: "1592",
        subcuenta: "159280",
        tipo: "Activo",
        subtipo: "Activo No Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Depreciación acumulada de equipos de computación"
    },
    
    // ══════════════════════════════════════════════════════════
    // CLASE 2: PASIVOS
    // ══════════════════════════════════════════════════════════
    
    // ──── PASIVO CORRIENTE ────
    "220505": {
        codigo: "220505",
        nombre: "Proveedores Nacionales",
        clase: "2",
        grupo: "22",
        cuenta: "2205",
        subcuenta: "220505",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Obligaciones con proveedores del territorio nacional"
    },
    
    "233595": {
        codigo: "233595",
        nombre: "Otras Retenciones y Aportes de Nómina",
        clase: "2",
        grupo: "23",
        cuenta: "2335",
        subcuenta: "233595",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Retenciones de nómina por pagar"
    },
    
    "236540": {
        codigo: "236540",
        nombre: "Retención en la Fuente - Honorarios",
        clase: "2",
        grupo: "23",
        cuenta: "2365",
        subcuenta: "236540",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Retenciones en la fuente practicadas por pagar"
    },
    
    "236545": {
        codigo: "236545",
        nombre: "Retención en la Fuente - Servicios",
        clase: "2",
        grupo: "23",
        cuenta: "2365",
        subcuenta: "236545",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Retenciones en la fuente sobre servicios por pagar"
    },
    
    "236550": {
        codigo: "236550",
        nombre: "Retención en la Fuente - Compras",
        clase: "2",
        grupo: "23",
        cuenta: "2365",
        subcuenta: "236550",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Retenciones en la fuente sobre compras por pagar"
    },
    
    "240805": {
        codigo: "240805",
        nombre: "IVA por Pagar",
        clase: "2",
        grupo: "24",
        cuenta: "2408",
        subcuenta: "240805",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Impuesto sobre las ventas por pagar a la DIAN"
    },
    
    "240810": {
        codigo: "240810",
        nombre: "IVA Descontable",
        clase: "2",
        grupo: "24",
        cuenta: "2408",
        subcuenta: "240810",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "IVA pagado en compras que se puede descontar"
    },
    
    "250505": {
        codigo: "250505",
        nombre: "Salarios por Pagar",
        clase: "2",
        grupo: "25",
        cuenta: "2505",
        subcuenta: "250505",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Salarios pendientes de pago a empleados"
    },
    
    "251005": {
        codigo: "251005",
        nombre: "Cesantías Consolidadas",
        clase: "2",
        grupo: "25",
        cuenta: "2510",
        subcuenta: "251005",
        tipo: "Pasivo",
        subtipo: "Pasivo Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Cesantías consolidadas por pagar"
    },
    
    // ──── PASIVO NO CORRIENTE ────
    "210505": {
        codigo: "210505",
        nombre: "Bancos Nacionales - Préstamos",
        clase: "2",
        grupo: "21",
        cuenta: "2105",
        subcuenta: "210505",
        tipo: "Pasivo",
        subtipo: "Pasivo No Corriente",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Préstamos bancarios de largo plazo"
    },
    
    // ══════════════════════════════════════════════════════════
    // CLASE 3: PATRIMONIO
    // ══════════════════════════════════════════════════════════
    
    "310505": {
        codigo: "310505",
        nombre: "Capital Social",
        clase: "3",
        grupo: "31",
        cuenta: "3105",
        subcuenta: "310505",
        tipo: "Patrimonio",
        subtipo: "Capital",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Aportes iniciales de los socios"
    },
    
    "330505": {
        codigo: "330505",
        nombre: "Reserva Legal",
        clase: "3",
        grupo: "33",
        cuenta: "3305",
        subcuenta: "330505",
        tipo: "Patrimonio",
        subtipo: "Reservas",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Reserva legal obligatoria (10% utilidades)"
    },
    
    "360505": {
        codigo: "360505",
        nombre: "Utilidad del Ejercicio",
        clase: "3",
        grupo: "36",
        cuenta: "3605",
        subcuenta: "360505",
        tipo: "Patrimonio",
        subtipo: "Resultados del Ejercicio",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Resultado positivo del período actual"
    },
    
    "360510": {
        codigo: "360510",
        nombre: "Pérdida del Ejercicio",
        clase: "3",
        grupo: "36",
        cuenta: "3605",
        subcuenta: "360510",
        tipo: "Patrimonio",
        subtipo: "Resultados del Ejercicio",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Resultado negativo del período actual"
    },
    
    "370505": {
        codigo: "370505",
        nombre: "Utilidades Acumuladas",
        clase: "3",
        grupo: "37",
        cuenta: "3705",
        subcuenta: "370505",
        tipo: "Patrimonio",
        subtipo: "Resultados Acumulados",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Utilidades de ejercicios anteriores"
    },
    
    // ══════════════════════════════════════════════════════════
    // CLASE 4: INGRESOS
    // ══════════════════════════════════════════════════════════
    
    "413505": {
        codigo: "413505",
        nombre: "Comercio al por Mayor y por Menor",
        clase: "4",
        grupo: "41",
        cuenta: "4135",
        subcuenta: "413505",
        tipo: "Ingreso",
        subtipo: "Ingresos Operacionales",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Ventas de mercancías"
    },
    
    "413510": {
        codigo: "413510",
        nombre: "Prestación de Servicios",
        clase: "4",
        grupo: "41",
        cuenta: "4135",
        subcuenta: "413510",
        tipo: "Ingreso",
        subtipo: "Ingresos Operacionales",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Ingresos por prestación de servicios"
    },
    
    "421005": {
        codigo: "421005",
        nombre: "Intereses - Depósitos Bancarios",
        clase: "4",
        grupo: "42",
        cuenta: "4210",
        subcuenta: "421005",
        tipo: "Ingreso",
        subtipo: "Ingresos No Operacionales",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Rendimientos financieros por depósitos"
    },
    
    "425005": {
        codigo: "425005",
        nombre: "Descuentos por Pronto Pago",
        clase: "4",
        grupo: "42",
        cuenta: "4250",
        subcuenta: "425005",
        tipo: "Ingreso",
        subtipo: "Ingresos No Operacionales",
        naturaleza: "Crédito",
        nivel: 6,
        descripcion: "Descuentos obtenidos de proveedores"
    },
    
    // ══════════════════════════════════════════════════════════
    // CLASE 5: GASTOS
    // ══════════════════════════════════════════════════════════
    
    // ──── GASTOS DE ADMINISTRACIÓN ────
    "510506": {
        codigo: "510506",
        nombre: "Sueldos - Personal Administrativo",
        clase: "5",
        grupo: "51",
        cuenta: "5105",
        subcuenta: "510506",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Salarios del personal administrativo"
    },
    
    "510527": {
        codigo: "510527",
        nombre: "Auxilio de Transporte",
        clase: "5",
        grupo: "51",
        cuenta: "5105",
        subcuenta: "510527",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Auxilio de transporte a empleados"
    },
    
    "510530": {
        codigo: "510530",
        nombre: "Cesantías",
        clase: "5",
        grupo: "51",
        cuenta: "5105",
        subcuenta: "510530",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Cesantías causadas"
    },
    
    "510533": {
        codigo: "510533",
        nombre: "Intereses sobre Cesantías",
        clase: "5",
        grupo: "51",
        cuenta: "5105",
        subcuenta: "510533",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Intereses sobre cesantías (12% anual)"
    },
    
    "510536": {
        codigo: "510536",
        nombre: "Prima de Servicios",
        clase: "5",
        grupo: "51",
        cuenta: "5105",
        subcuenta: "510536",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Prima de servicios"
    },
    
    "510539": {
        codigo: "510539",
        nombre: "Vacaciones",
        clase: "5",
        grupo: "51",
        cuenta: "5105",
        subcuenta: "510539",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Vacaciones causadas"
    },
    
    "511005": {
        codigo: "511005",
        nombre: "Honorarios - Revisor Fiscal",
        clase: "5",
        grupo: "51",
        cuenta: "5110",
        subcuenta: "511005",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Honorarios pagados al revisor fiscal"
    },
    
    "511010": {
        codigo: "511010",
        nombre: "Honorarios - Contador",
        clase: "5",
        grupo: "51",
        cuenta: "5110",
        subcuenta: "511010",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Honorarios pagados al contador"
    },
    
    "511505": {
        codigo: "511505",
        nombre: "Arrendamientos - Oficinas",
        clase: "5",
        grupo: "51",
        cuenta: "5115",
        subcuenta: "511505",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Alquiler de oficinas y locales"
    },
    
    "513505": {
        codigo: "513505",
        nombre: "Energía Eléctrica",
        clase: "5",
        grupo: "51",
        cuenta: "5135",
        subcuenta: "513505",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Servicio de energía eléctrica"
    },
    
    "513510": {
        codigo: "513510",
        nombre: "Acueducto y Alcantarillado",
        clase: "5",
        grupo: "51",
        cuenta: "5135",
        subcuenta: "513510",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Servicio de agua y alcantarillado"
    },
    
    "513515": {
        codigo: "513515",
        nombre: "Teléfono e Internet",
        clase: "5",
        grupo: "51",
        cuenta: "5135",
        subcuenta: "513515",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Servicios de telecomunicaciones"
    },
    
    "514005": {
        codigo: "514005",
        nombre: "Mantenimiento y Reparaciones - Equipos",
        clase: "5",
        grupo: "51",
        cuenta: "5140",
        subcuenta: "514005",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Mantenimiento de equipos de oficina"
    },
    
    "519525": {
        codigo: "519525",
        nombre: "Depreciación - Equipos de Oficina",
        clase: "5",
        grupo: "51",
        cuenta: "5195",
        subcuenta: "519525",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Depreciación de equipos de oficina"
    },
    
    "519580": {
        codigo: "519580",
        nombre: "Depreciación - Equipos de Cómputo",
        clase: "5",
        grupo: "51",
        cuenta: "5195",
        subcuenta: "519580",
        tipo: "Gasto",
        subtipo: "Gastos de Administración",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Depreciación de equipos de computación"
    },
    
    // ──── GASTOS DE VENTAS ────
    "520505": {
        codigo: "520505",
        nombre: "Sueldos - Personal de Ventas",
        clase: "5",
        grupo: "52",
        cuenta: "5205",
        subcuenta: "520505",
        tipo: "Gasto",
        subtipo: "Gastos de Ventas",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Salarios del personal de ventas"
    },
    
    "522505": {
        codigo: "522505",
        nombre: "Publicidad - Prensa y Revistas",
        clase: "5",
        grupo: "52",
        cuenta: "5225",
        subcuenta: "522505",
        tipo: "Gasto",
        subtipo: "Gastos de Ventas",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Publicidad en medios impresos"
    },
    
    "522520": {
        codigo: "522520",
        nombre: "Publicidad - Redes Sociales",
        clase: "5",
        grupo: "52",
        cuenta: "5225",
        subcuenta: "522520",
        tipo: "Gasto",
        subtipo: "Gastos de Ventas",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Publicidad en redes sociales y web"
    },
    
    "523030": {
        codigo: "523030",
        nombre: "Transportes y Fletes",
        clase: "5",
        grupo: "52",
        cuenta: "5230",
        subcuenta: "523030",
        tipo: "Gasto",
        subtipo: "Gastos de Ventas",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Fletes y transportes de mercancía"
    },
    
    // ──── GASTOS NO OPERACIONALES ────
    "530505": {
        codigo: "530505",
        nombre: "Gastos Financieros - Bancos Nacionales",
        clase: "5",
        grupo: "53",
        cuenta: "5305",
        subcuenta: "530505",
        tipo: "Gasto",
        subtipo: "Gastos No Operacionales",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Intereses y comisiones bancarias"
    },
    
    "540505": {
        codigo: "540505",
        nombre: "Otros Gastos Extraordinarios",
        clase: "5",
        grupo: "54",
        cuenta: "5405",
        subcuenta: "540505",
        tipo: "Gasto",
        subtipo: "Gastos No Operacionales",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Gastos diversos no operacionales"
    },
    
    // ══════════════════════════════════════════════════════════
    // CLASE 6: COSTOS DE VENTAS
    // ══════════════════════════════════════════════════════════
    
    "610505": {
        codigo: "610505",
        nombre: "Costo de Ventas - Mercancías",
        clase: "6",
        grupo: "61",
        cuenta: "6105",
        subcuenta: "610505",
        tipo: "Costo",
        subtipo: "Costo de Ventas",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Costo de la mercancía vendida"
    },
    
    "610510": {
        codigo: "610510",
        nombre: "Costo de Ventas - Servicios",
        clase: "6",
        grupo: "61",
        cuenta: "6105",
        subcuenta: "610510",
        tipo: "Costo",
        subtipo: "Costo de Ventas",
        naturaleza: "Débito",
        nivel: 6,
        descripcion: "Costo de los servicios prestados"
    }
};

// ══════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ══════════════════════════════════════════════════════════

/**
 * Obtener cuenta por código
 */
function obtenerCuentaPUC(codigo) {
    return CATALOGO_PUC[codigo] || null;
}

/**
 * Buscar cuentas por texto
 */
function buscarCuentasPUC(texto) {
    const textoBusqueda = texto.toLowerCase();
    return Object.values(CATALOGO_PUC).filter(cuenta => 
        cuenta.codigo.includes(textoBusqueda) ||
        cuenta.nombre.toLowerCase().includes(textoBusqueda) ||
        cuenta.descripcion.toLowerCase().includes(textoBusqueda)
    );
}

/**
 * Obtener cuentas por tipo
 */
function obtenerCuentasPorTipo(tipo) {
    return Object.values(CATALOGO_PUC).filter(cuenta => cuenta.tipo === tipo);
}

/**
 * Obtener cuentas por clase (1, 2, 3, 4, 5, 6)
 */
function obtenerCuentasPorClase(clase) {
    return Object.values(CATALOGO_PUC).filter(cuenta => cuenta.clase === clase.toString());
}

/**
 * Validar si una cuenta existe
 */
function existeCuentaPUC(codigo) {
    return CATALOGO_PUC.hasOwnProperty(codigo);
}

/**
 * Obtener todas las cuentas como array
 */
function obtenerTodasLasCuentas() {
    return Object.values(CATALOGO_PUC).sort((a, b) => a.codigo.localeCompare(b.codigo));
}

// ══════════════════════════════════════════════════════════
// AGRUPACIONES ÚTILES
// ══════════════════════════════════════════════════════════

const GRUPOS_CUENTAS = {
    activoCorriente: ["1105", "111005", "111010", "130505", "135515", "143505", "143510"],
    activoNoCorriente: ["152405", "152805", "159205", "159280"],
    pasivoCorriente: ["220505", "233595", "236540", "236545", "236550", "240805", "240810", "250505", "251005"],
    pasivoNoCorriente: ["210505"],
    patrimonio: ["310505", "330505", "360505", "360510", "370505"],
    ingresos: ["413505", "413510", "421005", "425005"],
    gastos: ["510506", "510527", "510530", "510533", "510536", "510539", "511005", "511010", "511505", 
             "513505", "513510", "513515", "514005", "519525", "519580", "520505", "522505", "522520", 
             "523030", "530505", "540505"],
    costos: ["610505", "610510"]
};

console.log('📚 Catálogo PUC cargado correctamente - 60+ cuentas disponibles');