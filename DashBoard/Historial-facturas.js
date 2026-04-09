// ============================================================
// HISTORIAL DE FACTURAS — Sparkles
// Versión mejorada: Fases 1, 2 y 3 implementadas
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    verificarSesion();
    cargarDatosUsuario();
    setupLogout();
    cargarFacturas();
    actualizarEstadisticas();
});

// ──────────────────────────────────────────────────────────────
// SESIÓN / USUARIO
// ──────────────────────────────────────────────────────────────
function verificarSesion() {
    if (!sessionStorage.getItem('usuarioActual')) {
        window.location.href = '../index.html';
    }
}

function cargarDatosUsuario() {
    const u = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!u) return;
    document.querySelectorAll('.user-details strong').forEach(el => el.textContent = `${u.nombre} ${u.apellido}`);
    document.querySelectorAll('.user-details span').forEach(el => el.textContent = u.email);
    document.querySelectorAll('.user-info-header strong').forEach(el => el.textContent = `${u.nombre} ${u.apellido}`);
    const ini = (u.nombre[0] + u.apellido[0]).toUpperCase();
    document.querySelectorAll('.user-avatar, .user-avatar-small').forEach(el => el.textContent = ini);
}

function setupLogout() {
    const btn = document.querySelector('.footer-btn:last-child');
    if (btn) btn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            sessionStorage.removeItem('usuarioActual');
            window.location.href = '../index.html';
        }
    });
}

// ──────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ──────────────────────────────────────────────────────────────
function getEmail()     { return JSON.parse(sessionStorage.getItem('usuarioActual')).email; }
function getFacturas()  { return JSON.parse(localStorage.getItem(`facturas_${getEmail()}`)) || []; }
function saveFacturas(f){ localStorage.setItem(`facturas_${getEmail()}`, JSON.stringify(f)); }
function getNotas()     { return JSON.parse(localStorage.getItem(`notas_${getEmail()}`)) || []; }

function fmt(n) {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}

// ──────────────────────────────────────────────────────────────
// FASE 1: BADGES DE NOTAS ASOCIADAS
// Construye los badges visuales para una factura
// ──────────────────────────────────────────────────────────────
function buildBadgesNotas(factura) {
    const ids = factura.notasAplicadas || [];
    if (ids.length === 0) return '';

    const notas  = getNotas();
    const nc     = ids.filter(id => notas.find(n => n.id === id && n.tipo === 'credito')).length;
    const nd     = ids.filter(id => notas.find(n => n.id === id && n.tipo === 'debito')).length;

    let html = '<div class="factura-notas-badges">';
    if (nc > 0) html += `<span class="nota-mini-badge badge-nc" title="Notas Crédito asociadas">NC ×${nc}</span>`;
    if (nd > 0) html += `<span class="nota-mini-badge badge-nd" title="Notas Débito asociadas">ND ×${nd}</span>`;
    html += '</div>';
    return html;
}

// ──────────────────────────────────────────────────────────────
// FASE 2: VALIDAR ELIMINACIÓN — no se puede borrar factura con notas
// ──────────────────────────────────────────────────────────────
function puedeEliminarFactura(factura) {
    const ids = factura.notasAplicadas || [];
    if (ids.length === 0) return true;
    // Verificar que aún existan esas notas en storage
    const notas = getNotas();
    return !ids.some(id => notas.find(n => n.id === id));
}

