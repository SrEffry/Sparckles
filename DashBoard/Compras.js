// ============================================================
// MÓDULO DE COMPRAS — Sparkles
// Gestión completa: crear, historial, importar/exportar Excel
// ============================================================

let itemsCompra       = [];     // ítems del formulario activo
let compraEditandoId  = null;   // null = nueva, string = edición

// ──────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // El módulo se activa cuando el usuario abre el tab de compras
    // para no hacer trabajo innecesario en carga inicial
});

/** Llamado desde cambiarTab('compras') vía Operaciones.js */
function iniciarModuloCompras() {
    renderizarHistorial();
    actualizarStats();
}

// ──────────────────────────────────────────────────────────────
// UTILIDADES GENERALES
// ──────────────────────────────────────────────────────────────
function getUsuario() {
    return JSON.parse(sessionStorage.getItem('usuarioActual'));
}

function getClaveCompras() {
    return `compras_${getUsuario().email}`;
}

function getCompras() {
    return JSON.parse(localStorage.getItem(getClaveCompras())) || [];
}

function saveCompras(lista) {
    localStorage.setItem(getClaveCompras(), JSON.stringify(lista));
}

function fmt(n) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n || 0);
}

function cerrarModalSiClickFuera(event, id) {
    if (event.target.id === id) {
        document.getElementById(id).style.display = 'none';
    }
}

