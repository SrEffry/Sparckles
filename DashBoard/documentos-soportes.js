// ========== MÓDULO DE DOCUMENTOS SOPORTE - SPARKLES ==========

let soportes = [];
let accionConfirmacionPendiente = null;

document.addEventListener('DOMContentLoaded', function() {
    cargarSoportes();
    renderizarSoportes();
});

// ========== 1. CARGA Y ALMACENAMIENTO (INTELIGENTE) ==========
function obtenerClaveSoportes() {
    let identificador = "usuario_general";
    try {
        let data = sessionStorage.getItem('usuarioActual') || localStorage.getItem('usuarioActual');
        if (data) {
            let parseado = JSON.parse(data);
            identificador = parseado.email || parseado.correo || parseado.usuario || "usuario_logueado";
        }
    } catch(e) {}
    return `soportes_${identificador}`;
}

function cargarSoportes() {
    soportes = JSON.parse(localStorage.getItem(obtenerClaveSoportes())) || [];
}

function guardarEnStorage() {
    localStorage.setItem(obtenerClaveSoportes(), JSON.stringify(soportes));
}

// ========== 2. LÓGICA DEL MODAL ==========
window.abrirModalSoporte = function() {
    document.getElementById('formSoporte').reset();
    document.getElementById('calcSubtotal').textContent = '$0';
    document.getElementById('calcReteFuente').textContent = '$0';
    document.getElementById('calcReteIca').textContent = '$0';
    document.getElementById('calcNetoPagar').textContent = '$0';
    
    document.getElementById('modalSoporte').style.display = 'flex';
};

window.cerrarModalSoporte = function() {
    document.getElementById('modalSoporte').style.display = 'none';
};

// ========== 3. CALCULADORA EN TIEMPO REAL ==========
window.calcularSoporte = function() {
    const valorBruto = parseFloat(document.getElementById('sopValorBruto').value) || 0;
    
    const porcentajeReteFuente = parseFloat(document.getElementById('sopPorcentajeReteFuente').value) || 0;
    const reteFuenteCalculada = valorBruto * (porcentajeReteFuente / 100);
    
    const porcentajeReteIca = parseFloat(document.getElementById('sopPorcentajeReteIca').value) || 0;
    const reteIcaCalculada = valorBruto * (porcentajeReteIca / 1000);
    
    const netoAPagar = valorBruto - reteFuenteCalculada - reteIcaCalculada;

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    document.getElementById('calcSubtotal').textContent = fmt.format(valorBruto);
    document.getElementById('calcReteFuente').textContent = fmt.format(reteFuenteCalculada);
    document.getElementById('calcReteIca').textContent = fmt.format(reteIcaCalculada);
    document.getElementById('calcNetoPagar').textContent = fmt.format(netoAPagar);
};

// ========== 4. GUARDAR NUEVO DOCUMENTO ==========
window.guardarDocumentoSoporte = function() {
    const proveedor = document.getElementById('sopProveedor').value.trim();
    const documento = document.getElementById('sopDocumento').value.trim();
    const concepto = document.getElementById('sopConcepto').value.trim();
    const valorBruto = parseFloat(document.getElementById('sopValorBruto').value) || 0;
    
    if (!proveedor || !documento || !concepto || valorBruto <= 0) {
        mostrarToast("Por favor, completa todos los campos correctamente.", "error");
        return;
    }

    const porcentajeReteFuente = parseFloat(document.getElementById('sopPorcentajeReteFuente').value) || 0;
    const reteFuenteCalculada = valorBruto * (porcentajeReteFuente / 100);
    
    const porcentajeReteIca = parseFloat(document.getElementById('sopPorcentajeReteIca').value) || 0;
    const reteIcaCalculada = valorBruto * (porcentajeReteIca / 1000);
    
    const netoAPagar = valorBruto - reteFuenteCalculada - reteIcaCalculada;

    const numeroDS = 'DS-' + Math.floor(Math.random() * 90000 + 10000);

    const nuevoSoporte = {
        id: numeroDS,
        fechaEmision: new Date().toISOString(),
        proveedor: {
            nombre: proveedor,
            documento: documento
        },
        concepto: concepto,
        totales: {
            bruto: valorBruto,
            reteFuente: reteFuenteCalculada,
            porcReteFuente: porcentajeReteFuente,
            reteIca: reteIcaCalculada,
            porcReteIca: porcentajeReteIca,
            neto: netoAPagar
        },
        estado: 'Emitido'
    };

    soportes.push(nuevoSoporte);
    guardarEnStorage();
    
    cerrarModalSoporte();
    renderizarSoportes();
    mostrarToast(`Documento ${numeroDS} generado exitosamente.`, 'success');
};

