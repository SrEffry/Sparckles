// ============================================================
// MÓDULO NOTAS DÉBITO / CRÉDITO — Sparkles
// Basado en Anexo Técnico 1.9 DIAN (Resolución 165 de 2023)
// ============================================================

// ──────────────────────────────────────────────────────────────
// MOTIVOS OFICIALES DIAN — Anexo Técnico 1.9 (vigente 2024)
// Nota Crédito: códigos 1–9 del estándar UBL DiscrepancyResponse
// Nota Débito:  códigos 1–6
// ──────────────────────────────────────────────────────────────
const MOTIVOS_CREDITO = [
    { codigo: '1',  label: 'Devolución parcial de bienes y/o no aceptación parcial del servicio' },
    { codigo: '2',  label: 'Anulación de factura electrónica de venta' },
    { codigo: '3',  label: 'Rebaja o descuento parcial o total' },
    { codigo: '4',  label: 'Ajuste de precio' },
    { codigo: '5',  label: 'Otras' },             // código genérico pre-1.9 (aún válido internamente)
    { codigo: '6',  label: 'Descuento comercial por pronto pago' },   // nuevo en 1.9
    { codigo: '7',  label: 'Descuento comercial por volumen de ventas' }, // nuevo en 1.9
];

const MOTIVOS_DEBITO = [
    { codigo: '1',  label: 'Intereses' },
    { codigo: '2',  label: 'Gastos por cobrar' },
    { codigo: '3',  label: 'Cambio del valor' },
    { codigo: '4',  label: 'Otros' },
];

// ──────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarDatosUsuario();
    setupLogout();

    // Si venimos con parámetros de URL (desde historial-facturas), abrir el modal directo
    const params  = new URLSearchParams(window.location.search);
    const factId  = params.get('facturaId');
    const tipo    = params.get('tipo'); // 'credito' | 'debito'
    if (factId && tipo) {
        abrirModalDesdeURL(factId, tipo);
    }

    renderizarHistorialNotas();
    actualizarStatsNotas();
});

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
        if (confirm('¿Cerrar sesión?')) {
            sessionStorage.removeItem('usuarioActual');
            window.location.href = '../index.html';
        }
    });
}

// ──────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ──────────────────────────────────────────────────────────────
function getEmail()   { return JSON.parse(sessionStorage.getItem('usuarioActual')).email; }
function getNotas()   { return JSON.parse(localStorage.getItem(`notas_${getEmail()}`)) || []; }
function saveNotas(n) { localStorage.setItem(`notas_${getEmail()}`, JSON.stringify(n)); }
function getFacturas(){ return JSON.parse(localStorage.getItem(`facturas_${getEmail()}`)) || []; }
function saveFacturas(f){ localStorage.setItem(`facturas_${getEmail()}`, JSON.stringify(f)); }

function fmt(n) {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}

function generarConsecutivoNota(tipo) {
    const notas  = getNotas().filter(n => n.tipo === tipo);
    const prefijo = tipo === 'credito' ? 'NC' : 'ND';
    const num    = (notas.length + 1).toString().padStart(5, '0');
    return `${prefijo}-${num}`;
}