// ──────────────────────────────────────────────────────────────
// HISTORIAL — RENDER
// ──────────────────────────────────────────────────────────────
function renderizarHistorial(filtro = '') {
    let compras = getCompras();

    if (filtro) {
        const t = filtro.toLowerCase();
        compras = compras.filter(c =>
            (c.proveedor?.nombre || '').toLowerCase().includes(t) ||
            (c.numFactura || '').toLowerCase().includes(t)
        );
    }

    // Ordenar por fecha descendente
    compras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const tabla  = document.getElementById('comprasTabla');
    const empty  = document.getElementById('comprasEmpty');
    const tbody  = document.getElementById('comprasTbody');

    if (compras.length === 0) {
        tabla.style.display  = 'none';
        empty.style.display  = 'flex';
        return;
    }

    tabla.style.display  = 'table';
    empty.style.display  = 'none';

    const etiquetaTipo = {
        factura:          'Factura',
        documento_soporte:'Doc. Soporte',
        gasto:            'Gasto',
        activo_fijo:      'Activo Fijo',
    };

    const etiquetaPago = {
        contado:  '<span class="badge-pago contado">Contado</span>',
        credito:  '<span class="badge-pago credito">Crédito</span>',
    };

    tbody.innerHTML = compras.map(c => `
        <tr>
            <td><strong>${c.numFactura || '—'}</strong></td>
            <td>${c.fecha || '—'}</td>
            <td>
                <div class="proveedor-cell">
                    <span class="proveedor-nombre">${c.proveedor?.nombre || '—'}</span>
                    ${c.proveedor?.nit ? `<span class="proveedor-nit">${c.proveedor.nit}</span>` : ''}
                </div>
            </td>
            <td><span class="badge-tipo-doc">${etiquetaTipo[c.tipoDoc] || c.tipoDoc}</span></td>
            <td>$${fmt(c.subtotal)}</td>
            <td>$${fmt(c.totalIva)}</td>
            <td class="${c.totalRetenciones > 0 ? 'ret-positiva' : ''}">
                ${c.totalRetenciones > 0 ? `-$${fmt(c.totalRetenciones)}` : '—'}
            </td>
            <td><strong>$${fmt(c.totalAPagar)}</strong></td>
            <td>${etiquetaPago[c.condicionPago] || c.condicionPago}</td>
            <td>
                <div class="compra-acciones">
                    <button class="compra-accion-btn editar" onclick="editarCompra('${c.id}')" title="Editar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="compra-accion-btn eliminar" onclick="eliminarCompra('${c.id}')" title="Eliminar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filtrarCompras() {
    const filtro = document.getElementById('searchCompras').value.trim();
    renderizarHistorial(filtro);
}

// ──────────────────────────────────────────────────────────────
// STATS
// ──────────────────────────────────────────────────────────────
function actualizarStats() {
    const compras = getCompras();

    const totalValor = compras.reduce((s, c) => s + (c.totalAPagar || 0), 0);

    const proveedoresUnicos = new Set(
        compras.map(c => c.proveedor?.nit || c.proveedor?.nombre).filter(Boolean)
    ).size;

    const hoy   = new Date();
    const esMes = c => {
        const f = new Date(c.fecha);
        return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
    };
    const esteMes = compras.filter(esMes).length;

    document.getElementById('statTotalCompras').textContent = compras.length;
    document.getElementById('statValorTotal').textContent   = `$${fmt(totalValor)}`;
    document.getElementById('statProveedores').textContent  = proveedoresUnicos;
    document.getElementById('statEsteMes').textContent      = esteMes;
}

// ──────────────────────────────────────────────────────────────
// MODAL NUEVA COMPRA — APERTURA / CIERRE
// ──────────────────────────────────────────────────────────────
function abrirModalNuevaCompra() {
    compraEditandoId = null;
    itemsCompra = [];
    document.getElementById('modalCompraTitle').textContent = 'Nueva Compra';
    limpiarFormularioCompra();
    agregarItemCompra();         // siempre arranca con una fila vacía
    document.getElementById('modalNuevaCompra').style.display = 'flex';
}

function cerrarModalNuevaCompra() {
    document.getElementById('modalNuevaCompra').style.display = 'none';
}

function limpiarFormularioCompra() {
    // Fecha hoy por defecto
    document.getElementById('cFecha').value        = new Date().toISOString().split('T')[0];
    document.getElementById('cNumFactura').value   = '';
    document.getElementById('cTipoDoc').value      = 'factura';
    document.getElementById('cCondicionPago').value = 'contado';
    document.getElementById('cFechaVencimiento').value = '';
    document.getElementById('cMedioPago').value    = '';
    document.getElementById('cProveedorNombre').value = '';
    document.getElementById('cProveedorNit').value    = '';
    document.getElementById('cProveedorTel').value    = '';
    document.getElementById('cObservaciones').value   = '';
    document.getElementById('campoVencimiento').style.display = 'none';

    // Retenciones
    ['Retefuente','ReteIva','ReteIca'].forEach(r => {
        document.getElementById(`chk${r}`).checked = false;
        document.getElementById(`row${r}`).style.display = 'none';
        document.getElementById(`tarifa${r}`).value = '';
    });

    document.getElementById('mensajeErrorCompra').style.display = 'none';
    document.getElementById('compraItems').innerHTML = '';
    itemsCompra = [];
    calcularTotalesCompra();
}

function toggleVencimiento() {
    const credito = document.getElementById('cCondicionPago').value === 'credito';
    document.getElementById('campoVencimiento').style.display = credito ? 'flex' : 'none';
}

// ──────────────────────────────────────────────────────────────
// ÍTEMS DEL FORMULARIO
// ──────────────────────────────────────────────────────────────
function agregarItemCompra() {
    const id = Date.now().toString();
    itemsCompra.push({ id, descripcion:'', cantidad:1, precioUnitario:0, descuento:0, iva:19 });
    renderizarItemsCompra();
}

function renderizarItemsCompra() {
    const container = document.getElementById('compraItems');

    if (itemsCompra.length === 0) {
        container.innerHTML = '<p class="sin-items-msg">Sin ítems — haz clic en "Agregar ítem"</p>';
        calcularTotalesCompra();
        return;
    }

    container.innerHTML = itemsCompra.map((item, i) => `
        <div class="compra-item-fila" data-id="${item.id}">
            <div class="compra-item-num">${i + 1}</div>
            <div class="compra-item-desc">
                <input type="text" placeholder="Descripción del producto o servicio"
                    value="${item.descripcion}"
                    oninput="actualizarItemCompra('${item.id}','descripcion',this.value)">
            </div>
            <div class="compra-item-cant">
                <label>Cant.</label>
                <input type="number" min="1" value="${item.cantidad}"
                    oninput="actualizarItemCompra('${item.id}','cantidad',this.value)">
            </div>
            <div class="compra-item-precio">
                <label>P. Unit.</label>
                <input type="number" min="0" step="0.01" value="${item.precioUnitario}"
                    oninput="actualizarItemCompra('${item.id}','precioUnitario',this.value)">
            </div>
            <div class="compra-item-dto">
                <label>Dto %</label>
                <input type="number" min="0" max="100" step="0.1" value="${item.descuento}"
                    oninput="actualizarItemCompra('${item.id}','descuento',this.value)">
            </div>
            <div class="compra-item-iva">
                <label>IVA %</label>
                <select onchange="actualizarItemCompra('${item.id}','iva',this.value)">
                    <option value="0"  ${item.iva==0  ?'selected':''}>0%</option>
                    <option value="5"  ${item.iva==5  ?'selected':''}>5%</option>
                    <option value="19" ${item.iva==19 ?'selected':''}>19%</option>
                </select>
            </div>
            <div class="compra-item-subtotal">
                <label>Subtotal</label>
                <span>$${fmt(calcularSubtotalItem_c(item))}</span>
            </div>
            <button class="compra-item-del" onclick="eliminarItemCompra('${item.id}')" title="Eliminar fila">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `).join('');

    calcularTotalesCompra();
}

function actualizarItemCompra(id, campo, valor) {
    const item = itemsCompra.find(i => i.id === id);
    if (!item) return;
    item[campo] = ['cantidad','precioUnitario','descuento','iva'].includes(campo)
        ? parseFloat(valor) || 0
        : valor;
    // Solo re-render el subtotal sin rebuilding todo para no perder foco
    const fila    = document.querySelector(`[data-id="${id}"] .compra-item-subtotal span`);
    if (fila) fila.textContent = `$${fmt(calcularSubtotalItem_c(item))}`;
    calcularTotalesCompra();
}

function eliminarItemCompra(id) {
    itemsCompra = itemsCompra.filter(i => i.id !== id);
    renderizarItemsCompra();
}

function calcularSubtotalItem_c(item) {
    const base = item.cantidad * item.precioUnitario;
    const dto  = base * (item.descuento / 100);
    return base - dto;
}

// ──────────────────────────────────────────────────────────────
// CÁLCULO DE TOTALES
// ──────────────────────────────────────────────────────────────
function calcularTotalesCompra() {
    let subtotal   = 0;
    let descuentos = 0;
    let totalIva   = 0;

    itemsCompra.forEach(item => {
        const base   = item.cantidad * item.precioUnitario;
        const dto    = base * (item.descuento / 100);
        const neto   = base - dto;
        subtotal   += neto;
        descuentos += dto;
        totalIva   += neto * (item.iva / 100);
    });

    const bruto = subtotal + totalIva;

    // Retenciones
    let totalRet = 0;
    const calcRet = (chkId, tarifaId, valorId, base) => {
        if (document.getElementById(chkId)?.checked) {
            const t   = parseFloat(document.getElementById(tarifaId)?.value) || 0;
            const val = base * (t / 100);
            totalRet += val;
            if (document.getElementById(valorId))
                document.getElementById(valorId).textContent = `$${fmt(val)}`;
        } else {
            if (document.getElementById(valorId))
                document.getElementById(valorId).textContent = '$0,00';
        }
    };

    calcRet('chkRetefuente', 'tarifaRetefuente', 'valorRetefuente', subtotal);
    calcRet('chkReteIva',    'tarifaReteIva',    'valorReteIva',    totalIva);
    calcRet('chkReteIca',    'tarifaReteIca',    'valorReteIca',    bruto);

    const totalAPagar = bruto - totalRet;

    // Actualizar UI
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('cTSubtotal',  `$${fmt(subtotal)}`);
    set('cTDescuentos', `-$${fmt(descuentos)}`);
    set('cTIva',        `$${fmt(totalIva)}`);
    set('cTRetenciones', `-$${fmt(totalRet)}`);
    set('cTTotal',      `$${fmt(totalAPagar)}`);

    const filaRet = document.getElementById('filaTRetenciones');
    if (filaRet) filaRet.style.display = totalRet > 0 ? 'flex' : 'none';

    return { subtotal, descuentos, totalIva, bruto, totalRet, totalAPagar };
}

function toggleRetencionCompra() {
    ['Retefuente','ReteIva','ReteIca'].forEach(r => {
        const checked = document.getElementById(`chk${r}`)?.checked;
        const row     = document.getElementById(`row${r}`);
        if (row) row.style.display = checked ? 'flex' : 'none';
    });
    calcularTotalesCompra();
}

// ──────────────────────────────────────────────────────────────
// GUARDAR COMPRA
// ──────────────────────────────────────────────────────────────
function guardarCompra() {
    // Validaciones
    const numFactura      = document.getElementById('cNumFactura').value.trim();
    const fecha           = document.getElementById('cFecha').value;
    const proveedorNombre = document.getElementById('cProveedorNombre').value.trim();

    if (!numFactura) {
        mostrarErrorCompra('El número de factura del proveedor es obligatorio.');
        return;
    }
    if (!fecha) {
        mostrarErrorCompra('La fecha de compra es obligatoria.');
        return;
    }
    if (!proveedorNombre) {
        mostrarErrorCompra('El nombre del proveedor es obligatorio.');
        return;
    }
    if (itemsCompra.length === 0 || !itemsCompra.some(i => i.descripcion.trim())) {
        mostrarErrorCompra('Agrega al menos un ítem con descripción.');
        return;
    }

    const totales = calcularTotalesCompra();

    const retenciones = {
        retefuente: document.getElementById('chkRetefuente')?.checked
            ? { activa: true, tarifa: parseFloat(document.getElementById('tarifaRetefuente')?.value)||0, valor: totales.subtotal * ((parseFloat(document.getElementById('tarifaRetefuente')?.value)||0)/100) }
            : { activa: false, tarifa: 0, valor: 0 },
        reteiva: document.getElementById('chkReteIva')?.checked
            ? { activa: true, tarifa: parseFloat(document.getElementById('tarifaReteIva')?.value)||0, valor: totales.totalIva * ((parseFloat(document.getElementById('tarifaReteIva')?.value)||0)/100) }
            : { activa: false, tarifa: 0, valor: 0 },
        reteica: document.getElementById('chkReteIca')?.checked
            ? { activa: true, tarifa: parseFloat(document.getElementById('tarifaReteIca')?.value)||0, valor: totales.bruto * ((parseFloat(document.getElementById('tarifaReteIca')?.value)||0)/100) }
            : { activa: false, tarifa: 0, valor: 0 },
    };

    const compra = {
        id:               compraEditandoId || Date.now().toString(),
        numFactura,
        fecha,
        fechaVencimiento: document.getElementById('cFechaVencimiento').value || null,
        tipoDoc:          document.getElementById('cTipoDoc').value,
        condicionPago:    document.getElementById('cCondicionPago').value,
        medioPago:        document.getElementById('cMedioPago').value,
        proveedor: {
            nombre: proveedorNombre,
            nit:    document.getElementById('cProveedorNit').value.trim(),
            tel:    document.getElementById('cProveedorTel').value.trim(),
        },
        items:            [...itemsCompra],
        subtotal:         totales.subtotal,
        totalDescuentos:  totales.descuentos,
        totalIva:         totales.totalIva,
        totalRetenciones: totales.totalRet,
        retenciones,
        totalBruto:       totales.bruto,
        totalAPagar:      totales.totalAPagar,
        observaciones:    document.getElementById('cObservaciones').value.trim(),
        origen:           'manual',
        fechaRegistro:    new Date().toISOString(),
    };

    const lista = getCompras();

    if (compraEditandoId) {
        const idx = lista.findIndex(c => c.id === compraEditandoId);
        if (idx !== -1) lista[idx] = compra;
    } else {
        lista.push(compra);
    }

    saveCompras(lista);
    cerrarModalNuevaCompra();
    renderizarHistorial();
    actualizarStats();

    console.log(`✅ Compra ${compraEditandoId ? 'editada' : 'guardada'}:`, compra.numFactura);
}

// ──────────────────────────────────────────────────────────────
// EDITAR / ELIMINAR
// ──────────────────────────────────────────────────────────────
function editarCompra(id) {
    const compra = getCompras().find(c => c.id === id);
    if (!compra) return;

    compraEditandoId = id;
    document.getElementById('modalCompraTitle').textContent = 'Editar Compra';
    limpiarFormularioCompra();

    // Cargar datos
    document.getElementById('cNumFactura').value      = compra.numFactura || '';
    document.getElementById('cFecha').value           = compra.fecha || '';
    document.getElementById('cTipoDoc').value         = compra.tipoDoc || 'factura';
    document.getElementById('cCondicionPago').value   = compra.condicionPago || 'contado';
    document.getElementById('cMedioPago').value       = compra.medioPago || '';
    document.getElementById('cProveedorNombre').value = compra.proveedor?.nombre || '';
    document.getElementById('cProveedorNit').value    = compra.proveedor?.nit || '';
    document.getElementById('cProveedorTel').value    = compra.proveedor?.tel || '';
    document.getElementById('cObservaciones').value   = compra.observaciones || '';

    if (compra.fechaVencimiento) {
        document.getElementById('cFechaVencimiento').value = compra.fechaVencimiento;
        document.getElementById('campoVencimiento').style.display = 'flex';
    }

    // Retenciones
    const r = compra.retenciones || {};
    if (r.retefuente?.activa) {
        document.getElementById('chkRetefuente').checked = true;
        document.getElementById('rowRetefuente').style.display = 'flex';
        document.getElementById('tarifaRetefuente').value = r.retefuente.tarifa;
    }
    if (r.reteiva?.activa) {
        document.getElementById('chkReteIva').checked = true;
        document.getElementById('rowReteIva').style.display = 'flex';
        document.getElementById('tarifaReteIva').value = r.reteiva.tarifa;
    }
    if (r.reteica?.activa) {
        document.getElementById('chkReteIca').checked = true;
        document.getElementById('rowReteIca').style.display = 'flex';
        document.getElementById('tarifaReteIca').value = r.reteica.tarifa;
    }

    // Ítems
    itemsCompra = (compra.items || []).map(i => ({ ...i }));
    renderizarItemsCompra();

    document.getElementById('modalNuevaCompra').style.display = 'flex';
}

function eliminarCompra(id) {
    if (!confirm('¿Eliminar esta compra? Esta acción no se puede deshacer.')) return;
    saveCompras(getCompras().filter(c => c.id !== id));
    renderizarHistorial();
    actualizarStats();
    console.log('🗑️ Compra eliminada:', id);
}

// ──────────────────────────────────────────────────────────────
// MENSAJES DE ERROR
// ──────────────────────────────────────────────────────────────
function mostrarErrorCompra(msg) {
    const el = document.getElementById('mensajeErrorCompra');
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ──────────────────────────────────────────────────────────────
// IMPORTAR DESDE EXCEL
// ──────────────────────────────────────────────────────────────
function importarDesdeExcel(event) {
    const file = event.target.files[0];
    event.target.value = ''; // resetear input para permitir reimportar el mismo archivo

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data  = new Uint8Array(e.target.result);
            const wb    = XLSX.read(data, { type: 'array', cellDates: true });
            const ws    = wb.Sheets[wb.SheetNames[0]];
            const filas = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (filas.length === 0) {
                mostrarResultadoImportacion(0, 0, ['El archivo está vacío o no tiene datos en la primera hoja.']);
                return;
            }

            procesarFilasImportadas(filas);

        } catch(err) {
            mostrarResultadoImportacion(0, 0, [`Error al leer el archivo: ${err.message}`]);
        }
    };

    reader.onerror = () => mostrarResultadoImportacion(0, 0, ['No se pudo leer el archivo.']);
    reader.readAsArrayBuffer(file);
}

/**
 * Mapeo flexible de encabezados — acepta variaciones de escritura
 * para que el usuario no tenga que escribir los nombres exactos
 */
const MAPA_COLUMNAS = {
    // N° factura
    numFactura:       ['n° factura proveedor','num factura','numero factura','n factura','factura','invoice'],
    // Fecha
    fecha:            ['fecha de compra','fecha compra','fecha','date'],
    // Tipo documento
    tipoDoc:          ['tipo de documento','tipo documento','tipo doc','tipo'],
    // Condicion pago
    condicionPago:    ['condicion de pago','condicion pago','condicion','pago'],
    // Fecha vencimiento
    fechaVencimiento: ['fecha de vencimiento','fecha vencimiento','vencimiento'],
    // Medio pago
    medioPago:        ['medio de pago','medio pago','medio'],
    // Proveedor
    proveedorNombre:  ['nombre proveedor','proveedor','razon social','nombre','supplier'],
    proveedorNit:     ['nit proveedor','nit','documento proveedor','id proveedor'],
    proveedorTel:     ['telefono proveedor','telefono','tel','phone'],
    // Item
    descripcion:      ['descripcion','descripción','producto','servicio','concepto','item','description'],
    cantidad:         ['cantidad','cant','qty','quantity'],
    precioUnitario:   ['precio unitario','precio unit','precio','p. unit','unit price','valor unitario'],
    descuento:        ['descuento %','descuento','dto','dto %','discount'],
    iva:              ['iva %','iva','impuesto','tax'],
    // Retenciones globales
    tarifaRetefuente: ['tarifa retefuente','retefuente %','retefuente','rete fuente'],
    tarifaReteIva:    ['tarifa reteiva','reteiva %','reteiva','rete iva'],
    tarifaReteIca:    ['tarifa reteica','reteica %','reteica','rete ica'],
    // Observaciones
    observaciones:    ['observaciones','observacion','notas','notes','comentarios'],
};

function resolverEncabezados(filas) {
    if (filas.length === 0) return {};
    const keys = Object.keys(filas[0]);
    const map  = {};

    Object.entries(MAPA_COLUMNAS).forEach(([campo, variantes]) => {
        const encontrado = keys.find(k =>
            variantes.some(v => k.toString().toLowerCase().trim().includes(v))
        );
        if (encontrado) map[campo] = encontrado;
    });

    return map;
}

function parsearFecha(val) {
    if (!val) return new Date().toISOString().split('T')[0];
    if (val instanceof Date) return val.toISOString().split('T')[0];
    // Número serial de Excel
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
    }
    // String
    const str = String(val).trim();
    const partes = str.split(/[-\/]/);
    if (partes.length === 3) {
        // dd/mm/yyyy o yyyy-mm-dd
        if (partes[0].length === 4) return str; // ya es yyyy-mm-dd
        if (partes[2].length === 4) return `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
    }
    const d = new Date(str);
    return isNaN(d) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
}

