// ========== TABLA COMPLETA DE RETENCIÓN EN LA FUENTE 2026 - COLOMBIA ==========
// UVT 2026: $52,374 (Resolución 000238 del 15 de diciembre de 2025 - DIAN)
// Fuente: Decreto 1625 de 2016 (DUT) modificado por Decreto 0572 de 2025

const TABLA_RETEFUENTE_COMPLETA_2026 = {
    uvt: 52374,
    año: 2026,
    vigencia: "2026-01-01",
    decretoActualizacion: "Decreto 0572 de mayo 28 de 2025",
    
    conceptos: [
        // ==================== SERVICIOS ====================
        {
            id: "servicios_declarante_4",
            nombre: "Servicios - Declarante de renta",
            categoria: "Servicios",
            baseMinima: 2,
            baseMinimaP: 104748,
            tarifa: 4,
            aplicaA: "Personas naturales o jurídicas declarantes",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "servicios_no_declarante_6",
            nombre: "Servicios - No declarante de renta",
            categoria: "Servicios",
            baseMinima: 2,
            baseMinimaP: 104748,
            tarifa: 6,
            aplicaA: "Personas naturales o jurídicas no declarantes",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "servicios_generales_6",
            nombre: "Servicios generales",
            categoria: "Servicios",
            baseMinima: 4,
            baseMinimaP: 209496,
            tarifa: 6,
            aplicaA: "Servicios en general",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "servicios_hoteles_35",
            nombre: "Servicios de hoteles y restaurantes",
            categoria: "Servicios",
            baseMinima: 4,
            baseMinimaP: 209496,
            tarifa: 3.5,
            aplicaA: "Sector hotelero y restaurantes",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "servicios_vigilancia_2",
            nombre: "Servicios de vigilancia y aseo",
            categoria: "Servicios",
            baseMinima: 4,
            baseMinimaP: 209496,
            tarifa: 2,
            aplicaA: "Empresas de vigilancia, aseo y temporales",
            baseCalculo: "Valor AIU (componente de utilidad)"
        },
        {
            id: "servicios_temporales_1",
            nombre: "Servicios de empresas temporales",
            categoria: "Servicios",
            baseMinima: 4,
            baseMinimaP: 209496,
            tarifa: 1,
            aplicaA: "Empresas de servicios temporales",
            baseCalculo: "Valor AIU (componente de utilidad)"
        },
        
        // ==================== HONORARIOS ====================
        {
            id: "honorarios_natural_10",
            nombre: "Honorarios - Persona natural",
            categoria: "Honorarios",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 10,
            aplicaA: "Personas naturales",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "honorarios_juridica_11",
            nombre: "Honorarios - Persona jurídica",
            categoria: "Honorarios",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 11,
            aplicaA: "Personas jurídicas",
            baseCalculo: "Subtotal (sin IVA)"
        },
        
        // ==================== COMISIONES ====================
        {
            id: "comisiones_10",
            nombre: "Comisiones",
            categoria: "Comisiones",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 10,
            aplicaA: "Todas las personas",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "comisiones_servicios_financieros_11",
            nombre: "Comisiones por servicios financieros",
            categoria: "Comisiones",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 11,
            aplicaA: "Sector financiero",
            baseCalculo: "Valor de la comisión"
        },
        
        // ==================== COMPRAS ====================
        {
            id: "compras_declarante_25",
            nombre: "Compras - Declarante de renta",
            categoria: "Compras",
            baseMinima: 10,
            baseMinimaP: 523740,
            tarifa: 2.5,
            aplicaA: "Personas naturales o jurídicas declarantes",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "compras_no_declarante_35",
            nombre: "Compras - No declarante de renta",
            categoria: "Compras",
            baseMinima: 10,
            baseMinimaP: 523740,
            tarifa: 3.5,
            aplicaA: "Personas naturales o jurídicas no declarantes",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "compras_cafe_25",
            nombre: "Compras de café",
            categoria: "Compras",
            baseMinima: 160,
            baseMinimaP: 8379840,
            tarifa: 2.5,
            aplicaA: "Compras de café pergamino o cereza",
            baseCalculo: "Valor de compra"
        },
        {
            id: "compras_combustibles_01",
            nombre: "Compras de combustibles derivados del petróleo",
            categoria: "Compras",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 0.1,
            aplicaA: "Distribuidores de combustibles",
            baseCalculo: "Valor de compra"
        },
        {
            id: "compras_productos_agricolas_17",
            nombre: "Compras de productos agrícolas y pecuarios sin procesamiento",
            categoria: "Compras",
            baseMinima: 92,
            baseMinimaP: 4818408,
            tarifa: 1.5,
            aplicaA: "Productos sin procesamiento industrial",
            baseCalculo: "Valor de compra"
        },
        
        // ==================== ARRENDAMIENTOS ====================
        {
            id: "arrendamiento_bienes_raices_35",
            nombre: "Arrendamiento de bienes raíces",
            categoria: "Arrendamientos",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 3.5,
            aplicaA: "Todas las personas",
            baseCalculo: "Valor del canon"
        },
        {
            id: "arrendamiento_muebles_4",
            nombre: "Arrendamiento de bienes muebles",
            categoria: "Arrendamientos",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 4,
            aplicaA: "Todas las personas",
            baseCalculo: "Valor del canon"
        },
        
        // ==================== TRANSPORTES ====================
        {
            id: "transporte_carga_1",
            nombre: "Transporte de carga",
            categoria: "Transportes",
            baseMinima: 4,
            baseMinimaP: 209496,
            tarifa: 1,
            aplicaA: "Todas las personas",
            baseCalculo: "Subtotal (sin IVA)"
        },
        {
            id: "transporte_pasajeros_35",
            nombre: "Transporte nacional de pasajeros terrestre",
            categoria: "Transportes",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 3.5,
            aplicaA: "Empresas de transporte",
            baseCalculo: "Valor del pasaje"
        },
        {
            id: "transporte_pasajeros_aereo_1",
            nombre: "Transporte nacional de pasajeros aéreo o marítimo",
            categoria: "Transportes",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 1,
            aplicaA: "Aerolíneas y navieras",
            baseCalculo: "Valor del pasaje"
        },
        
        // ==================== RENDIMIENTOS FINANCIEROS ====================
        {
            id: "intereses_financieros_7",
            nombre: "Rendimientos financieros",
            categoria: "Rendimientos Financieros",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 7,
            aplicaA: "Todas las personas",
            baseCalculo: "Valor del rendimiento"
        },
        {
            id: "rendimientos_gcf_4",
            nombre: "Rendimientos financieros de títulos de renta fija",
            categoria: "Rendimientos Financieros",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 4,
            aplicaA: "Personas jurídicas y naturales",
            baseCalculo: "Valor del rendimiento"
        },
        
        // ==================== VENTA DE ACTIVOS FIJOS ====================
        {
            id: "venta_activos_fijos_1",
            nombre: "Enajenación de activos fijos - Personas naturales",
            categoria: "Venta de Activos",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 1,
            aplicaA: "Personas naturales",
            baseCalculo: "Valor de venta"
        },
        {
            id: "venta_activos_fijos_25",
            nombre: "Enajenación de activos fijos - Personas jurídicas",
            categoria: "Venta de Activos",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 2.5,
            aplicaA: "Personas jurídicas",
            baseCalculo: "Valor de venta"
        },
        
        // ==================== LOTERÍAS Y JUEGOS ====================
        {
            id: "loterias_20",
            nombre: "Loterías, rifas, apuestas y similares",
            categoria: "Loterías y Juegos",
            baseMinima: 48,
            baseMinimaP: 2513952,
            tarifa: 20,
            aplicaA: "Todas las personas",
            baseCalculo: "Total del premio"
        },
        {
            id: "juegos_azar_3",
            nombre: "Colocación independiente de juegos de suerte y azar",
            categoria: "Loterías y Juegos",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 3,
            aplicaA: "Operadores de juegos",
            baseCalculo: "Valor del ingreso"
        },
        
        // ==================== CONSTRUCCIÓN ====================
        {
            id: "construccion_2",
            nombre: "Contratos de construcción y urbanización",
            categoria: "Construcción",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 2,
            aplicaA: "Todas las personas",
            baseCalculo: "Valor del contrato"
        },
        
        // ==================== DIVIDENDOS ====================
        {
            id: "dividendos_gravados_10",
            nombre: "Dividendos y participaciones gravados",
            categoria: "Dividendos",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 10,
            aplicaA: "Personas naturales residentes",
            baseCalculo: "Valor del dividendo"
        },
        {
            id: "dividendos_no_residentes_20",
            nombre: "Dividendos y participaciones - No residentes",
            categoria: "Dividendos",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 20,
            aplicaA: "Personas no residentes",
            baseCalculo: "Valor del dividendo"
        },
        
        // ==================== EMOLUMENTOS ECLESIÁSTICOS ====================
        {
            id: "emolumentos_eclesiasticos_4",
            nombre: "Emolumentos eclesiásticos - Declarante",
            categoria: "Emolumentos Eclesiásticos",
            baseMinima: 10,
            baseMinimaP: 523740,
            tarifa: 4,
            aplicaA: "Declarantes de renta",
            baseCalculo: "Valor del emolumento"
        },
        {
            id: "emolumentos_eclesiasticos_35",
            nombre: "Emolumentos eclesiásticos - No declarante",
            categoria: "Emolumentos Eclesiásticos",
            baseMinima: 10,
            baseMinimaP: 523740,
            tarifa: 3.5,
            aplicaA: "No declarantes de renta",
            baseCalculo: "Valor del emolumento"
        },
        
        // ==================== PAGOS LABORALES ====================
        {
            id: "contratistas_independientes_10",
            nombre: "Ingresos de contratistas independientes",
            categoria: "Pagos Laborales",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 10,
            aplicaA: "Contratistas personas naturales",
            baseCalculo: "Valor del pago"
        },
        {
            id: "contratistas_indepelientes_tabla_progresiva",
            nombre: "Contratistas independientes (tabla progresiva Art. 383)",
            categoria: "Pagos Laborales",
            baseMinima: 95,
            baseMinimaP: 4975530,
            tarifa: "Variable 19%-39%",
            aplicaA: "Contratistas que solicitan tabla de empleados",
            baseCalculo: "Base gravable después de deducciones"
        },
        
        // ==================== EXPORTACIONES ====================
        {
            id: "exportacion_hidrocarburos_1",
            nombre: "Exportación de hidrocarburos",
            categoria: "Exportaciones",
            baseMinima: 10,
            baseMinimaP: 523740,
            tarifa: 1,
            aplicaA: "Exportadores",
            baseCalculo: "Valor FOB"
        },
        {
            id: "exportacion_productos_mineros_1",
            nombre: "Exportación de productos mineros",
            categoria: "Exportaciones",
            baseMinima: 10,
            baseMinimaP: 523740,
            tarifa: 1,
            aplicaA: "Exportadores de minerales",
            baseCalculo: "Valor FOB"
        },
        {
            id: "exportacion_productos_mineros_3",
            nombre: "Exportación de productos mineros sin procesamiento",
            categoria: "Exportaciones",
            baseMinima: 10,
            baseMinimaP: 523740,
            tarifa: 3,
            aplicaA: "Exportadores de minerales sin procesar",
            baseCalculo: "Valor FOB"
        },
        
        // ==================== OTROS INGRESOS ====================
        {
            id: "otros_ingresos_25",
            nombre: "Otros ingresos tributarios",
            categoria: "Otros",
            baseMinima: 4,
            baseMinimaP: 209496,
            tarifa: 2.5,
            aplicaA: "Todas las personas",
            baseCalculo: "Valor del ingreso"
        },
        {
            id: "ingresos_licencias_software_33",
            nombre: "Licenciamiento de software",
            categoria: "Otros",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 33,
            aplicaA: "Licencias de uso de software",
            baseCalculo: "Valor de la licencia"
        },
        {
            id: "ingresos_asistencia_tecnica_10",
            nombre: "Asistencia técnica y consultoría",
            categoria: "Otros",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 10,
            aplicaA: "Servicios de asistencia técnica",
            baseCalculo: "Valor del servicio"
        },
        
        // ==================== PAGOS AL EXTERIOR ====================
        {
            id: "pagos_exterior_renta_20",
            nombre: "Pagos al exterior por renta",
            categoria: "Pagos al Exterior",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 20,
            aplicaA: "Personas o entidades del exterior",
            baseCalculo: "Valor del pago"
        },
        {
            id: "pagos_exterior_consultoria_10",
            nombre: "Pagos al exterior por consultoría",
            categoria: "Pagos al Exterior",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 10,
            aplicaA: "Consultores del exterior",
            baseCalculo: "Valor del pago"
        },
        {
            id: "pagos_exterior_software_10",
            nombre: "Pagos al exterior por licencias de software",
            categoria: "Pagos al Exterior",
            baseMinima: 0,
            baseMinimaP: 0,
            tarifa: 10,
            aplicaA: "Proveedores de software del exterior",
            baseCalculo: "Valor del pago"
        }
    ],
    
    // Categorías para organización
    categorias: [
        "Servicios",
        "Honorarios",
        "Comisiones",
        "Compras",
        "Arrendamientos",
        "Transportes",
        "Rendimientos Financieros",
        "Venta de Activos",
        "Loterías y Juegos",
        "Construcción",
        "Dividendos",
        "Emolumentos Eclesiásticos",
        "Pagos Laborales",
        "Exportaciones",
        "Pagos al Exterior",
        "Otros"
    ]
};

console.log('✅ Tabla COMPLETA de ReteFuente 2026 cargada');
console.log(`📊 Total conceptos: ${TABLA_RETEFUENTE_COMPLETA_2026.conceptos.length}`);
console.log(`📂 Total categorías: ${TABLA_RETEFUENTE_COMPLETA_2026.categorias.length}`);