// ========== 5. RENDERIZAR TABLA Y RESUMEN ==========
function renderizarSoportes() {
    const tbody = document.getElementById('tablaDocumentosBody');
    const table = document.getElementById('tablaDocumentos');
    const emptyState = document.getElementById('emptyStateSoporte');
    
    tbody.innerHTML = '';
    
    if (soportes.length === 0) {
        if(table) table.style.display = 'none';
        if(emptyState) emptyState.style.display = 'block';
        actualizarResumenSoportes();
        return;
    }
    
    if(table) table.style.display = 'table';
    if(emptyState) emptyState.style.display = 'none';
    
    const soportesOrdenados = [...soportes].sort((a, b) => new Date(b.fechaEmision) - new Date(a.fechaEmision));
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    soportesOrdenados.forEach(sop => {
        const tr = document.createElement('tr');
        const fechaFmt = new Date(sop.fechaEmision).toLocaleDateString('es-CO');
        const totalRetenciones = sop.totales.reteFuente + sop.totales.reteIca;
        
        const isAnulado = sop.estado === 'Anulado';
        const opacity = isAnulado ? 'opacity: 0.5;' : '';
        const badgeClass = isAnulado ? 'background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e;' : 'background: #e6f7ed; color: #2d7a4b; border: 1px solid #b7ebc6;';
        
        let botones = `
            <button class="btn-icon" onclick="descargarSoportePDF('${sop.id}')" title="Descargar PDF" style="background:transparent; border:none; cursor:pointer;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
        `;

        if (!isAnulado) {
            botones += `
                <button class="btn-icon" onclick="anularSoporte('${sop.id}')" title="Anular Documento" style="background:transparent; border:none; cursor:pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </button>
            `;
        }

        tr.innerHTML = `
            <td style="${opacity}">${fechaFmt}</td>
            <td style="${opacity}"><strong>${sop.id}</strong></td>
            <td style="${opacity}">
                <div class="empleado-info">
                    <strong>${sop.proveedor.nombre}</strong><br>
                    <small>CC/NIT: ${sop.proveedor.documento}</small>
                </div>
            </td>
            <td style="color: #424245; ${opacity}">${fmt.format(sop.totales.bruto)}</td>
            <td style="color: #c62828; ${opacity}">${fmt.format(totalRetenciones)}</td>
            <td style="${opacity}"><strong style="color: #1d1d1f; font-size: 14px;">${fmt.format(sop.totales.neto)}</strong></td>
            <td style="${opacity}"><span class="badge" style="${badgeClass} padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">${sop.estado}</span></td>
            <td><div style="display: flex; gap: 8px;">${botones}</div></td>
        `;
        tbody.appendChild(tr);
    });

    actualizarResumenSoportes();
}

function actualizarResumenSoportes() {
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();

    let brutoMes = 0;
    let retencionesMes = 0;
    let docsMes = 0;

    soportes.forEach(sop => {
        const fecha = new Date(sop.fechaEmision);
        if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual && sop.estado === 'Emitido') {
            brutoMes += sop.totales.bruto;
            retencionesMes += (sop.totales.reteFuente + sop.totales.reteIca);
            docsMes++;
        }
    });

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    const rb = document.getElementById('resumenBruto');
    const rr = document.getElementById('resumenRetenciones');
    const rd = document.getElementById('resumenDocumentos');
    
    if(rb) rb.textContent = fmt.format(brutoMes);
    if(rr) rr.textContent = fmt.format(retencionesMes);
    if(rd) rd.textContent = docsMes;
}