// ──────────────────────────────────────────────────────────────
// HISTORIAL DE NOTAS
// ──────────────────────────────────────────────────────────────
function renderizarHistorialNotas(filtro = '', tipoFiltro = '') {
    let notas = getNotas().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (filtro) {
        const t = filtro.toLowerCase();
        notas = notas.filter(n =>
            (n.numero || '').toLowerCase().includes(t) ||
            (n.facturaRef || '').toLowerCase().includes(t) ||
            (n.cliente?.nombre || '').toLowerCase().includes(t)
        );
    }
    if (tipoFiltro) notas = notas.filter(n => n.tipo === tipoFiltro);

    const tabla = document.getElementById('notasTabla');
    const empty = document.getElementById('notasEmpty');
    const tbody = document.getElementById('notasTbody');

    if (!tabla) return;

    if (notas.length === 0) {
        tabla.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }

    tabla.style.display = 'table';
    empty.style.display = 'none';

    tbody.innerHTML = notas.map(n => {
        const badgeClass = n.tipo === 'credito' ? 'badge-nc' : 'badge-nd';
        const badgeLabel = n.tipo === 'credito' ? 'Nota Crédito' : 'Nota Débito';
        const signo      = n.tipo === 'credito' ? '-' : '+';
        const colorValor = n.tipo === 'credito' ? 'valor-nc' : 'valor-nd';

        return `
            <tr>
                <td><strong>${n.numero}</strong></td>
                <td><span class="nota-badge ${badgeClass}">${badgeLabel}</span></td>
                <td>${n.fecha}</td>
                <td><span class="factura-ref">${n.facturaRef || '—'}</span></td>
                <td>${n.cliente?.nombre || '—'}</td>
                <td><span class="motivo-label">${n.motivoLabel || '—'}</span></td>
                <td>$${fmt(n.subtotal)}</td>
                <td>$${fmt(n.totalIva)}</td>
                <td class="${colorValor}"><strong>${signo}$${fmt(n.totalNota)}</strong></td>
                <td>
                    <div class="nota-acciones">
                        <button class="nota-accion-btn ver" onclick="verNota('${n.id}')" title="Ver detalle">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button class="nota-accion-btn pdf" onclick="exportarNotaPDF('${n.id}')" title="Descargar PDF">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>
                        </button>
                        <button class="nota-accion-btn eliminar" onclick="eliminarNota('${n.id}')" title="Eliminar">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filtrarNotas() {
    const filtro     = document.getElementById('searchNotas')?.value.trim() || '';
    const tipoFiltro = document.getElementById('filtroTipoNota')?.value || '';
    renderizarHistorialNotas(filtro, tipoFiltro);
}

function actualizarStatsNotas() {
    const notas    = getNotas();
    const credito  = notas.filter(n => n.tipo === 'credito');
    const debito   = notas.filter(n => n.tipo === 'debito');
    const total    = notas.reduce((s, n) => s + (n.totalNota || 0), 0);

    const s = id => document.getElementById(id);
    if (s('statCredito'))   s('statCredito').textContent   = credito.length;
    if (s('statDebito'))    s('statDebito').textContent    = debito.length;
    if (s('statValorTotal'))s('statValorTotal').textContent= `$${fmt(total)}`;
}

// ──────────────────────────────────────────────────────────────
// VER NOTA (modal de detalle)
// ──────────────────────────────────────────────────────────────
function verNota(id) {
    const nota = getNotas().find(n => n.id === id);
    if (!nota) return;

    const signo = nota.tipo === 'credito' ? '−' : '+';
    const html  = `
        <div class="nota-detalle-header">
            <div>
                <h3>${nota.numero}</h3>
                <span class="nota-badge ${nota.tipo === 'credito' ? 'badge-nc' : 'badge-nd'}">
                    ${nota.tipo === 'credito' ? 'Nota Crédito' : 'Nota Débito'}
                </span>
            </div>
            <div class="nota-detalle-fecha">Fecha: ${nota.fecha}</div>
        </div>

        <div class="nota-detalle-grid">
            <div class="nota-info-bloque">
                <p class="nota-info-label">Factura de referencia</p>
                <p class="nota-info-valor">${nota.facturaRef || '—'}</p>
            </div>
            <div class="nota-info-bloque">
                <p class="nota-info-label">Motivo DIAN</p>
                <p class="nota-info-valor">${nota.motivoLabel}</p>
            </div>
            <div class="nota-info-bloque nota-info-full">
                <p class="nota-info-label">Cliente</p>
                <p class="nota-info-valor">${nota.cliente?.nombre || '—'} &nbsp; <span style="color:#86868b;font-size:13px">${nota.cliente?.documento || ''}</span></p>
            </div>
            ${nota.observaciones ? `
            <div class="nota-info-bloque nota-info-full">
                <p class="nota-info-label">Observaciones</p>
                <p class="nota-info-valor">${nota.observaciones}</p>
            </div>` : ''}
        </div>

        <table class="nota-detalle-tabla">
            <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Dto.</th><th>IVA</th><th>Subtotal</th></tr></thead>
            <tbody>
                ${(nota.items || []).map((item, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${item.descripcion}</td>
                        <td>${item.cantidad}</td>
                        <td>$${fmt(item.precioUnitario)}</td>
                        <td>${item.descuento > 0 ? item.descuento + '%' : '—'}</td>
                        <td>${item.iva}%</td>
                        <td>$${fmt(item.subtotalItem)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="nota-detalle-totales">
            <div class="nota-total-fila"><span>Subtotal</span><span>$${fmt(nota.subtotal)}</span></div>
            ${nota.totalDescuentos > 0 ? `<div class="nota-total-fila"><span>Descuentos</span><span>−$${fmt(nota.totalDescuentos)}</span></div>` : ''}
            <div class="nota-total-fila"><span>IVA</span><span>$${fmt(nota.totalIva)}</span></div>
            <div class="nota-total-fila nota-total-final">
                <span>${nota.tipo === 'credito' ? 'TOTAL NOTA CRÉDITO' : 'TOTAL NOTA DÉBITO'}</span>
                <span>${signo}$${fmt(nota.totalNota)}</span>
            </div>
        </div>
    `;

    mostrarModalDetalle(html, nota);
}

function mostrarModalDetalle(html, nota) {
    // Crear modal dinámicamente
    const existente = document.getElementById('modalDetalleNota');
    if (existente) existente.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'modalDetalleNota';
    overlay.className = 'nota-modal-overlay';
    overlay.innerHTML = `
        <div class="nota-modal" onclick="event.stopPropagation()">
            <div class="nota-modal-header">
                <h2>Detalle de Nota</h2>
                <button class="nota-modal-close" onclick="document.getElementById('modalDetalleNota').remove()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="nota-modal-body">${html}</div>
            <div class="nota-modal-footer">
                <button class="btn-nota-ghost" onclick="document.getElementById('modalDetalleNota').remove()">Cerrar</button>
                <button class="btn-nota-primary" onclick="exportarNotaPDF('${nota.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Descargar PDF
                </button>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// ──────────────────────────────────────────────────────────────
// ELIMINAR NOTA
// ──────────────────────────────────────────────────────────────
function eliminarNota(id) {
    if (!confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;

    const nota     = getNotas().find(n => n.id === id);
    const nuevas   = getNotas().filter(n => n.id !== id);
    saveNotas(nuevas);

    // Revertir el efecto en la factura original si la hay
    if (nota?.facturaId) {
        const facturas = getFacturas();
        const factura  = facturas.find(f => f.id === nota.facturaId);
        if (factura) {
            factura.notasAplicadas = (factura.notasAplicadas || []).filter(nid => nid !== id);
            if (nota.tipo === 'credito') {
                factura.saldoAplicadoNC = Math.max(0, (factura.saldoAplicadoNC || 0) - nota.totalNota);
            } else {
                factura.saldoAplicadoND = Math.max(0, (factura.saldoAplicadoND || 0) - nota.totalNota);
            }
            saveFacturas(facturas);
        }
    }

    renderizarHistorialNotas();
    actualizarStatsNotas();
    console.log('🗑️ Nota eliminada:', id);
}

// ──────────────────────────────────────────────────────────────
// ABRIR MODAL CREAR NOTA (llamado desde historial-facturas.js)
// ──────────────────────────────────────────────────────────────

// Función pública exportable — se llama también desde historial-facturas.js
window.abrirModalCrearNota = function(facturaId, tipoNota) {
    const facturas = getFacturas();
    const factura  = facturas.find(f => f.id === facturaId);

    if (!factura) {
        alert('No se encontró la factura.');
        return;
    }

    const tipo     = tipoNota || 'credito';
    const motivos  = tipo === 'credito' ? MOTIVOS_CREDITO : MOTIVOS_DEBITO;
    const label    = tipo === 'credito' ? 'Nota Crédito' : 'Nota Débito';
    const badgeCls = tipo === 'credito' ? 'badge-nc' : 'badge-nd';

    // Pre-cargar ítems de la factura
    const itemsPreCargados = (factura.items || []).map(item => ({
        ...item,
        cantidad:       item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento:      item.descuentoPorcentaje || 0,
        iva:            item.tarifaIva || 0,
        subtotalItem:   item.base || 0,
    }));

    const clienteNombre = factura.cliente?.nombre || '—';
    const clienteDoc    = factura.cliente?.tipo === 'natural'
        ? `${factura.cliente.tipoDocumento} ${factura.cliente.numeroDocumento}`
        : `NIT ${factura.cliente.numeroDocumento}-${factura.cliente.dv || ''}`;

    const existente = document.getElementById('modalCrearNota');
    if (existente) existente.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'modalCrearNota';
    overlay.className = 'nota-modal-overlay';
    overlay.innerHTML = `
        <div class="nota-modal nota-modal-crear" onclick="event.stopPropagation()">
            <div class="nota-modal-header">
                <div>
                    <h2>Nueva <span class="nota-badge ${badgeCls}">${label}</span></h2>
                    <p>Sobre factura: <strong>${factura.prefijo}-${String(factura.numero).padStart(5,'0')}</strong></p>
                </div>
                <button class="nota-modal-close" onclick="document.getElementById('modalCrearNota').remove()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="nota-modal-body">
                <div id="mensajeErrorNota" class="nota-msg-error" style="display:none;"></div>

                <!-- Info factura original -->
                <div class="nota-factura-ref-card">
                    <div class="nota-ref-item">
                        <span class="nota-ref-label">Cliente</span>
                        <span class="nota-ref-valor">${clienteNombre} &nbsp;·&nbsp; ${clienteDoc}</span>
                    </div>
                    <div class="nota-ref-item">
                        <span class="nota-ref-label">Fecha factura</span>
                        <span class="nota-ref-valor">${factura.fecha}</span>
                    </div>
                    <div class="nota-ref-item">
                        <span class="nota-ref-label">Total factura</span>
                        <span class="nota-ref-valor"><strong>$${fmt(factura.total)}</strong></span>
                    </div>
                </div>

                <!-- Campos encabezado nota -->
                <div class="nota-form-grid">
                    <div class="nota-field">
                        <label>Motivo DIAN <span class="req">*</span></label>
                        <select id="nMotivo">
                            <option value="">— Seleccionar motivo —</option>
                            ${motivos.map(m => `<option value="${m.codigo}" data-label="${m.label}">${m.codigo}. ${m.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="nota-field">
                        <label>Fecha de elaboración <span class="req">*</span></label>
                        <input type="date" id="nFecha" value="${new Date().toISOString().split('T')[0]}">
                        <small class="nota-hint">Debe coincidir con la fecha de envío a la DIAN (Res. 165/2023)</small>
                    </div>
                </div>

                <!-- Ítems -->
                <div class="nota-seccion-titulo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect></svg>
                    Productos / Servicios
                    <small>${tipo === 'credito' ? '(modifica cantidades o valores a devolver/ajustar)' : '(agrega o modifica valores adicionales a cobrar)'}</small>
                </div>

                <div id="notaItemsContainer">
                    ${renderizarItemsNota(itemsPreCargados, tipo)}
                </div>

                <button type="button" class="btn-agregar-item-nota" onclick="agregarItemNota('${tipo}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Agregar ítem
                </button>

                <!-- Observaciones + Totales -->
                <div class="nota-bottom-grid">
                    <div class="nota-obs-field">
                        <label>Observaciones / Razón interna</label>
                        <textarea id="nObservaciones" rows="3" placeholder="Descripción adicional del ajuste..."></textarea>
                    </div>
                    <div class="nota-totales-panel" id="notaTotalesPanel">
                        <div class="nota-total-fila"><span>Subtotal</span><span id="nTSubtotal">$0,00</span></div>
                        <div class="nota-total-fila"><span>IVA</span><span id="nTIva">$0,00</span></div>
                        <div class="nota-total-fila nota-total-final">
                            <span>${tipo === 'credito' ? 'TOTAL NOTA CRÉDITO' : 'TOTAL NOTA DÉBITO'}</span>
                            <span id="nTTotal">$0,00</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="nota-modal-footer">
                <button class="btn-nota-ghost" onclick="document.getElementById('modalCrearNota').remove()">Cancelar</button>
                <button class="btn-nota-primary" onclick="guardarNota('${facturaId}','${tipo}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Generar ${label}
                </button>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    // Calcular totales iniciales
    calcularTotalesNota();
}

// ──────────────────────────────────────────────────────────────
// ÍTEMS DEL FORMULARIO
// ──────────────────────────────────────────────────────────────
let _notaItemsTemp = []; // estado temporal de ítems del modal

function renderizarItemsNota(items, tipo) {
    _notaItemsTemp = items.map((item, i) => ({
        id:             i,
        descripcion:    item.descripcion || item.nombre || '',
        cantidad:       item.cantidad    || 1,
        precioUnitario: item.precioUnitario || 0,
        descuento:      item.descuento   || item.descuentoPorcentaje || 0,
        iva:            item.iva         || item.tarifaIva || 0,
    }));

    return construirHTMLItems(tipo);
}

function construirHTMLItems(tipo) {
    if (_notaItemsTemp.length === 0) return '<p class="sin-items-nota">Sin ítems</p>';

    const esCredito = tipo === 'credito';

    return _notaItemsTemp.map((item, i) => `
        <div class="nota-item-fila" data-idx="${i}">
            <span class="nota-item-num">${i + 1}</span>
            <div class="nota-item-desc">
                <input type="text" value="${item.descripcion}" placeholder="Descripción"
                    oninput="actualizarItemNota(${i},'descripcion',this.value)">
            </div>
            <div class="nota-item-campo">
                <label>${esCredito ? 'Cant. a devolver' : 'Cantidad'}</label>
                <input type="number" min="0" step="0.01" value="${item.cantidad}"
                    oninput="actualizarItemNota(${i},'cantidad',this.value)">
            </div>
            <div class="nota-item-campo">
                <label>P. Unit.</label>
                <input type="number" min="0" step="0.01" value="${item.precioUnitario}"
                    oninput="actualizarItemNota(${i},'precioUnitario',this.value)">
            </div>
            <div class="nota-item-campo">
                <label>Dto %</label>
                <input type="number" min="0" max="100" step="0.1" value="${item.descuento}"
                    oninput="actualizarItemNota(${i},'descuento',this.value)">
            </div>
            <div class="nota-item-campo">
                <label>IVA %</label>
                <select oninput="actualizarItemNota(${i},'iva',this.value)">
                    <option value="0"  ${item.iva==0  ?'selected':''}>0%</option>
                    <option value="5"  ${item.iva==5  ?'selected':''}>5%</option>
                    <option value="19" ${item.iva==19 ?'selected':''}>19%</option>
                </select>
            </div>
            <div class="nota-item-campo nota-item-sub">
                <label>Subtotal</label>
                <span>$${fmt(calcSubItem(item))}</span>
            </div>
            <button class="nota-item-del" onclick="eliminarItemNota(${i},'${tipo}')" title="Eliminar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `).join('');
}

function calcSubItem(item) {
    const base = (item.cantidad || 0) * (item.precioUnitario || 0);
    const dto  = base * ((item.descuento || 0) / 100);
    const neto = base - dto;
    return neto + neto * ((item.iva || 0) / 100);
}

function actualizarItemNota(idx, campo, valor) {
    if (!_notaItemsTemp[idx]) return;
    _notaItemsTemp[idx][campo] = ['cantidad','precioUnitario','descuento','iva'].includes(campo)
        ? parseFloat(valor) || 0
        : valor;
    // Actualizar subtotal de la fila sin rebuilding total
    const fila = document.querySelector(`.nota-item-fila[data-idx="${idx}"] .nota-item-sub span`);
    if (fila) fila.textContent = `$${fmt(calcSubItem(_notaItemsTemp[idx]))}`;
    calcularTotalesNota();
}

function eliminarItemNota(idx, tipo) {
    _notaItemsTemp.splice(idx, 1);
    const container = document.getElementById('notaItemsContainer');
    if (container) container.innerHTML = construirHTMLItems(tipo);
    calcularTotalesNota();
}

function agregarItemNota(tipo) {
    _notaItemsTemp.push({ id: Date.now(), descripcion:'', cantidad:1, precioUnitario:0, descuento:0, iva:19 });
    const container = document.getElementById('notaItemsContainer');
    if (container) container.innerHTML = construirHTMLItems(tipo);
    calcularTotalesNota();
}

function calcularTotalesNota() {
    let subtotal = 0, totalIva = 0;

    _notaItemsTemp.forEach(item => {
        const base = item.cantidad * item.precioUnitario;
        const dto  = base * (item.descuento / 100);
        const neto = base - dto;
        subtotal  += neto;
        totalIva  += neto * (item.iva / 100);
    });

    const total = subtotal + totalIva;
    const set   = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('nTSubtotal', `$${fmt(subtotal)}`);
    set('nTIva',      `$${fmt(totalIva)}`);
    set('nTTotal',    `$${fmt(total)}`);
}

// ──────────────────────────────────────────────────────────────
// GUARDAR NOTA
// ──────────────────────────────────────────────────────────────
function guardarNota(facturaId, tipo) {
    const motivoSelect = document.getElementById('nMotivo');
    const fecha        = document.getElementById('nFecha')?.value;
    const obs          = document.getElementById('nObservaciones')?.value.trim() || '';

    if (!motivoSelect?.value) {
        mostrarErrorNota('Selecciona el motivo DIAN de la nota.');
        return;
    }
    if (!fecha) {
        mostrarErrorNota('La fecha de elaboración es obligatoria.');
        return;
    }
    if (_notaItemsTemp.length === 0 || !_notaItemsTemp.some(i => i.descripcion.trim() || i.precioUnitario > 0)) {
        mostrarErrorNota('Agrega al menos un ítem con descripción o valor.');
        return;
    }

    const motivoLabel = motivoSelect.options[motivoSelect.selectedIndex].dataset.label;

    // Calcular totales
    let subtotal = 0, totalDescuentos = 0, totalIva = 0;
    const itemsFinales = _notaItemsTemp.map(item => {
        const base       = item.cantidad * item.precioUnitario;
        const dto        = base * (item.descuento / 100);
        const neto       = base - dto;
        const ivaValor   = neto * (item.iva / 100);
        const subItem    = neto + ivaValor;
        subtotal        += neto;
        totalDescuentos += dto;
        totalIva        += ivaValor;
        return { ...item, subtotalItem: subItem };
    });
    const totalNota = subtotal + totalIva;

    // Buscar factura original
    const facturas  = getFacturas();
    const factura   = facturas.find(f => f.id === facturaId);
    const factRef   = factura ? `${factura.prefijo}-${String(factura.numero).padStart(5,'0')}` : '';

    const nota = {
        id:             Date.now().toString() + Math.random().toString(36).slice(2, 6),
        numero:         generarConsecutivoNota(tipo),
        tipo,
        fecha,
        facturaId,
        facturaRef:     factRef,
        motivoCodigo:   motivoSelect.value,
        motivoLabel,
        cliente:        factura?.cliente || null,
        config:         factura?.config  || null,
        items:          itemsFinales,
        subtotal,
        totalDescuentos,
        totalIva,
        totalNota,
        observaciones:  obs,
        fechaRegistro:  new Date().toISOString(),
    };

    // Guardar nota
    const notas = getNotas();
    notas.push(nota);
    saveNotas(notas);

    // Registrar en la factura original que se le aplicó una nota
    if (factura) {
        factura.notasAplicadas = [...(factura.notasAplicadas || []), nota.id];
        if (tipo === 'credito') {
            factura.saldoAplicadoNC = (factura.saldoAplicadoNC || 0) + totalNota;
        } else {
            factura.saldoAplicadoND = (factura.saldoAplicadoND || 0) + totalNota;
        }
        saveFacturas(facturas);
    }

    document.getElementById('modalCrearNota')?.remove();

    // Refrescar historial si estamos en la página de notas
    renderizarHistorialNotas();
    actualizarStatsNotas();

    // Exportar PDF automáticamente al guardar
    exportarNotaPDF(nota.id);

    console.log(`✅ ${tipo === 'credito' ? 'Nota Crédito' : 'Nota Débito'} generada:`, nota.numero);
}

function mostrarErrorNota(msg) {
    const el = document.getElementById('mensajeErrorNota');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ──────────────────────────────────────────────────────────────
// EXPORTAR PDF CON jsPDF
// ──────────────────────────────────────────────────────────────
function exportarNotaPDF(id) {
    const nota = getNotas().find(n => n.id === id);
    if (!nota) return;

    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Paleta
    const ROJO    = nota.tipo === 'credito' ? [45, 122, 75]  : [25, 118, 210]; // verde NC / azul ND
    const BLANCO  = [255, 255, 255];
    const GRIS    = [100, 100, 100];
    const GRIS_L  = [220, 220, 220];
    const OSCURO  = [30, 30, 30];
    const PW = 210, M = 14, CW = PW - M * 2;

    // ── Banda superior ──
    doc.setFillColor(...ROJO);
    doc.rect(0, 0, PW, 30, 'F');

    // Datos empresa (izq)
    const cfg = nota.config || {};
    if (cfg.logo) {
        try { doc.addImage(cfg.logo, 'PNG', M, 4, 22, 22); } catch {}
    }
    const lx = cfg.logo ? M + 26 : M;
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(cfg.razonSocial || 'Empresa', lx, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`NIT: ${cfg.nit || ''}`, lx, 17);
    doc.text(`${cfg.direccion || ''} · Tel: ${cfg.telefono || ''}`, lx, 22);

    // Tipo nota (der)
    const tipoLabel = nota.tipo === 'credito' ? 'NOTA CRÉDITO' : 'NOTA DÉBITO';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(tipoLabel, PW - M, 11, { align: 'right' });
    doc.setFontSize(16);
    doc.text(nota.numero, PW - M, 21, { align: 'right' });

    let y = 34;

    // ── Fila info básica ──
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

    // ── Bloque cliente ──
    doc.setFillColor(...ROJO);
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

    // ── Tabla ítems ──
    doc.autoTable({
        startY: y,
        head: [['#', 'Descripción', 'Cant.', 'P. Unit.', 'Dto.', 'IVA', 'Subtotal']],
        body: (nota.items || []).map((item, i) => [
            i + 1,
            item.descripcion,
            item.cantidad,
            `$${fmt(item.precioUnitario)}`,
            item.descuento > 0 ? `${item.descuento}%` : '—',
            `${item.iva}%`,
            `$${fmt(item.subtotalItem)}`,
        ]),
        margin: { left: M, right: M },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: OSCURO, lineColor: GRIS_L, lineWidth: 0.2 },
        headStyles: { fillColor: ROJO, textColor: BLANCO, fontStyle: 'bold', fontSize: 7.5 },
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

    // ── Panel totales ──
    const panelW = 75;
    const panelX = M + CW - panelW;

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

    doc.setFillColor(...ROJO);
    doc.roundedRect(panelX, y - 2, panelW, 10, 1, 1, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const lFinal = nota.tipo === 'credito' ? 'TOTAL NOTA CRÉDITO' : 'TOTAL NOTA DÉBITO';
    const signo  = nota.tipo === 'credito' ? '−' : '+';
    doc.text(lFinal, panelX + 3, y + 5);
    doc.text(`${signo}$${fmt(nota.totalNota)}`, panelX + panelW - 3, y + 5, { align: 'right' });
    y += 14;

    // ── Observaciones ──
    if (nota.observaciones) {
        const obsY   = doc.lastAutoTable.finalY + 8;
        const obsMaxW = panelX - M - 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...ROJO.map ? ROJO : [128, 25, 49]);
        doc.text('Observaciones:', M, obsY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRIS);
        doc.text(doc.splitTextToSize(nota.observaciones, obsMaxW), M, obsY + 5);
    }

    // ── Pie ──
    const pH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...ROJO);
    doc.setLineWidth(0.8);
    doc.line(M, pH - 18, M + CW, pH - 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...ROJO);
    doc.text('Generado por Sparkles · Software Contable', PW / 2, pH - 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text(`${nota.numero} · Emitido el ${new Date().toLocaleDateString('es-CO')}`, PW / 2, pH - 7, { align: 'center' });

    doc.save(`${nota.numero}.pdf`);
    console.log(`✅ PDF generado: ${nota.numero}`);
}

// ──────────────────────────────────────────────────────────────
// APERTURA DESDE URL (historial-facturas.html → notas.html)
// ──────────────────────────────────────────────────────────────
function abrirModalDesdeURL(facturaId, tipo) {
    // Esperar a que el DOM esté listo
    setTimeout(() => {
        window.abrirModalCrearNota(facturaId, tipo);
    }, 200);
}

console.log('📄 Módulo Notas Débito/Crédito — Sparkles cargado');