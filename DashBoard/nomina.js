// ========== MÓDULO DE NÓMINA - SPARKLES ==========

let empleados = [];
let empleadoEditando = null;
let empleadoLiquidando = null;
let accionConfirmacionPendiente = null; // Variable para el modal personalizado

document.addEventListener('DOMContentLoaded', function() {
    // Si estas funciones vienen de dashboard.js, aseguran que haya un usuario
    if (typeof verificarSesion === 'function') verificarSesion();
    if (typeof cargarDatosUsuario === 'function') cargarDatosUsuario();
    
    cargarEmpleados();
    renderizarEmpleados();
    renderizarHistorialNominas();
});

// ========== CARGAR EMPLEADOS DESDE LOCALSTORAGE ==========
function cargarEmpleados() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuarioActual) return;
    
    const claveEmpleados = `empleados_${usuarioActual.email}`;
    empleados = JSON.parse(localStorage.getItem(claveEmpleados)) || [];
}

// ========== RENDERIZAR LA TABLA DE EMPLEADOS CON ESTADO DE MES ==========
function renderizarEmpleados() {
    const tbody = document.getElementById('empleadosTableBody');
    const table = document.getElementById('empleadosTable');
    const emptyState = document.getElementById('emptyStateEmpleados');
    
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveNominas = `nominas_${usuarioActual.email}`;
    const historialNominas = JSON.parse(localStorage.getItem(claveNominas)) || [];
    
    // Obtener mes y año actual para la validación
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();

    tbody.innerHTML = '';
    
    if (empleados.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    empleados.forEach(emp => {
        // VALIDACIÓN: ¿Ya se le pagó este mes?
        const yaPagado = historialNominas.some(nom => {
            const fechaNom = new Date(nom.fechaLiquidacion);
            return nom.empleado.id === emp.id && 
                   nom.estado === 'Pagada' && 
                   fechaNom.getMonth() === mesActual && 
                   fechaNom.getFullYear() === anioActual;
        });

        const tr = document.createElement('tr');
        const salarioFmt = new Intl.NumberFormat('es-CO', { 
            style: 'currency', currency: 'COP', maximumFractionDigits: 0 
        }).format(emp.salarioBase);

        // Definir el badge de estado mensual
        const badgeMensual = yaPagado 
            ? `<span class="badge" style="background: #e6f7ed; color: #2d7a4b; border: 1px solid #b7ebc6;">Al Día</span>`
            : `<span class="badge" style="background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e;">Deuda</span>`;

        // Deshabilitar el botón si ya está pagado para evitar duplicados
        const btnLiquidar = yaPagado 
            ? `<button class="btn-icon" style="opacity: 0.3; cursor: not-allowed;" title="Ya liquidado este mes">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
               </button>`
            : `<button class="btn-icon" onclick="liquidarNomina('${emp.id}')" title="Liquidar Manualmente">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d7a4b" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
               </button>`;

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="chk-empleado" value="${emp.id}" ${yaPagado ? 'disabled' : 'onchange="verificarSeleccion()"'} style="cursor: ${yaPagado ? 'default' : 'pointer'}; width: 16px; height: 16px;">
            </td>
            <td>
                <div class="empleado-info">
                    <strong>${emp.nombres} ${emp.apellidos}</strong>
                    <small>${emp.tipoContrato}</small>
                </div>
            </td>
            <td>${emp.documento}</td>
            <td>${emp.cargo}</td>
            <td>${salarioFmt}</td>
            <td>${badgeMensual}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    ${btnLiquidar}
                    <button class="btn-icon" onclick="editarEmpleado('${emp.id}')" title="Editar Información">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    const masterChk = document.getElementById('chkMaster');
    if(masterChk) masterChk.checked = false;
    verificarSeleccion();
}

// ========== LÓGICA DEL MODAL DE EMPLEADO ==========
function abrirModalEmpleado(idEmpleado = null) {
    const modal = document.getElementById('modalEmpleado');
    const form = document.getElementById('formEmpleado');
    const titulo = document.getElementById('modalEmpleadoTitulo');
    
    form.reset(); 

    if (idEmpleado) {
        titulo.textContent = 'Editar Empleado';
        empleadoEditando = empleados.find(emp => emp.id === idEmpleado);
        
        if (empleadoEditando) {
            document.getElementById('empNombres').value = empleadoEditando.nombres;
            document.getElementById('empApellidos').value = empleadoEditando.apellidos;
            document.getElementById('empDocumento').value = empleadoEditando.documento;
            document.getElementById('empCargo').value = empleadoEditando.cargo;
            document.getElementById('empContrato').value = empleadoEditando.tipoContrato;
            document.getElementById('empSalario').value = empleadoEditando.salarioBase;
            document.getElementById('empEps').value = empleadoEditando.eps;
            document.getElementById('empAfp').value = empleadoEditando.afp;
            document.getElementById('empActivo').checked = empleadoEditando.activo;
        }
    } else {
        titulo.textContent = 'Registrar Nuevo Empleado';
        empleadoEditando = null;
        document.getElementById('empActivo').checked = true;
    }
    
    modal.style.display = 'flex';
}

function cerrarModalEmpleado() {
    document.getElementById('modalEmpleado').style.display = 'none';
    empleadoEditando = null;
}

window.editarEmpleado = function(id) {
    abrirModalEmpleado(id);
};

// ========== GUARDAR EMPLEADO ==========
function guardarEmpleado() {
    const nombres = document.getElementById('empNombres').value.trim();
    const apellidos = document.getElementById('empApellidos').value.trim();
    const documento = document.getElementById('empDocumento').value.trim();
    const cargo = document.getElementById('empCargo').value.trim();
    const tipoContrato = document.getElementById('empContrato').value;
    const salarioBase = parseFloat(document.getElementById('empSalario').value);
    const eps = document.getElementById('empEps').value;
    const afp = document.getElementById('empAfp').value;
    const activo = document.getElementById('empActivo').checked;

    if (!nombres || !apellidos || !documento || !cargo || isNaN(salarioBase)) {
        mostrarToast("Por favor, completa todos los campos obligatorios.", "error");
        return;
    }

    const nuevoEmpleado = {
        id: empleadoEditando ? empleadoEditando.id : 'EMP-' + Date.now(),
        nombres,
        apellidos,
        documento,
        cargo,
        tipoContrato,
        salarioBase,
        eps,
        afp,
        activo
    };

    if (empleadoEditando) {
        const index = empleados.findIndex(emp => emp.id === empleadoEditando.id);
        if (index !== -1) empleados[index] = nuevoEmpleado;
    } else {
        empleados.push(nuevoEmpleado);
    }

    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveEmpleados = `empleados_${usuarioActual.email}`;
    localStorage.setItem(claveEmpleados, JSON.stringify(empleados));

    cerrarModalEmpleado();
    renderizarEmpleados();
}

// ========== LÓGICA DE LIQUIDACIÓN INDIVIDUAL ==========
function liquidarNomina(idEmpleado) {
    empleadoLiquidando = empleados.find(emp => emp.id === idEmpleado);
    if (!empleadoLiquidando) return;

    document.getElementById('liqNombreEmpleado').textContent = `Liquidar: ${empleadoLiquidando.nombres} ${empleadoLiquidando.apellidos}`;
    
    const salarioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(empleadoLiquidando.salarioBase);
    document.getElementById('liqCargoEmpleado').textContent = `${empleadoLiquidando.cargo} — Salario Base: ${salarioFmt}`;

    document.getElementById('liqDias').value = 30;
    document.getElementById('liqTransporte').value = 0;
    document.getElementById('liqExtras').value = 0;
    document.getElementById('liqComisiones').value = 0;
    document.getElementById('liqPrestamos').value = 0;
    document.getElementById('liqOtrasDeducciones').value = 0;

    calcularLiquidacion();
    document.getElementById('modalLiquidacion').style.display = 'flex';
}

function cerrarModalLiquidacion() {
    document.getElementById('modalLiquidacion').style.display = 'none';
    empleadoLiquidando = null;
}

function calcularLiquidacion() {
    if (!empleadoLiquidando) return;

    const diasTrabajados = parseInt(document.getElementById('liqDias').value) || 0;
    const transporte = parseFloat(document.getElementById('liqTransporte').value) || 0;
    const extras = parseFloat(document.getElementById('liqExtras').value) || 0;
    const comisiones = parseFloat(document.getElementById('liqComisiones').value) || 0;
    const prestamos = parseFloat(document.getElementById('liqPrestamos').value) || 0;
    const otrasDeducciones = parseFloat(document.getElementById('liqOtrasDeducciones').value) || 0;

    const salarioProporcional = (empleadoLiquidando.salarioBase / 30) * diasTrabajados;
    const totalDevengos = salarioProporcional + transporte + extras + comisiones;

    const baseParaSeguridadSocial = salarioProporcional + extras + comisiones;
    const aporteSalud = baseParaSeguridadSocial * 0.04;
    const aportePension = baseParaSeguridadSocial * 0.04;

    document.getElementById('liqSalud').value = Math.round(aporteSalud);
    document.getElementById('liqPension').value = Math.round(aportePension);

    const totalDeducciones = aporteSalud + aportePension + prestamos + otrasDeducciones;
    const netoAPagar = totalDevengos - totalDeducciones;

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    document.getElementById('totalDevengosTexto').textContent = fmt.format(totalDevengos);
    document.getElementById('totalDeduccionesTexto').textContent = fmt.format(totalDeducciones);
    document.getElementById('netoPagarTexto').textContent = fmt.format(netoAPagar);
}

function guardarLiquidacion() {
    if (!empleadoLiquidando) return;

    const diasTrabajados = parseInt(document.getElementById('liqDias').value) || 0;
    const transporte = parseFloat(document.getElementById('liqTransporte').value) || 0;
    const extras = parseFloat(document.getElementById('liqExtras').value) || 0;
    const comisiones = parseFloat(document.getElementById('liqComisiones').value) || 0;
    const salud = parseFloat(document.getElementById('liqSalud').value) || 0;
    const pension = parseFloat(document.getElementById('liqPension').value) || 0;
    const prestamos = parseFloat(document.getElementById('liqPrestamos').value) || 0;
    const otrasDeducciones = parseFloat(document.getElementById('liqOtrasDeducciones').value) || 0;

    const salarioProporcional = (empleadoLiquidando.salarioBase / 30) * diasTrabajados;
    const totalDevengos = salarioProporcional + transporte + extras + comisiones;
    const totalDeducciones = salud + pension + prestamos + otrasDeducciones;
    const netoAPagar = totalDevengos - totalDeducciones;

    const registroNomina = {
        id: 'NOM-' + Math.floor(Math.random() * 1000000),
        fechaLiquidacion: new Date().toISOString(),
        empleado: {
            id: empleadoLiquidando.id,
            nombreCompleto: `${empleadoLiquidando.nombres} ${empleadoLiquidando.apellidos}`,
            documento: empleadoLiquidando.documento,
            cargo: empleadoLiquidando.cargo,
            salarioBase: empleadoLiquidando.salarioBase
        },
        conceptos: { diasTrabajados, salarioProporcional, transporte, extras, comisiones, salud, pension, prestamos, otrasDeducciones },
        totales: { devengos: totalDevengos, deducciones: totalDeducciones, neto: netoAPagar },
        estado: 'Pendiente'
    };

    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveNominas = `nominas_${usuarioActual.email}`;
    let historialNominas = JSON.parse(localStorage.getItem(claveNominas)) || [];
    historialNominas.push(registroNomina);
    localStorage.setItem(claveNominas, JSON.stringify(historialNominas));

    cerrarModalLiquidacion();
    renderizarHistorialNominas();
    
    // Llamamos a nuestra nueva notificación moderna
    mostrarToast(`Nómina de <strong>${registroNomina.empleado.nombreCompleto}</strong> guardada como PENDIENTE.`, 'success');
}

// ========== RENDERIZAR TABLA DE HISTORIAL ==========
function renderizarHistorialNominas() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuarioActual) return;
    
    const claveNominas = `nominas_${usuarioActual.email}`;
    let historialNominas = JSON.parse(localStorage.getItem(claveNominas)) || [];
    
    const tbody = document.getElementById('historialNominasTableBody');
    const table = document.getElementById('historialNominasTable');
    const emptyState = document.getElementById('emptyStateHistorial');
    
    tbody.innerHTML = '';
    
    if (historialNominas.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        actualizarResumenMensual(historialNominas);
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    historialNominas.sort((a, b) => new Date(b.fechaLiquidacion) - new Date(a.fechaLiquidacion));
    
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    historialNominas.forEach(nomina => {
        const tr = document.createElement('tr');
        const fechaFmt = new Date(nomina.fechaLiquidacion).toLocaleDateString('es-CO');
        
        let badgeClass = 'badge-inactivo'; 
        if (nomina.estado === 'Pagada') badgeClass = 'badge-activo';
        if (nomina.estado === 'Anulada') badgeClass = 'badge-inactivo';
        
        let botonesAccion = '';
        if (nomina.estado === 'Pendiente') {
            botonesAccion = `
                <button class="btn-icon" onclick="pagarNomina('${nomina.id}')" title="Marcar como Pagada">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d7a4b" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </button>
                <button class="btn-icon" onclick="anularNomina('${nomina.id}')" title="Anular">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </button>`;
        } else if (nomina.estado === 'Pagada') {
            botonesAccion = `
                <button class="btn-icon" onclick="descargarDesprendiblePDF('${nomina.id}')" title="Descargar PDF">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
                <button class="btn-icon" onclick="anularNomina('${nomina.id}')" title="Anular">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </button>`;
        } else {
            botonesAccion = `<span style="font-size: 12px; color: #86868b; font-style: italic;">Sin acciones</span>`;
        }

        const opacity = nomina.estado === 'Anulada' ? 'opacity: 0.5;' : '';
        
        tr.innerHTML = `
            <td style="${opacity}">${fechaFmt}</td>
            <td style="${opacity}"><strong>${nomina.id}</strong></td>
            <td style="${opacity}">
                <div class="empleado-info">
                    <strong>${nomina.empleado.nombreCompleto}</strong>
                    <small>CC: ${nomina.empleado.documento}</small>
                </div>
            </td>
            <td style="color: #2d7a4b; font-weight: 500; ${opacity}">${fmt.format(nomina.totales.devengos)}</td>
            <td style="color: #c62828; font-weight: 500; ${opacity}">${fmt.format(nomina.totales.deducciones)}</td>
            <td style="${opacity}"><strong style="font-size: 15px;">${fmt.format(nomina.totales.neto)}</strong></td>
            <td style="${opacity}"><span class="badge ${badgeClass}">${nomina.estado}</span></td>
            <td>${botonesAccion}</td>
        `;
        tbody.appendChild(tr);
    });

    actualizarResumenMensual(historialNominas);
}

// ========== ACTUALIZAR TARJETAS DE RESUMEN ==========
function actualizarResumenMensual(historialNominas) {
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();

    let totalPagado = 0;
    let totalAportes = 0;
    let empleadosLiquidados = new Set(); 

    historialNominas.forEach(nom => {
        const fechaNom = new Date(nom.fechaLiquidacion);
        if (fechaNom.getMonth() === mesActual && fechaNom.getFullYear() === anioActual && nom.estado === 'Pagada') {
            totalPagado += nom.totales.neto;
            totalAportes += (nom.conceptos.salud + nom.conceptos.pension);
            empleadosLiquidados.add(nom.empleado.id);
        }
    });

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    
    document.getElementById('resumenTotalPagado').textContent = fmt.format(totalPagado);
    document.getElementById('resumenAportes').textContent = fmt.format(totalAportes);
    document.getElementById('resumenEmpleados').textContent = empleadosLiquidados.size;
}

// ========== GENERADOR DE DESPRENDIBLE PDF PROFESIONAL ==========
function descargarDesprendiblePDF(idNomina) {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveNominas = `nominas_${usuarioActual.email}`;
    const historial = JSON.parse(localStorage.getItem(claveNominas)) || [];
    
    const nomina = historial.find(n => n.id === idNomina);
    if (!nomina) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    // --- CONFIGURACIÓN DE COLORES Y ESTILOS ---
    const cRed = [128, 25, 49];     // Rojo Sparkles #801931
    const cGray = [100, 100, 100];  // Gris texto
    const cLight = [245, 245, 247]; // Gris fondo filas

    // 1. HEADER (BLOQUE DE MARCA)
    doc.setFillColor(...cRed);
    doc.rect(0, 0, 210, 45, 'F'); 
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("SPARKLES", 20, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("SOFTWARE CONTABLE E INTELIGENTE", 20, 29);
    doc.text("NIT: 900.123.456-7", 20, 34);
    doc.text("Montería, Córdoba - Colombia", 20, 39);

    // Etiqueta de Documento a la derecha
    doc.setFontSize(16);
    doc.text("COMPROBANTE DE PAGO", 190, 22, { align: "right" });
    doc.setFontSize(12);
    doc.text(`N° ${nomina.id}`, 190, 30, { align: "right" });
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date(nomina.fechaLiquidacion).toLocaleDateString()}`, 190, 37, { align: "right" });

    // 2. CUADRO DE INFORMACIÓN (EMPLEADO)
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DEL COLABORADOR", 20, 58);
    
    // Línea decorativa
    doc.setDrawColor(...cRed);
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Nombre Completo:", 20, 68);
    doc.text("Identificación:", 20, 74);
    doc.text("Cargo:", 20, 80);
    
    doc.setFont("helvetica", "normal");
    doc.text(nomina.empleado.nombreCompleto, 60, 68);
    doc.text(nomina.empleado.documento, 60, 74);
    doc.text(nomina.empleado.cargo, 60, 80);

    doc.setFont("helvetica", "bold");
    doc.text("Periodo Pago:", 120, 68);
    doc.text("Días Liquidados:", 120, 74);
    doc.text("Salario Base:", 120, 80);
    
    doc.setFont("helvetica", "normal");
    doc.text("Mensual", 160, 68);
    doc.text(`${nomina.conceptos.diasTrabajados} días`, 160, 74);
    doc.text(fmt.format(nomina.empleado.salarioBase), 160, 80);

    // 3. TABLA DE CONCEPTOS (Cebra Style)
    let y = 95;
    
    // Header Tabla
    doc.setFillColor(...cRed);
    doc.rect(20, y, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPCIÓN DE CONCEPTOS", 25, y + 6.5);
    doc.text("DEVENGOS", 115, y + 6.5);
    doc.text("DEDUCCIONES", 155, y + 6.5);

    y += 10;
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");

    const items = [
        { c: "Sueldo Básico", dev: nomina.conceptos.salarioProporcional, ded: 0 },
        { c: "Auxilio de Transporte", dev: nomina.conceptos.transporte, ded: 0 },
        { c: "Horas Extras / Recargos", dev: nomina.conceptos.extras, ded: 0 },
        { c: "Comisiones y Bonos", dev: nomina.conceptos.comisiones, ded: 0 },
        { c: "Aporte Salud (4%)", dev: 0, ded: nomina.conceptos.salud },
        { c: "Aporte Pensión (4%)", dev: 0, ded: nomina.conceptos.pension },
        { c: "Préstamos / Anticipos", dev: 0, ded: nomina.conceptos.prestamos },
        { c: "Otras Deducciones", dev: 0, ded: nomina.conceptos.otrasDeducciones }
    ];

    let esGris = true;
    items.forEach(item => {
        if (item.dev > 0 || item.ded > 0) {
            if (esGris) {
                doc.setFillColor(...cLight);
                doc.rect(20, y, 170, 8, 'F');
            }
            doc.text(item.c, 25, y + 5.5);
            doc.text(item.dev > 0 ? fmt.format(item.dev) : "-", 135, y + 5.5, { align: "right" });
            doc.text(item.ded > 0 ? fmt.format(item.ded) : "-", 185, y + 5.5, { align: "right" });
            y += 8;
            esGris = !esGris;
        }
    });

    // 4. BLOQUE DE TOTALES
    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(110, y, 190, y);
    
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal Devengos:", 110, y);
    doc.text(fmt.format(nomina.totales.devengos), 190, y, { align: "right" });
    
    y += 6;
    doc.text("Subtotal Deducciones:", 110, y);
    doc.text(`- ${fmt.format(nomina.totales.deducciones)}`, 190, y, { align: "right" });

    // Cuadro Neto a Pagar
    y += 10;
    doc.setFillColor(...cRed);
    doc.rect(110, y, 80, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("NETO PAGADO", 115, y + 9.5);
    doc.text(fmt.format(nomina.totales.neto), 185, y + 9.5, { align: "right" });

    // 5. PIE DE PÁGINA Y FIRMAS
    doc.setTextColor(...cGray);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Este documento es un soporte de pago electrónico generado por Sparkles Software.", 105, 260, { align: "center" });

    // Líneas de firma
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.line(30, 240, 85, 240);
    doc.line(125, 240, 180, 240);
    
    doc.setFont("helvetica", "normal");
    doc.text("Firma del Empleador", 57.5, 245, { align: "center" });
    doc.text("Firma del Trabajador", 152.5, 245, { align: "center" });

    // Guardar
    const nombreArchivo = `Desprendible_${nomina.empleado.nombreCompleto.replace(/ /g, "_")}_${nomina.id}.pdf`;
    doc.save(nombreArchivo);
}
// ========== FASE 3: PAGO MASIVO (AUTO-LIQUIDACIÓN) ==========
function toggleSelectAll(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.chk-empleado');
    checkboxes.forEach(chk => chk.checked = masterCheckbox.checked);
    verificarSeleccion();
}

function verificarSeleccion() {
    const checkboxes = document.querySelectorAll('.chk-empleado:checked');
    const btnPagoMasivo = document.getElementById('btnPagoMasivo');
    
    if (checkboxes.length > 0) {
        btnPagoMasivo.style.display = 'flex';
        btnPagoMasivo.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Pagar a ${checkboxes.length} Empleados`;
    } else {
        btnPagoMasivo.style.display = 'none';
    }
}

// ========== SISTEMA DE CONFIRMACIONES PERSONALIZADAS ==========
function mostrarConfirmacion(titulo, mensaje, textoBoton, colorBoton, colorFondoIcono, svgIcon, callback) {
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
    
    // El orden correcto: Primero ejecuta la acción, luego cierra la ventana
    btnAccion.onclick = () => {
        if(accionConfirmacionPendiente) {
            accionConfirmacionPendiente(); 
        }
        cerrarConfirmacion(); 
    };
}

function cerrarConfirmacion() {
    document.getElementById('modalConfirmacion').style.display = 'none';
    accionConfirmacionPendiente = null;
}

// ========== ACCIONES CON MODALES PERSONALIZADOS ==========
function pagarNomina(idNomina) {
    mostrarConfirmacion(
        'Registrar Pago',
        '¿Estás seguro de registrar el pago de esta nómina? Esto cambiará su estado a "Pagada" y habilitará la descarga del PDF.',
        'Sí, Pagar Nómina',
        '#2d7a4b', 
        '#e6f7ed', 
        `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        () => {
            const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
            const claveNominas = `nominas_${usuarioActual.email}`;
            let historialNominas = JSON.parse(localStorage.getItem(claveNominas)) || [];
            
            const index = historialNominas.findIndex(n => n.id === idNomina);
            if (index !== -1) {
                historialNominas[index].estado = 'Pagada';
                localStorage.setItem(claveNominas, JSON.stringify(historialNominas));
                renderizarHistorialNominas(); // Actualiza la tabla de abajo
                renderizarEmpleados();        // ACTUALIZA LA TABLA DE ARRIBA (Deuda -> Al Día)
            }
        }
    );
}

function anularNomina(idNomina) {
    mostrarConfirmacion(
        'Anular Liquidación',
        '¿Estás seguro de ANULAR esta liquidación? Esta acción es irreversible y el dinero se descontará de tus reportes.',
        'Sí, Anular',
        '#c62828', 
        '#ffebee', 
        `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        () => {
            const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
            const claveNominas = `nominas_${usuarioActual.email}`;
            let historialNominas = JSON.parse(localStorage.getItem(claveNominas)) || [];
            
            const index = historialNominas.findIndex(n => n.id === idNomina);
            if (index !== -1) {
                historialNominas[index].estado = 'Anulada';
                localStorage.setItem(claveNominas, JSON.stringify(historialNominas));
                renderizarHistorialNominas(); // Actualiza la tabla de abajo
                renderizarEmpleados();        // ACTUALIZA LA TABLA DE ARRIBA (Al Día -> Deuda)
            }
        }
    );
}

function pagarSeleccionados() {
    const checkboxes = document.querySelectorAll('.chk-empleado:checked');
    if (checkboxes.length === 0) return;

    mostrarConfirmacion(
        'Pago Masivo',
        `¿Estás seguro de auto-liquidar y PAGAR a ${checkboxes.length} empleado(s)? Se calcularán automáticamente 30 días base sin horas extras.`,
        `Pagar a ${checkboxes.length} Empleados`,
        '#1565c0', 
        '#e3f2fd', 
        `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
        () => {
            const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
            const claveNominas = `nominas_${usuarioActual.email}`;
            let historialNominas = JSON.parse(localStorage.getItem(claveNominas)) || [];

            let pagadosCount = 0;

            checkboxes.forEach(chk => {
                const emp = empleados.find(e => e.id === chk.value);
                if (emp && emp.activo) {
                    const salario = emp.salarioBase;
                    const salud = Math.round(salario * 0.04);
                    const pension = Math.round(salario * 0.04);
                    const neto = salario - salud - pension;

                    const registroNomina = {
                        id: 'NOM-' + Math.floor(Math.random() * 1000000),
                        fechaLiquidacion: new Date().toISOString(),
                        empleado: {
                            id: emp.id,
                            nombreCompleto: `${emp.nombres} ${emp.apellidos}`,
                            documento: emp.documento,
                            cargo: emp.cargo,
                            salarioBase: emp.salarioBase
                        },
                        conceptos: { 
                            diasTrabajados: 30, salarioProporcional: salario, transporte: 0, 
                            extras: 0, comisiones: 0, salud: salud, pension: pension, prestamos: 0, otrasDeducciones: 0 
                        },
                        totales: { devengos: salario, deducciones: salud + pension, neto: neto },
                        estado: 'Pagada' 
                    };
                    
                    historialNominas.push(registroNomina);
                    pagadosCount++;
                }
            });

            localStorage.setItem(claveNominas, JSON.stringify(historialNominas));
            
            document.querySelectorAll('.chk-empleado').forEach(c => c.checked = false);
            document.getElementById('chkMaster').checked = false;
            verificarSeleccion();

            renderizarHistorialNominas();
            renderizarEmpleados(); // ACTUALIZA TODOS LOS BADGES A "AL DÍA"
        }
    );
}
// ====================================================================
// ========== SISTEMA DE NOTIFICACIONES FLOTANTES (TOASTS) ============
// ====================================================================

function mostrarToast(mensaje, tipo = 'success') {
    // 1. Crear el contenedor de notificaciones si no existe
    let toastContainer = document.getElementById('sparkles-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'sparkles-toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 12px; pointer-events: none;';
        document.body.appendChild(toastContainer);
    }

    // 2. Configurar colores e íconos según el tipo
    const color = tipo === 'success' ? '#2d7a4b' : (tipo === 'error' ? '#c62828' : '#1565c0');
    const bgFondo = tipo === 'success' ? '#e6f7ed' : (tipo === 'error' ? '#ffebee' : '#e3f2fd');
    const icono = tipo === 'success' 
        ? '<polyline points="20 6 9 17 4 12"></polyline>' 
        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';

    // 3. Crear la tarjeta de la notificación
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: white;
        color: #1d1d1f;
        min-width: 300px;
        max-width: 400px;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 16px;
        border-left: 4px solid ${color};
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        transform: translateX(120%);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: auto;
    `;

    toast.innerHTML = `
        <div style="background: ${bgFondo}; color: ${color}; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icono}</svg>
        </div>
        <div style="line-height: 1.4;">${mensaje}</div>
    `;

    // 4. Agregar a la pantalla y animar
    toastContainer.appendChild(toast);

    // Entrada
    requestAnimationFrame(() => {
        setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    });

    // Salida (desaparece después de 3.5 segundos)
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400); // Espera a que termine la animación para borrarlo del HTML
    }, 3500);
}