function procesarFilasImportadas(filas) {
    const mapa      = resolverEncabezados(filas);
    const errores   = [];
    const nuevas    = [];
    const lista     = getCompras();
    const existentes = new Set(lista.map(c => c.numFactura?.toLowerCase().trim()));

    filas.forEach((fila, idx) => {
        const n = idx + 2; // fila 1 = encabezados

        const g = campo => {
            const col = mapa[campo];
            return col !== undefined ? String(fila[col] ?? '').trim() : '';
        };
        const gNum = campo => parseFloat(g(campo)) || 0;

        const numFactura     = g('numFactura');
        const proveedorNombre = g('proveedorNombre');

        if (!numFactura && !proveedorNombre) {
            // Fila vacía, ignorar silenciosamente
            return;
        }

        if (!numFactura) {
            errores.push(`Fila ${n}: falta el número de factura.`);
            return;
        }
        if (!proveedorNombre) {
            errores.push(`Fila ${n}: falta el nombre del proveedor.`);
            return;
        }

        // Avisar sobre duplicados pero no bloquear (el usuario puede querer reimportar)
        if (existentes.has(numFactura.toLowerCase())) {
            errores.push(`Fila ${n}: factura "${numFactura}" ya existe — se omite.`);
            return;
        }

        const cantidad      = gNum('cantidad') || 1;
        const precio        = gNum('precioUnitario');
        const descuento     = gNum('descuento');
        const ivaPct        = gNum('iva') !== 0 ? gNum('iva') : 19;

        const itemBase      = precio * cantidad;
        const itemDto       = itemBase * (descuento / 100);
        const itemNeto      = itemBase - itemDto;
        const itemIva       = itemNeto * (ivaPct / 100);

        const subtotal      = itemNeto;
        const totalIva      = itemIva;
        const bruto         = subtotal + totalIva;

        // Retenciones opcionales
        const tRF  = gNum('tarifaRetefuente');
        const tRIV = gNum('tarifaReteIva');
        const tRIC = gNum('tarifaReteIca');

        const valRF  = tRF  > 0 ? subtotal * (tRF  / 100) : 0;
        const valRIV = tRIV > 0 ? totalIva * (tRIV / 100) : 0;
        const valRIC = tRIC > 0 ? bruto    * (tRIC / 100) : 0;
        const totalRet = valRF + valRIV + valRIC;

        const compra = {
            id:               Date.now().toString() + Math.random().toString(36).slice(2,6),
            numFactura,
            fecha:            parsearFecha(mapa.fecha ? fila[mapa.fecha] : null),
            fechaVencimiento: mapa.fechaVencimiento ? parsearFecha(fila[mapa.fechaVencimiento]) : null,
            tipoDoc:          g('tipoDoc') || 'factura',
            condicionPago:    g('condicionPago') || 'contado',
            medioPago:        g('medioPago') || '',
            proveedor: {
                nombre: proveedorNombre,
                nit:    g('proveedorNit'),
                tel:    g('proveedorTel'),
            },
            items: [{
                id:             Date.now().toString(),
                descripcion:    g('descripcion') || 'Importado desde Excel',
                cantidad,
                precioUnitario: precio,
                descuento,
                iva:            ivaPct,
            }],
            subtotal,
            totalDescuentos: itemDto,
            totalIva,
            retenciones: {
                retefuente: { activa: tRF > 0,  tarifa: tRF,  valor: valRF  },
                reteiva:    { activa: tRIV > 0, tarifa: tRIV, valor: valRIV },
                reteica:    { activa: tRIC > 0, tarifa: tRIC, valor: valRIC },
            },
            totalRetenciones: totalRet,
            totalBruto:       bruto,
            totalAPagar:      bruto - totalRet,
            observaciones:    g('observaciones'),
            origen:           'excel',
            fechaRegistro:    new Date().toISOString(),
        };

        nuevas.push(compra);
        existentes.add(numFactura.toLowerCase());
    });

    if (nuevas.length > 0) {
        saveCompras([...lista, ...nuevas]);
        renderizarHistorial();
        actualizarStats();
    }

    mostrarResultadoImportacion(nuevas.length, filas.length, errores);
}