// ──────────────────────────────────────────────────────────────
// RENDERIZAR TABLA (usada tanto en carga inicial como en filtros)
// ──────────────────────────────────────────────────────────────
function renderizarFilasFacturas(facturas) {
    const tbody = document.getElementById('historialTableBody');
    tbody.innerHTML = '';

    facturas.forEach(factura => {
        const numeroCompleto = `${factura.prefijo}-${String(factura.numero).padStart(5, '0')}`;

        // FASE 1: calcular saldo ajustado
        const nc = factura.saldoAplicadoNC || 0;
        const nd = factura.saldoAplicadoND || 0;
        const totalAjustado = factura.total - nc + nd;
        const tieneNotas    = (factura.notasAplicadas || []).length > 0;

        // FASE 2: bloquear eliminar si tiene notas vigentes
        const bloqueado = !puedeEliminarFactura(factura);

        const row = `
            <tr>
                <td>
                    <div class="factura-num-col">
                        <span class="factura-numero">${numeroCompleto}</span>
                        ${buildBadgesNotas(factura)}
                    </div>
                </td>
                <td>${factura.fecha}</td>
                <td>${factura.cliente.nombre}</td>
                <td>$${fmt(factura.subtotal)}</td>
                <td>$${fmt(factura.iva)}</td>
                <td>
                    <div class="total-col">
                        <strong>$${fmt(factura.total)}</strong>
                        ${tieneNotas ? `<span class="total-ajustado" title="Total ajustado con notas">≈ $${fmt(totalAjustado)}</span>` : ''}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick='verFactura(${JSON.stringify(factura).replace(/'/g, "&#39;")})' title="Ver detalle">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>

                        <!-- Dropdown Nota Crédito / Débito -->
                        <div class="nota-dropdown" id="dd_${factura.id}">
                            <button class="action-btn nota" onclick="toggleNotaDropdown('${factura.id}')" title="Generar nota">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>
                            </button>
                            <div class="nota-dropdown-menu">
                                <div class="nota-dropdown-item nc" onclick="crearNota('${factura.id}','credito')">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                    Nota Crédito
                                </div>
                                <div class="nota-dropdown-item nd" onclick="crearNota('${factura.id}','debito')">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                    Nota Débito
                                </div>
                            </div>
                        </div>

                        <button class="action-btn delete ${bloqueado ? 'action-btn-disabled' : ''}"
                            onclick='eliminarFactura("${factura.id}")'
                            title="${bloqueado ? 'No se puede eliminar: tiene notas asociadas' : 'Eliminar factura'}"
                            ${bloqueado ? 'disabled' : ''}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ──────────────────────────────────────────────────────────────
// CARGAR FACTURAS (carga inicial)
// ──────────────────────────────────────────────────────────────
function cargarFacturas() {
    let facturas = getFacturas();
    facturas.sort((a, b) => new Date(b.id) - new Date(a.id));

    const table      = document.getElementById('historialTable');
    const emptyState = document.getElementById('emptyState');

    if (facturas.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';
    renderizarFilasFacturas(facturas);
}

// ──────────────────────────────────────────────────────────────
// FASE 3: VER FACTURA — modal completo con notas asociadas
// ──────────────────────────────────────────────────────────────
function verFactura(factura) {
    const notas = getNotas().filter(n => n.facturaId === factura.id);
    const nc    = factura.saldoAplicadoNC || 0;
    const nd    = factura.saldoAplicadoND || 0;
    const totalAjustado = factura.total - nc + nd;

    // --- Tabla de ítems ---
    const itemsHtml = (factura.items || []).map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${item.descripcion || item.nombre || '—'}</td>
            <td style="text-align:center">${item.cantidad}</td>
            <td style="text-align:right">$${fmt(item.precioUnitario)}</td>
            <td style="text-align:center">${item.tarifaIva || item.iva || 0}%</td>
            <td style="text-align:right">$${fmt(item.subtotal || item.subtotalItem || 0)}</td>
        </tr>
    `).join('');

    // --- Sección notas asociadas (FASE 3) ---
    let notasHtml = '';
    if (notas.length > 0) {
        const filas = notas.map(n => {
            const badgeCls   = n.tipo === 'credito' ? 'badge-nc' : 'badge-nd';
            const badgeLabel = n.tipo === 'credito' ? 'NC' : 'ND';
            const signo      = n.tipo === 'credito' ? '−' : '+';
            const colorClass = n.tipo === 'credito' ? 'valor-nc' : 'valor-nd';
            return `
                <tr>
                    <td><strong>${n.numero}</strong></td>
                    <td><span class="nota-badge ${badgeCls}">${badgeLabel}</span></td>
                    <td>${n.fecha}</td>
                    <td>${n.motivoLabel || '—'}</td>
                    <td class="${colorClass}" style="text-align:right"><strong>${signo}$${fmt(n.totalNota)}</strong></td>
                    <td>
                        <button class="nota-accion-btn pdf" onclick="exportarNotaPDF('${n.id}')" title="Descargar PDF">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        notasHtml = `
            <div class="detalle-seccion-notas">
                <div class="detalle-seccion-titulo notas-titulo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    Notas Asociadas (${notas.length})
                </div>
                <table class="detalle-tabla-notas">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Tipo</th>
                            <th>Fecha</th>
                            <th>Motivo DIAN</th>
                            <th>Valor</th>
                            <th>PDF</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>

                <div class="detalle-resumen-ajuste">
                    <div class="resumen-fila"><span>Total original factura</span><span>$${fmt(factura.total)}</span></div>
                    ${nc > 0 ? `<div class="resumen-fila valor-nc"><span>Notas Crédito aplicadas</span><span>−$${fmt(nc)}</span></div>` : ''}
                    ${nd > 0 ? `<div class="resumen-fila valor-nd"><span>Notas Débito aplicadas</span><span>+$${fmt(nd)}</span></div>` : ''}
                    <div class="resumen-fila resumen-total"><span>Total ajustado</span><span>$${fmt(totalAjustado)}</span></div>
                </div>
            </div>
        `;
    }

    // --- Construir modal ---
    const numeroCompleto = `${factura.prefijo}-${String(factura.numero).padStart(5, '0')}`;
    const existente = document.getElementById('modalDetalleFactura');
    if (existente) existente.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'modalDetalleFactura';
    overlay.className = 'nota-modal-overlay';
    overlay.innerHTML = `
        <div class="nota-modal nota-modal-detalle-factura" onclick="event.stopPropagation()">
            <div class="nota-modal-header">
                <div>
                    <h2>Factura <span class="factura-numero-modal">${numeroCompleto}</span></h2>
                    <p>Cliente: <strong>${factura.cliente.nombre}</strong> · Fecha: ${factura.fecha}</p>
                </div>
                <button class="nota-modal-close" onclick="document.getElementById('modalDetalleFactura').remove()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div class="nota-modal-body">
                <!-- Info cliente -->
                <div class="detalle-cliente-card">
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Documento</span>
                        <span class="detalle-info-valor">${factura.cliente.tipoDocumento || 'NIT'} ${factura.cliente.numeroDocumento || '—'}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Teléfono</span>
                        <span class="detalle-info-valor">${factura.cliente.telefono || 'No registrado'}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Email</span>
                        <span class="detalle-info-valor">${factura.cliente.email || 'No registrado'}</span>
                    </div>
                    <div class="detalle-info-item">
                        <span class="detalle-info-label">Dirección</span>
                        <span class="detalle-info-valor">${factura.cliente.direccion || 'No registrada'}</span>
                    </div>
                </div>

                <!-- Productos -->
                <div class="detalle-seccion-titulo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect></svg>
                    Productos / Servicios
                </div>
                <table class="detalle-tabla-items">
                    <thead>
                        <tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>IVA</th><th>Subtotal</th></tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>

                <!-- Totales -->
                <div class="detalle-totales">
                    <div class="detalle-total-fila"><span>Subtotal</span><span>$${fmt(factura.subtotal)}</span></div>
                    <div class="detalle-total-fila"><span>IVA Total</span><span>$${fmt(factura.iva)}</span></div>
                    <div class="detalle-total-fila detalle-total-final"><span>TOTAL</span><span>$${fmt(factura.total)}</span></div>
                </div>

                <!-- FASE 3: Notas asociadas -->
                ${notasHtml}
            </div>

            <div class="nota-modal-footer">
                <button class="btn-nota-ghost" onclick="document.getElementById('modalDetalleFactura').remove()">Cerrar</button>
                <button class="btn-nota-secondary" onclick="crearNota('${factura.id}','credito'); document.getElementById('modalDetalleFactura').remove();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Nueva Nota Crédito
                </button>
                <button class="btn-nota-secondary nd-btn" onclick="crearNota('${factura.id}','debito'); document.getElementById('modalDetalleFactura').remove();">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Nueva Nota Débito
                </button>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR FACTURA — FASE 2: validación
// ──────────────────────────────────────────────────────────────
function eliminarFactura(facturaId) {
    const facturas = getFacturas();
    const factura  = facturas.find(f => f.id === facturaId);

    if (!factura) return;

    // FASE 2: bloquear si tiene notas vigentes
    if (!puedeEliminarFactura(factura)) {
        mostrarToast('No se puede eliminar: esta factura tiene notas crédito o débito asociadas. Elimina primero las notas.', 'error');
        return;
    }

    if (!confirm('¿Está seguro de que desea eliminar esta factura?\nEsta acción no se puede deshacer.')) return;

    const nuevas = facturas.filter(f => f.id !== facturaId);
    saveFacturas(nuevas);
    cargarFacturas();
    actualizarEstadisticas();
}

// ──────────────────────────────────────────────────────────────
// FILTRAR FACTURAS — FASE 3: filtro "con notas"
// ──────────────────────────────────────────────────────────────
function filtrarFacturas() {
    const searchTerm  = document.getElementById('searchFactura')?.value.toLowerCase() || '';
    const soloConNotas = document.getElementById('filtroConNotas')?.checked || false;

    let facturas = getFacturas().sort((a, b) => new Date(b.id) - new Date(a.id));

    if (searchTerm) {
        facturas = facturas.filter(f => {
            const num     = `${f.prefijo}-${String(f.numero).padStart(5, '0')}`.toLowerCase();
            const cliente = (f.cliente?.nombre || '').toLowerCase();
            return num.includes(searchTerm) || cliente.includes(searchTerm);
        });
    }

    // FASE 3: filtro adicional "solo con notas"
    if (soloConNotas) {
        facturas = facturas.filter(f => (f.notasAplicadas || []).length > 0);
    }

    const table      = document.getElementById('historialTable');
    const emptyState = document.getElementById('emptyState');

    if (facturas.length === 0) {
        table.style.display = 'none';
        const h3 = emptyState.querySelector('h3');
        const p  = emptyState.querySelector('p');
        const btn = emptyState.querySelector('button');
        if (h3) h3.textContent = 'No se encontraron facturas';
        if (p)  p.textContent  = 'Intenta con otros criterios de búsqueda';
        if (btn) btn.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';
    renderizarFilasFacturas(facturas);
}

// ──────────────────────────────────────────────────────────────
// ESTADÍSTICAS — FASE 3: añade conteo de notas del mes
// ──────────────────────────────────────────────────────────────
function actualizarEstadisticas() {
    const facturas = getFacturas();
    const notas    = getNotas();

    const totalFacturas = facturas.length;
    const totalVendido  = facturas.reduce((s, f) => s + f.total, 0);

    const mesActual  = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    const facturasMes = facturas.filter(f => {
        const fecha = new Date(f.id);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
    });

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('totalFacturas', totalFacturas);
    setEl('totalVendido',  `$${fmt(totalVendido)}`);
    setEl('totalMes',      facturasMes.length);

    // FASE 3: stat adicional de notas (si existe el elemento)
    const notasMes = notas.filter(n => {
        const fecha = new Date(n.fechaRegistro || n.fecha);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
    });
    setEl('totalNotasMes', notasMes.length);
}

// ──────────────────────────────────────────────────────────────
// INTEGRACIÓN NOTAS — dropdown + crear
// ──────────────────────────────────────────────────────────────
function toggleNotaDropdown(facturaId) {
    document.querySelectorAll('.nota-dropdown.open').forEach(d => {
        if (d.id !== 'dd_' + facturaId) d.classList.remove('open');
    });
    const dd = document.getElementById('dd_' + facturaId);
    if (dd) dd.classList.toggle('open');
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('.nota-dropdown')) {
        document.querySelectorAll('.nota-dropdown.open').forEach(d => d.classList.remove('open'));
    }
});

function crearNota(facturaId, tipo) {
    document.querySelectorAll('.nota-dropdown.open').forEach(d => d.classList.remove('open'));

    if (typeof window.abrirModalCrearNota === 'function') {
        window.abrirModalCrearNota(facturaId, tipo);
    } else {
        window.location.href = `notas.html?facturaId=${facturaId}&tipo=${tipo}`;
    }
}

// ──────────────────────────────────────────────────────────────
// EXPORTAR PDF — carga jsPDF bajo demanda si no está disponible
// ──────────────────────────────────────────────────────────────
function exportarNotaPDF(id) {
    // Si jsPDF ya está disponible (página de notas), llamar directo
    if (window.jspdf) {
        _generarPDFNota(id);
        return;
    }

    // Si notas.js tiene la función exportarNotaPDF, usarla
    if (typeof window.exportarNotaPDFExterno === 'function') {
        window.exportarNotaPDFExterno(id);
        return;
    }

    // Cargar jsPDF dinámicamente y luego generar
    mostrarToast('Preparando PDF…', 'info');

    const scripts = [
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
    ];

    cargarScriptsSecuencial(scripts, 0, () => {
        _generarPDFNota(id);
    });
}

function cargarScriptsSecuencial(urls, index, callback) {
    if (index >= urls.length) { callback(); return; }
    const script = document.createElement('script');
    script.src = urls[index];
    script.onload  = () => cargarScriptsSecuencial(urls, index + 1, callback);
    script.onerror = () => {
        mostrarToast('Error cargando librería PDF. Intenta desde la página de Notas.', 'error');
    };
    document.head.appendChild(script);
}

// Generación de PDF (misma lógica que notas.js, autocontenida aquí)
function _generarPDFNota(id) {
    const notas = JSON.parse(localStorage.getItem(`notas_${getEmail()}`)) || [];
    const nota  = notas.find(n => n.id === id);
    if (!nota) { mostrarToast('No se encontró la nota.', 'error'); return; }

    if (!window.jspdf) { mostrarToast('Librería PDF no disponible.', 'error'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const COLOR   = nota.tipo === 'credito' ? [45, 122, 75] : [25, 118, 210];
    const BLANCO  = [255, 255, 255];
    const GRIS    = [100, 100, 100];
    const GRIS_L  = [220, 220, 220];
    const OSCURO  = [30, 30, 30];
    const PW = 210, M = 14, CW = PW - M * 2;

    // Banda superior
    doc.setFillColor(...COLOR);
    doc.rect(0, 0, PW, 30, 'F');

    const cfg = nota.config || {};
    if (cfg.logo) { try { doc.addImage(cfg.logo, 'PNG', M, 4, 22, 22); } catch {} }
    const lx = cfg.logo ? M + 26 : M;

    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(cfg.razonSocial || 'Empresa', lx, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`NIT: ${cfg.nit || ''}`, lx, 17);
    doc.text(`${cfg.direccion || ''} · Tel: ${cfg.telefono || ''}`, lx, 22);

    const tipoLabel = nota.tipo === 'credito' ? 'NOTA CRÉDITO' : 'NOTA DÉBITO';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(tipoLabel, PW - M, 11, { align: 'right' });
    doc.setFontSize(16);
    doc.text(nota.numero, PW - M, 21, { align: 'right' });

    let y = 34;

    // Fila info básica
    doc.setFillColor(245, 245, 247);
    doc.roundedRect(M, y, CW, 13, 1.5, 1.5, 'F');
    doc.setTextColor(...GRIS);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const col = CW / 3;
    doc.text('FECHA', M + 3, y + 5);
    doc.text('FACTURA DE REFERENCIA', M + col + 3, y + 5);
    doc.text('MOTIVO DIAN', M + col * 2 + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...OSCURO);
    doc.text(nota.fecha || '—', M + 3, y + 11);
    doc.text(nota.facturaRef || '—', M + col + 3, y + 11);
    const motivoCorto = doc.splitTextToSize(nota.motivoLabel || '—', col - 6);
    doc.text(motivoCorto[0], M + col * 2 + 3, y + 11);
    y += 17;

    // Bloque cliente
    doc.setFillColor(...COLOR);
    doc.roundedRect(M, y, CW, 5.5, 1, 1, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CLIENTE', M + 3, y + 4);
    y += 7;

    const c = nota.cliente || {};
    const docCliente = c.tipo === 'natural'
        ? `${c.tipoDocumento || 'CC'}: ${c.numeroDocumento || '—'}`
        : `NIT: ${c.numeroDocumento || '—'}-${c.dv || ''}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...OSCURO);
    doc.text(c.nombre || '—', M, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text(`${docCliente}   ·   ${c.email || ''}   ·   ${c.telefono || ''}`, M, y + 11);
    y += 17;

    // Tabla ítems
    doc.autoTable({
        startY: y,
        head: [['#', 'Descripción', 'Cant.', 'P. Unit.', 'Dto.', 'IVA', 'Subtotal']],
        body: (nota.items || []).map((item, i) => [
            i + 1, item.descripcion, item.cantidad,
            `$${fmt(item.precioUnitario)}`,
            item.descuento > 0 ? `${item.descuento}%` : '—',
            `${item.iva}%`,
            `$${fmt(item.subtotalItem)}`,
        ]),
        margin: { left: M, right: M },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: OSCURO, lineColor: GRIS_L, lineWidth: 0.2 },
        headStyles: { fillColor: COLOR, textColor: BLANCO, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8  },
            1: { cellWidth: 65 },
            2: { halign: 'center', cellWidth: 14 },
            3: { halign: 'right',  cellWidth: 24 },
            4: { halign: 'center', cellWidth: 14 },
            5: { halign: 'center', cellWidth: 14 },
            6: { halign: 'right',  cellWidth: 27 },
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
    });

    y = doc.lastAutoTable.finalY + 4;

    // Panel totales
    const panelW = 75, panelX = M + CW - panelW;
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(panelX, y, panelW, 40, 2, 2, 'F');

    const filaT = (lbl, val, esFinal = false) => {
        doc.setFont('helvetica', esFinal ? 'bold' : 'normal');
        doc.setFontSize(esFinal ? 9.5 : 8.5);
        doc.setTextColor(...(esFinal ? OSCURO : GRIS));
        doc.text(lbl, panelX + 3, y + 5);
        doc.text(val, panelX + panelW - 3, y + 5, { align: 'right' });
        y += 8;
    };

    y += 3;
    filaT('Subtotal', `$${fmt(nota.subtotal)}`);
    if (nota.totalDescuentos > 0) filaT('Descuentos', `-$${fmt(nota.totalDescuentos)}`);
    filaT('IVA', `$${fmt(nota.totalIva)}`);

    doc.setDrawColor(...GRIS_L);
    doc.setLineWidth(0.3);
    doc.line(panelX + 2, y - 1, panelX + panelW - 2, y - 1);
    y += 2;

    doc.setFillColor(...COLOR);
    doc.roundedRect(panelX, y - 2, panelW, 10, 1, 1, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const signo   = nota.tipo === 'credito' ? '−' : '+';
    const lFinal  = nota.tipo === 'credito' ? 'TOTAL NOTA CRÉDITO' : 'TOTAL NOTA DÉBITO';
    doc.text(lFinal, panelX + 3, y + 5);
    doc.text(`${signo}$${fmt(nota.totalNota)}`, panelX + panelW - 3, y + 5, { align: 'right' });
    y += 14;

    // Observaciones
    if (nota.observaciones) {
        const obsY = doc.lastAutoTable.finalY + 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COLOR);
        doc.text('Observaciones:', M, obsY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRIS);
        doc.text(doc.splitTextToSize(nota.observaciones, panelX - M - 4), M, obsY + 5);
    }

    // Pie
    const pH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLOR);
    doc.setLineWidth(0.8);
    doc.line(M, pH - 18, M + CW, pH - 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR);
    doc.text('Generado por Sparkles · Software Contable', PW / 2, pH - 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text(`${nota.numero} · Emitido el ${new Date().toLocaleDateString('es-CO')}`, PW / 2, pH - 7, { align: 'center' });

    doc.save(`${nota.numero}.pdf`);
    mostrarToast(`PDF descargado: ${nota.numero}`, 'success');
}

// ──────────────────────────────────────────────────────────────
// TOAST — mensajes no intrusivos (reemplaza alerts)
// ──────────────────────────────────────────────────────────────
function mostrarToast(mensaje, tipo = 'info') {
    const existente = document.getElementById('sparkles-toast');
    if (existente) existente.remove();

    const colores = {
        success: { bg: '#e6f7ed', color: '#2d7a4b', border: '#a5d6a7' },
        error:   { bg: '#ffebee', color: '#c62828', border: '#ef9a9a' },
        info:    { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
    };
    const c = colores[tipo] || colores.info;

    const toast = document.createElement('div');
    toast.id = 'sparkles-toast';
    toast.style.cssText = `
        position: fixed; bottom: 28px; right: 28px; z-index: 99999;
        background: ${c.bg}; color: ${c.color}; border: 1.5px solid ${c.border};
        padding: 14px 22px; border-radius: 12px;
        font-size: 14px; font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        animation: fadeIn 0.3s ease;
        max-width: 360px; line-height: 1.4;
    `;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// FASE 2: exponer para que notas.js refresque el historial al guardar
window.refrescarHistorialFacturas = function () {
    cargarFacturas();
    actualizarEstadisticas();
};

console.log('Historial de Facturas v2 — Fases 1-2-3 cargadas ✨');