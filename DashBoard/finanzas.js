// ========== MÓDULO DE FINANZAS - SPARKLES ==========

// 1. EVENTO PRINCIPAL: Solo llamamos a actualizar Finanzas, nada de tablas de soportes aquí.
document.addEventListener('DOMContentLoaded', function() {
    actualizarHubFinanzas();
});

// 2. FUNCIÓN PARA CAMBIAR PESTAÑAS (Tesorería / Impuestos)
function cambiarTabFinanzas(btnElemento, tabId) {
    document.querySelectorAll('.ftab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (btnElemento) btnElemento.classList.add('active');
    
    const contenidoSeleccionado = document.getElementById('tab-' + tabId);
    if (contenidoSeleccionado) {
        contenidoSeleccionado.classList.add('active');
    }
}

// 3. MOTOR PRINCIPAL DE FINANZAS
function actualizarHubFinanzas() {
    // --- A. BUSCADOR DE USUARIO A PRUEBA DE FALLOS ---
    let emailUsuario = "usuario_general";
    try {
        let data = sessionStorage.getItem('usuarioActual') || localStorage.getItem('usuarioActual');
        if (data) {
            let parseado = JSON.parse(data);
            emailUsuario = parseado.email || parseado.correo || parseado.usuario || "usuario_logueado";
        }
    } catch(e) {}

    // Formateador para estilo Mockup ($18.5M)
    const formatearAbreviado = (valor) => {
        if (valor === 0) return "$0";
        if (valor >= 1000000) {
            return "$" + (valor / 1000000).toFixed(1) + "M";
        }
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
    };

    // --- B. LEER DATOS REALES DE DOCUMENTOS SOPORTE ---
    const claveSoportes = `soportes_${emailUsuario}`;
    const soportes = JSON.parse(localStorage.getItem(claveSoportes)) || [];
    
    let totalCxpReal = 0;
    let totalReteFuenteReal = 0;
    let totalReteIcaReal = 0;
    let cantidadSoportesVigentes = 0;

    soportes.forEach(sop => {
        // Leemos solo los que están Emitidos correctamente
        if (sop.estado === 'Emitido') {
            totalCxpReal += sop.totales.neto; 
            totalReteFuenteReal += sop.totales.reteFuente; 
            totalReteIcaReal += sop.totales.reteIca; 
            cantidadSoportesVigentes++;
        }
    });

    // --- C. VALORES BASE (Simulados + Reales) ---
    const cajaVal = 8500000;
    const bancosVal = 42300000;
    const totalDisp = cajaVal + bancosVal; 

    const cxcVencidasVal = 5200000;
    const cxcPorVencerVal = 7200000;

    // Cuentas por Pagar se alimenta de la base + los Documentos Soporte que vayas creando
    const baseCxpPorVencer = 8900000;
    const totalCxpFinal = baseCxpPorVencer + totalCxpReal;
    const totalPagosPendientes = 15 + cantidadSoportesVigentes;

    const cxpVencidasVal = 3100000;

    // --- D. INYECCIÓN DE DATOS EN LA INTERFAZ ---
    const dataUI = {
        // Tesorería
        'valCaja': formatearAbreviado(cajaVal),
        'valBancos': formatearAbreviado(bancosVal),
        'valTotalDisponible': formatearAbreviado(totalDisp),
        'cxcVencidas': formatearAbreviado(cxcVencidasVal),
        'cxcVencidasCount': '12 facturas',
        'cxcPorVencer': formatearAbreviado(cxcPorVencerVal),
        'cxcPorVencerCount': '8 facturas',
        'cxpVencidas': formatearAbreviado(cxpVencidasVal),
        'cxpVencidasCount': '5 pagos',
        'cxpPorVencer': formatearAbreviado(totalCxpFinal),
        'cxpPorVencerCount': `${totalPagosPendientes} pagos`,
        
        // Impuestos
        'taxRetefuente': formatearAbreviado(totalReteFuenteReal),
        'taxReteica': formatearAbreviado(totalReteIcaReal),
        'taxIva': '$0'
    };

    // Aplicar cambios al DOM de forma segura
    for (const [id, valor] of Object.entries(dataUI)) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    }
}