function mostrarResultadoImportacion(importadas, total, errores) {
    const body = document.getElementById('importResultBody');
    const omitidas = total - importadas - errores.filter(e => e.includes('ya existe')).length;

    body.innerHTML = `
        <div class="import-result-stats">
            <div class="import-stat ok">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span><strong>${importadas}</strong> importadas correctamente</span>
            </div>
            <div class="import-stat warn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span><strong>${errores.length}</strong> filas con advertencias</span>
            </div>
        </div>
        ${errores.length > 0 ? `
            <div class="import-errores">
                <p class="import-errores-titulo">Advertencias:</p>
                <ul>${errores.map(e => `<li>${e}</li>`).join('')}</ul>
            </div>
        ` : ''}
    `;

    document.getElementById('modalImportResult').style.display = 'flex';
}

// ──────────────────────────────────────────────────────────────
// EXPORTAR A EXCEL
// ──────────────────────────────────────────────────────────────
function exportarComprasExcel() {
    const compras = getCompras();

    if (compras.length === 0) {
        alert('No hay compras para exportar.');
        return;
    }

    // Hoja 1: Historial completo
    const filas = compras.map(c => ({
        'N° Factura Proveedor': c.numFactura || '',
        'Fecha de Compra':      c.fecha || '',
        'Fecha Vencimiento':    c.fechaVencimiento || '',
        'Tipo Documento':       c.tipoDoc || '',
        'Condicion de Pago':    c.condicionPago || '',
        'Medio de Pago':        c.medioPago || '',
        'Proveedor':            c.proveedor?.nombre || '',
        'NIT Proveedor':        c.proveedor?.nit || '',
        'Telefono Proveedor':   c.proveedor?.tel || '',
        'Descripcion Items':    (c.items || []).map(i => i.descripcion).filter(Boolean).join(' | '),
        'Subtotal':             c.subtotal || 0,
        'Descuentos':           c.totalDescuentos || 0,
        'IVA':                  c.totalIva || 0,
        'ReteFuente':           c.retenciones?.retefuente?.valor || 0,
        'ReteIVA':              c.retenciones?.reteiva?.valor || 0,
        'ReteICA':              c.retenciones?.reteica?.valor || 0,
        'Total Retenciones':    c.totalRetenciones || 0,
        'Total Bruto':          c.totalBruto || 0,
        'Total a Pagar':        c.totalAPagar || 0,
        'Observaciones':        c.observaciones || '',
        'Origen':               c.origen || 'manual',
        'Fecha Registro':       c.fechaRegistro || '',
    }));

    // Hoja 2: Resumen por proveedor
    const porProveedor = {};
    compras.forEach(c => {
        const k = c.proveedor?.nombre || 'Sin nombre';
        if (!porProveedor[k]) {
            porProveedor[k] = {
                'Proveedor':       k,
                'NIT':             c.proveedor?.nit || '',
                'N° Compras':      0,
                'Total Comprado':  0,
                'Total IVA':       0,
                'Total Retenciones': 0,
                'Total Neto':      0,
            };
        }
        porProveedor[k]['N° Compras']       += 1;
        porProveedor[k]['Total Comprado']   += c.subtotal || 0;
        porProveedor[k]['Total IVA']        += c.totalIva || 0;
        porProveedor[k]['Total Retenciones']+= c.totalRetenciones || 0;
        porProveedor[k]['Total Neto']       += c.totalAPagar || 0;
    });

    const wb   = XLSX.utils.book_new();
    const ws1  = XLSX.utils.json_to_sheet(filas);
    const ws2  = XLSX.utils.json_to_sheet(Object.values(porProveedor));

    // Anchos de columna
    ws1['!cols'] = [
        {wch:20},{wch:14},{wch:14},{wch:18},{wch:16},{wch:18},
        {wch:30},{wch:16},{wch:16},{wch:40},
        {wch:14},{wch:14},{wch:12},{wch:12},{wch:12},{wch:12},
        {wch:16},{wch:14},{wch:14},{wch:30},{wch:10},{wch:22},
    ];
    ws2['!cols'] = [{wch:30},{wch:16},{wch:12},{wch:16},{wch:12},{wch:18},{wch:14}];

    XLSX.utils.book_append_sheet(wb, ws1, 'Historial de Compras');
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por Proveedor');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Compras_Sparkles_${fecha}.xlsx`);

    console.log(`✅ Excel exportado con ${compras.length} compras`);
}