// ========== 6. GENERADOR DE PDF (FORMATO DIAN) ==========
window.descargarSoportePDF = function(idSoporte) {
    const soporte = soportes.find(s => s.id === idSoporte);
    if (!soporte) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    const cBrand = [234, 88, 12]; 
    
    doc.setFillColor(...cBrand);
    doc.rect(0, 0, 210, 40, 'F'); 
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("SPARKLES S.A.S", 20, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("NIT: 900.123.456-7 | Régimen Común", 20, 26);
    doc.text("Montería, Córdoba - Colombia", 20, 31);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DOCUMENTO SOPORTE", 190, 20, { align: "right" });
    doc.setFontSize(11);
    doc.text(`N° ${soporte.id}`, 190, 26, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Fecha Emisión: ${new Date(soporte.fechaEmision).toLocaleDateString()}`, 190, 31, { align: "right" });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DOCUMENTO SOPORTE EN ADQUISICIONES EFECTUADAS A SUJETOS", 105, 50, { align: "center" });
    doc.text("NO OBLIGADOS A EXPEDIR FACTURA O DOCUMENTO EQUIVALENTE", 105, 55, { align: "center" });
    
    doc.setDrawColor(...cBrand);
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    doc.setFontSize(11);
    doc.text("DATOS DEL PROVEEDOR / CONTRATISTA:", 20, 70);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre o Razón Social: ${soporte.proveedor.nombre}`, 20, 78);
    doc.text(`Identificación (NIT/CC): ${soporte.proveedor.documento}`, 20, 84);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DE LA OPERACIÓN:", 20, 98);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const splitConcepto = doc.splitTextToSize(soporte.concepto, 160);
    doc.text(splitConcepto, 20, 106);

    let y = 106 + (splitConcepto.length * 5) + 10;

    doc.setFillColor(245, 245, 247);
    doc.rect(20, y, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("CONCEPTO FINANCIERO", 25, y + 6.5);
    doc.text("VALOR", 185, y + 6.5, { align: "right" });

    y += 10;
    doc.setFont("helvetica", "normal");

    doc.text("Valor Bruto del Bien o Servicio", 25, y + 6);
    doc.text(fmt.format(soporte.totales.bruto), 185, y + 6, { align: "right" });
    y += 10;

    doc.setTextColor(198, 40, 40); 
    if (soporte.totales.reteFuente > 0) {
        doc.text(`(-) Retención en la Fuente (${soporte.totales.porcReteFuente}%)`, 25, y + 6);
        doc.text(fmt.format(soporte.totales.reteFuente), 185, y + 6, { align: "right" });
        y += 10;
    }
    
    if (soporte.totales.reteIca > 0) {
        doc.text(`(-) ReteICA (${soporte.totales.porcReteIca} por mil)`, 25, y + 6);
        doc.text(fmt.format(soporte.totales.reteIca), 185, y + 6, { align: "right" });
        y += 10;
    }

    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);
    y += 5;

    doc.setFillColor(...cBrand);
    doc.rect(110, y, 80, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("NETO A PAGAR", 115, y + 8);
    doc.text(fmt.format(soporte.totales.neto), 185, y + 8, { align: "right" });

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    y += 50;
    doc.line(20, y, 80, y);
    doc.line(130, y, 190, y);
    doc.text("Firma de quien elabora", 35, y + 5);
    doc.text("Firma del beneficiario del pago", 135, y + 5);

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Documento generado a través de Sparkles Software. Cumple requisitos del Art. 55 Res 000042 DIAN.", 105, 280, { align: "center" });

    doc.save(`Soporte_${soporte.id}_${soporte.proveedor.nombre.replace(/ /g, "_")}.pdf`);
};

// ========== 7. ANULAR DOCUMENTO Y UTILIDADES ==========
window.anularSoporte = function(idSoporte) {
    mostrarConfirmacion(
        'Anular Documento Soporte',
        `¿Estás seguro de anular el documento ${idSoporte}? Esta acción no se puede deshacer y los valores no sumarán en tus impuestos.`,
        'Sí, Anular',
        '#c62828',
        '#ffebee',
        `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        () => {
            const index = soportes.findIndex(s => s.id === idSoporte);
            if (index !== -1) {
                soportes[index].estado = 'Anulado';
                guardarEnStorage();
                renderizarSoportes();
                mostrarToast(`El documento ${idSoporte} ha sido anulado.`, 'success');
            }
        }
    );
};

window.mostrarConfirmacion = function(titulo, mensaje, textoBoton, colorBoton, colorFondoIcono, svgIcon, callback) {
    document.getElementById('confirmTitulo').textContent = titulo;
    document.getElementById('confirmMensaje').textContent = mensaje;
    
    const btnAccion = document.getElementById('btnConfirmAccion');
    btnAccion.textContent = textoBoton;
    btnAccion.style.background = colorBoton;
    
    document.getElementById('confirmIcon').innerHTML = `
        <div style="background: ${colorFondoIcono}; color: ${colorBoton}; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            ${svgIcon}
        </div>
    `;

    accionConfirmacionPendiente = callback;
    document.getElementById('modalConfirmacion').style.display = 'flex';
    
    btnAccion.onclick = () => {
        if(accionConfirmacionPendiente) accionConfirmacionPendiente();
        cerrarConfirmacion();
    };
};

window.cerrarConfirmacion = function() {
    document.getElementById('modalConfirmacion').style.display = 'none';
    accionConfirmacionPendiente = null;
};

window.mostrarToast = function(mensaje, tipo = 'success') {
    let toastContainer = document.getElementById('sparkles-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'sparkles-toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 12px; pointer-events: none;';
        document.body.appendChild(toastContainer);
    }

    const color = tipo === 'success' ? '#2d7a4b' : (tipo === 'error' ? '#c62828' : '#1565c0');
    const bgFondo = tipo === 'success' ? '#e6f7ed' : (tipo === 'error' ? '#ffebee' : '#e3f2fd');
    const icono = tipo === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: white; color: #1d1d1f; min-width: 300px; max-width: 400px; padding: 16px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        display: flex; align-items: center; gap: 16px; border-left: 4px solid ${color}; font-family: inherit; font-size: 14px; font-weight: 500;
        transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: auto;
    `;

    toast.innerHTML = `<div style="background: ${bgFondo}; color: ${color}; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icono}</svg></div><div style="line-height: 1.4;">${mensaje}</div>`;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => setTimeout(() => toast.style.transform = 'translateX(0)', 10));
    setTimeout(() => { toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 400); }, 3500);
};