// ──────────────────────────────────────────────────────────────
// PLANTILLA DE IMPORTACIÓN
// ──────────────────────────────────────────────────────────────
function descargarPlantilla() {
    const ejemplo = [
        {
            'N° Factura Proveedor': 'FC-001234',
            'Fecha de Compra':      '2024-03-15',
            'Fecha Vencimiento':    '2024-04-14',
            'Tipo Documento':       'factura',
            'Condicion de Pago':    'credito',
            'Medio de Pago':        'transferencia',
            'Nombre Proveedor':     'Distribuidora XYZ S.A.S.',
            'NIT Proveedor':        '900123456-1',
            'Telefono Proveedor':   '3001234567',
            'Descripcion':          'Papelería y suministros de oficina',
            'Cantidad':             10,
            'Precio Unitario':      15000,
            'Descuento %':          5,
            'IVA %':                19,
            'Tarifa ReteFuente':    0,
            'Tarifa ReteIVA':       0,
            'Tarifa ReteICA':       0,
            'Observaciones':        'Factura de abril 2024',
        },
        {
            'N° Factura Proveedor': 'FV-005678',
            'Fecha de Compra':      '2024-03-20',
            'Fecha Vencimiento':    '',
            'Tipo Documento':       'factura',
            'Condicion de Pago':    'contado',
            'Medio de Pago':        'efectivo',
            'Nombre Proveedor':     'Servicios Técnicos Ltda.',
            'NIT Proveedor':        '800987654-2',
            'Telefono Proveedor':   '',
            'Descripcion':          'Mantenimiento equipos de computo',
            'Cantidad':             1,
            'Precio Unitario':      350000,
            'Descuento %':          0,
            'IVA %':                19,
            'Tarifa ReteFuente':    3.5,
            'Tarifa ReteIVA':       15,
            'Tarifa ReteICA':       0,
            'Observaciones':        '',
        },
    ];

    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.json_to_sheet(ejemplo);

    ws['!cols'] = [
        {wch:22},{wch:14},{wch:16},{wch:18},{wch:16},{wch:18},
        {wch:30},{wch:16},{wch:16},{wch:35},
        {wch:10},{wch:15},{wch:12},{wch:8},
        {wch:16},{wch:14},{wch:14},{wch:30},
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Compras');

    // Segunda hoja con instrucciones
    const instrucciones = [
        { 'Campo':               'N° Factura Proveedor', 'Obligatorio': 'Sí',  'Descripcion': 'Número de la factura emitida por el proveedor' },
        { 'Campo':               'Fecha de Compra',      'Obligatorio': 'Sí',  'Descripcion': 'Formato YYYY-MM-DD o DD/MM/YYYY' },
        { 'Campo':               'Fecha Vencimiento',    'Obligatorio': 'No',  'Descripcion': 'Dejar vacío si es de contado' },
        { 'Campo':               'Tipo Documento',       'Obligatorio': 'No',  'Descripcion': 'factura | documento_soporte | gasto | activo_fijo' },
        { 'Campo':               'Condicion de Pago',    'Obligatorio': 'No',  'Descripcion': 'contado | credito  (por defecto: contado)' },
        { 'Campo':               'Medio de Pago',        'Obligatorio': 'No',  'Descripcion': 'efectivo | transferencia | cheque | consignacion | tarjeta_debito | tarjeta_credito | otro' },
        { 'Campo':               'Nombre Proveedor',     'Obligatorio': 'Sí',  'Descripcion': 'Nombre o razón social del proveedor' },
        { 'Campo':               'NIT Proveedor',        'Obligatorio': 'No',  'Descripcion': 'NIT o documento de identificación' },
        { 'Campo':               'Telefono Proveedor',   'Obligatorio': 'No',  'Descripcion': 'Teléfono de contacto' },
        { 'Campo':               'Descripcion',          'Obligatorio': 'No',  'Descripcion': 'Descripción del producto o servicio comprado' },
        { 'Campo':               'Cantidad',             'Obligatorio': 'No',  'Descripcion': 'Número entero o decimal (por defecto: 1)' },
        { 'Campo':               'Precio Unitario',      'Obligatorio': 'No',  'Descripcion': 'Valor unitario sin IVA' },
        { 'Campo':               'Descuento %',          'Obligatorio': 'No',  'Descripcion': 'Porcentaje de descuento del proveedor (0-100)' },
        { 'Campo':               'IVA %',                'Obligatorio': 'No',  'Descripcion': '0 | 5 | 19  (por defecto: 19)' },
        { 'Campo':               'Tarifa ReteFuente',    'Obligatorio': 'No',  'Descripcion': 'Porcentaje de retención en la fuente (ej: 3.5)' },
        { 'Campo':               'Tarifa ReteIVA',       'Obligatorio': 'No',  'Descripcion': 'Porcentaje de retención de IVA (ej: 15)' },
        { 'Campo':               'Tarifa ReteICA',       'Obligatorio': 'No',  'Descripcion': 'Tarifa de ICA por mil (ej: 0.414)' },
        { 'Campo':               'Observaciones',        'Obligatorio': 'No',  'Descripcion': 'Comentarios adicionales' },
    ];

    const wsInstr = XLSX.utils.json_to_sheet(instrucciones);
    wsInstr['!cols'] = [{wch:22},{wch:12},{wch:60}];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

    XLSX.writeFile(wb, 'Plantilla_Importar_Compras_Sparkles.xlsx');
    console.log('📋 Plantilla descargada');
}

// ──────────────────────────────────────────────────────────────
// INTEGRACIÓN CON OPERACIONES.JS — Activar módulo al cambiar tab
// ──────────────────────────────────────────────────────────────
// Override de cambiarTab para inicializar el módulo al abrir compras
const _cambiarTabOriginal = window.cambiarTab;
window.cambiarTab = function(tabName) {
    _cambiarTabOriginal && _cambiarTabOriginal.call(this, tabName);
    if (tabName === 'compras') {
        iniciarModuloCompras();
    }
};

console.log('🛒 Módulo de Compras Sparkles cargado');