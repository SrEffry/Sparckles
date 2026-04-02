// ========== NUEVA FACTURA ELECTRÓNICA - SPARKLES ==========
// FASE 1: Clientes + FASE 2: Productos + FASE 3: Resumen + FASE 4: Formas de Pago + FECHAS
// ========== CON RETENCIONES AUTOMÁTICAS ==========

// Variables globales
let configuracionFacturacion = null;

// Clientes (FASE 1)
let todosLosClientes = [];
let clienteSeleccionadoGlobal = null;
let clienteSeleccionadoTemp = null;
let indiceSeleccionado = -1;

// Productos (FASE 2)
let todosLosProductos = [];
let productoSeleccionadoTemp = null;
let indiceSeleccionadoProducto = -1;
let itemsFactura = [];

// Pago (FASE 4)
let formaPagoSeleccionada = '';
let medioPagoSeleccionado = '';
let instrumentosCobro = [];

let retencionesFiscales = {
    retefuente: { activa: false, tarifa: 4, base: 0, valor: 0 },
    reteiva: { activa: false, tarifa: 15, base: 0, valor: 0 },
    reteica: { activa: false, tarifa: 0.414, base: 0, valor: 0 }
};

let numeroFacturaActual = null;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function () {
    verificarSesion();
    cargarDatosUsuario();
    cargarConfiguracionFacturacion();
    verificarConfiguracionObligatoria();   // ← NUEVO: bloquear si no hay config
    cargarClientes();
    cargarProductos();
    restaurarEstadoFactura();
    setupLogout();
    inicializarFormaPago();
    
    console.log('✅ Sistema de facturación con retenciones automáticas cargado');
});

function verificarSesion() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) {
        window.location.href = '../index.html';
        return;
    }
}

// ========== VERIFICAR CONFIG DE FACTURACIÓN ==========
// Si el usuario no tiene configurada la resolución DIAN, muestra un modal
// bloqueante que impide usar el formulario hasta que configure primero.
function verificarConfiguracionObligatoria() {
    const usuario = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuario) return;

    const claveConfig = `config_facturacion_${usuario.email}`;
    const raw         = localStorage.getItem(claveConfig);

    let configOk = false;
    if (raw) {
        try {
            const cfg = JSON.parse(raw);
            // Requisitos mínimos: razonSocial, nit y resolución con número
            configOk = !!(cfg.razonSocial && cfg.nit && cfg.resolucion?.numero);
        } catch (e) { /* config corrupta → no ok */ }
    }

    if (!configOk) {
        const modal = document.getElementById('modalSinConfiguracion');
        if (modal) {
            modal.style.display = 'flex';
            // Deshabilitar scroll del body mientras el modal está visible
            document.body.style.overflow = 'hidden';
        }
        console.warn('⚠️ Sin configuración de facturación. Modal bloqueante activo.');
    }
}

function cargarDatosUsuario() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (usuarioActual) {
        const usuario = JSON.parse(usuarioActual);

        const userNameElements = document.querySelectorAll('.user-details strong');
        userNameElements.forEach(el => {
            el.textContent = usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`;
        });

        const userEmailElements = document.querySelectorAll('.user-details span');
        userEmailElements.forEach(el => {
            el.textContent = usuario.email;
        });

        const headerNameElements = document.querySelectorAll('.user-info-header strong');
        headerNameElements.forEach(el => {
            el.textContent = usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`;
        });

        const iniciales = obtenerIniciales(usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`);
        const avatarElements = document.querySelectorAll('.user-avatar, .user-avatar-small');
        avatarElements.forEach(el => {
            el.textContent = iniciales;
        });
    }
}

function obtenerIniciales(nombreCompleto) {
    const partes = nombreCompleto.trim().split(' ');
    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

function setupLogout() {
    const logoutBtn = document.querySelector('.footer-btn:last-child');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                sessionStorage.removeItem('usuarioActual');
                window.location.href = '../index.html';
            }
        });
    }
}

function cargarConfiguracionFacturacion() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuarioActual) return;

    const claveConfig = `config_facturacion_${usuarioActual.email}`;
    const configGuardada = localStorage.getItem(claveConfig);

    if (!configGuardada) {
        console.warn('⚠️ No hay configuración de facturación');
        return;
    }

    try {
        configuracionFacturacion = JSON.parse(configGuardada);

        if (configuracionFacturacion.resolucion) {
            const numeracionActual = configuracionFacturacion.resolucion.numeracionActual ||
                configuracionFacturacion.resolucion.numeracionDesde;
            numeroFacturaActual = parseInt(numeracionActual);
        }

        console.log('✅ Configuración cargada:', configuracionFacturacion);
        console.log('📊 Próximo número de factura:', numeroFacturaActual);

        actualizarNumeroFacturaResumen();

    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
    }
}

// ==========================================
// FASE 1: CLIENTES
// ==========================================

function cargarClientes() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveClientes = `clientes_${usuarioActual.email}`;

    console.log('📋 Cargando clientes desde:', claveClientes);

    todosLosClientes = JSON.parse(localStorage.getItem(claveClientes)) || [];

    console.log(`✅ ${todosLosClientes.length} clientes cargados`);
}

function abrirModalClientes() {
    const modal = document.getElementById('modalBusquedaClientes');
    const input = document.getElementById('inputBusquedaCliente');

    modal.style.display = 'flex';

    limpiarBusqueda();
    clienteSeleccionadoTemp = null;
    indiceSeleccionado = -1;

    mostrarEstadoInicial();

    document.getElementById('btnConfirmarSeleccion').disabled = true;

    setTimeout(() => {
        input.focus();
    }, 100);

    console.log('🔍 Modal de clientes abierto');
}

function cerrarModalClientes() {
    const modal = document.getElementById('modalBusquedaClientes');
    modal.style.display = 'none';

    console.log('❌ Modal de clientes cerrado');
}

function cerrarModalSiClickFuera(event) {
    if (event.target.id === 'modalBusquedaClientes') {
        cerrarModalClientes();
    }
}

function limpiarBusqueda() {
    const input = document.getElementById('inputBusquedaCliente');
    const btnLimpiar = document.querySelector('.btn-limpiar-busqueda');

    input.value = '';
    btnLimpiar.style.display = 'none';

    mostrarEstadoInicial();
    input.focus();
}

function mostrarEstadoInicial() {
    document.getElementById('estadoInicial').style.display = 'flex';
    document.getElementById('listaResultados').style.display = 'none';
    document.getElementById('sinResultados').style.display = 'none';
}

function buscarClientesEnTiempoReal() {
    const input = document.getElementById('inputBusquedaCliente');
    const btnLimpiar = document.querySelector('.btn-limpiar-busqueda');
    const termino = input.value.trim().toLowerCase();

    btnLimpiar.style.display = termino ? 'flex' : 'none';

    if (!termino) {
        mostrarEstadoInicial();
        return;
    }

    const resultados = todosLosClientes.filter(cliente => {
        const nombre = (cliente.nombreCompleto || cliente.razonSocial || '').toLowerCase();
        const documento = (cliente.numeroDocumento || cliente.nit || '').toLowerCase();
        const email = (cliente.email || '').toLowerCase();

        return nombre.includes(termino) ||
            documento.includes(termino) ||
            email.includes(termino);
    });

    console.log(`🔍 Búsqueda: "${termino}" → ${resultados.length} resultados`);

    mostrarResultados(resultados);
}

function mostrarResultados(resultados) {
    const estadoInicial = document.getElementById('estadoInicial');
    const listaResultados = document.getElementById('listaResultados');
    const sinResultados = document.getElementById('sinResultados');

    estadoInicial.style.display = 'none';

    if (resultados.length === 0) {
        listaResultados.style.display = 'none';
        sinResultados.style.display = 'flex';
        return;
    }

    let html = '';

    resultados.forEach((cliente, index) => {
        const nombre = cliente.nombreCompleto || cliente.razonSocial || 'Sin nombre';
        const tipo = cliente.tipo === 'natural' ? 'Natural' : 'Jurídica';

        let documento = '';
        if (cliente.tipo === 'natural') {
            documento = `${cliente.tipoDocumento} ${cliente.numeroDocumento}`;
        } else {
            documento = `NIT ${cliente.nit}-${cliente.dv || ''}`;
        }

        const telefono = cliente.telefono || 'Sin teléfono';
        const email = cliente.email || 'Sin email';

        html += `
            <div class="resultado-item" data-index="${index}" onclick="seleccionarResultado(${index})">
                <div class="resultado-header">
                    <span class="resultado-nombre">${nombre}</span>
                    <span class="resultado-badge">${tipo}</span>
                </div>
                <div class="resultado-documento">${documento}</div>
                <div class="resultado-contacto">
                    <span>📞 ${telefono}</span>
                    <span>✉️ ${email}</span>
                </div>
            </div>
        `;
    });

    listaResultados.innerHTML = html;
    listaResultados.style.display = 'flex';
    sinResultados.style.display = 'none';

    indiceSeleccionado = -1;
    clienteSeleccionadoTemp = null;
    document.getElementById('btnConfirmarSeleccion').disabled = true;
}

function seleccionarResultado(index) {
    const termino = document.getElementById('inputBusquedaCliente').value.trim().toLowerCase();

    const resultados = todosLosClientes.filter(cliente => {
        const nombre = (cliente.nombreCompleto || cliente.razonSocial || '').toLowerCase();
        const documento = (cliente.numeroDocumento || cliente.nit || '').toLowerCase();
        const email = (cliente.email || '').toLowerCase();

        return nombre.includes(termino) ||
            documento.includes(termino) ||
            email.includes(termino);
    });

    if (index < 0 || index >= resultados.length) {
        console.error('❌ Índice fuera de rango');
        return;
    }

    document.querySelectorAll('.resultado-item').forEach(item => {
        item.classList.remove('seleccionado');
    });

    const item = document.querySelector(`[data-index="${index}"]`);
    if (item) {
        item.classList.add('seleccionado');
    }

    clienteSeleccionadoTemp = resultados[index];
    indiceSeleccionado = index;

    document.getElementById('btnConfirmarSeleccion').disabled = false;

    console.log('✅ Cliente seleccionado:', clienteSeleccionadoTemp);
}

function navegarResultadosTeclado(event) {
    const items = document.querySelectorAll('.resultado-item');

    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        indiceSeleccionado = Math.min(indiceSeleccionado + 1, items.length - 1);
        seleccionarResultado(indiceSeleccionado);
        items[indiceSeleccionado].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    else if (event.key === 'ArrowUp') {
        event.preventDefault();
        indiceSeleccionado = Math.max(indiceSeleccionado - 1, 0);
        seleccionarResultado(indiceSeleccionado);
        items[indiceSeleccionado].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    else if (event.key === 'Enter' && clienteSeleccionadoTemp) {
        event.preventDefault();
        confirmarSeleccionCliente();
    }
    else if (event.key === 'Escape') {
        event.preventDefault();
        cerrarModalClientes();
    }
}

function confirmarSeleccionCliente() {
    if (!clienteSeleccionadoTemp) {
        console.error('❌ No hay cliente seleccionado');
        return;
    }

    clienteSeleccionadoGlobal = clienteSeleccionadoTemp;

    console.log('✅ Cliente confirmado:', clienteSeleccionadoGlobal);

    mostrarClienteEnCard();
    cerrarModalClientes();
}

function mostrarClienteEnCard() {
    const cliente = clienteSeleccionadoGlobal;

    if (!cliente) return;

    document.getElementById('btnSeleccionarCliente').style.display = 'none';

    const card = document.getElementById('clienteSeleccionadoCard');
    card.style.display = 'block';

    const nombre = cliente.nombreCompleto || cliente.razonSocial || 'Sin nombre';
    const tipo = cliente.tipo === 'natural' ? 'Persona Natural' : 'Persona Jurídica';

    let documento = '';
    if (cliente.tipo === 'natural') {
        documento = `${cliente.tipoDocumento} ${cliente.numeroDocumento}`;
    } else {
        documento = `NIT ${cliente.nit}-${cliente.dv || ''}`;
    }

    document.getElementById('cardNombreCliente').textContent = nombre;
    document.getElementById('cardTipoCliente').textContent = tipo;
    document.getElementById('cardDocumentoCliente').textContent = documento;
    document.getElementById('cardTelefonoCliente').textContent = cliente.telefono || 'No registrado';
    document.getElementById('cardEmailCliente').textContent = cliente.email || 'No registrado';
    document.getElementById('cardDireccionCliente').textContent = cliente.direccion || 'No registrada';

    console.log('📋 Cliente mostrado en tarjeta');
}

function irACrearClienteDesdeModal() {
    console.log('➕ Redirigiendo a crear cliente...');

    guardarEstadoFactura();

    window.location.href = './Clientes.html?returnTo=nueva-factura';
}

// ==========================================
// FASE 2: PRODUCTOS CON RETENCIONES
// ==========================================

function cargarProductos() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveProductos = `productos_${usuarioActual.email}`;

    console.log('📦 Cargando productos desde:', claveProductos);

    todosLosProductos = JSON.parse(localStorage.getItem(claveProductos)) || [];

    console.log(`✅ ${todosLosProductos.length} productos cargados`);
}

function abrirModalProductos() {
    const modal = document.getElementById('modalBusquedaProductos');
    const input = document.getElementById('inputBusquedaProducto');

    modal.style.display = 'flex';

    limpiarBusquedaProducto();
    productoSeleccionadoTemp = null;
    indiceSeleccionadoProducto = -1;

    mostrarEstadoInicialProducto();

    document.getElementById('btnConfirmarProducto').disabled = true;

    setTimeout(() => {
        input.focus();
    }, 100);

    console.log('🔍 Modal de productos abierto');
}

function cerrarModalProductos() {
    const modal = document.getElementById('modalBusquedaProductos');
    modal.style.display = 'none';

    console.log('❌ Modal de productos cerrado');
}

function cerrarModalSiClickFueraProducto(event) {
    if (event.target.id === 'modalBusquedaProductos') {
        cerrarModalProductos();
    }
}

function limpiarBusquedaProducto() {
    const input = document.getElementById('inputBusquedaProducto');
    const btnLimpiar = document.getElementById('btnLimpiarProducto');

    input.value = '';
    btnLimpiar.style.display = 'none';

    mostrarEstadoInicialProducto();
    input.focus();
}

function mostrarEstadoInicialProducto() {
    document.getElementById('estadoInicialProducto').style.display = 'flex';
    document.getElementById('listaResultadosProducto').style.display = 'none';
    document.getElementById('sinResultadosProducto').style.display = 'none';
}

function buscarProductosEnTiempoReal() {
    const input = document.getElementById('inputBusquedaProducto');
    const btnLimpiar = document.getElementById('btnLimpiarProducto');
    const termino = input.value.trim().toLowerCase();

    btnLimpiar.style.display = termino ? 'flex' : 'none';

    if (!termino) {
        mostrarEstadoInicialProducto();
        return;
    }

    const resultados = todosLosProductos.filter(producto => {
        const nombre = (producto.nombre || producto.descripcion || '').toLowerCase();
        const codigo = (producto.codigo || '').toLowerCase();
        const categoria = (producto.categoria || '').toLowerCase();

        return nombre.includes(termino) ||
            codigo.includes(termino) ||
            categoria.includes(termino);
    });

    console.log(`🔍 Búsqueda producto: "${termino}" → ${resultados.length} resultados`);

    mostrarResultadosProducto(resultados);
}

function mostrarResultadosProducto(resultados) {
    const estadoInicial = document.getElementById('estadoInicialProducto');
    const listaResultados = document.getElementById('listaResultadosProducto');
    const sinResultados = document.getElementById('sinResultadosProducto');

    estadoInicial.style.display = 'none';

    if (resultados.length === 0) {
        listaResultados.style.display = 'none';
        sinResultados.style.display = 'flex';
        return;
    }

    let html = '';

    resultados.forEach((producto, index) => {
        const nombre = producto.nombre || producto.descripcion || 'Sin nombre';
        const codigo = producto.codigo || 'Sin código';
        const precio = formatearNumero(producto.precioVenta || 0);
        const iva = producto.tarifaIva || '0%';
        
        // ========== DETECTAR RETENCIÓN ==========
        const tieneRetencion = producto.retencion?.aplica || false;
        const nombreRetencion = producto.retencion?.nombre || '';
        const tarifaRetencion = producto.retencion?.tarifa || 0;

        html += `
            <div class="resultado-producto" data-index="${index}" onclick="seleccionarResultadoProducto(${index})">
                <div class="resultado-producto-header">
                    <div>
                        <div class="resultado-producto-nombre">${nombre}</div>
                        <div class="resultado-producto-codigo">Código: ${codigo}</div>
                    </div>
                    <div class="resultado-producto-precio">$${precio}</div>
                </div>
                <div class="resultado-producto-detalles">
                    <span class="detalle-badge iva">IVA ${iva}</span>
                    ${tieneRetencion ? `<span class="detalle-badge retencion">ReteFuente ${tarifaRetencion}%</span>` : ''}
                </div>
            </div>
        `;
    });

    listaResultados.innerHTML = html;
    listaResultados.style.display = 'flex';
    sinResultados.style.display = 'none';

    indiceSeleccionadoProducto = -1;
    productoSeleccionadoTemp = null;
    document.getElementById('btnConfirmarProducto').disabled = true;
}

function seleccionarResultadoProducto(index) {
    const termino = document.getElementById('inputBusquedaProducto').value.trim().toLowerCase();

    const resultados = todosLosProductos.filter(producto => {
        const nombre = (producto.nombre || producto.descripcion || '').toLowerCase();
        const codigo = (producto.codigo || '').toLowerCase();
        const categoria = (producto.categoria || '').toLowerCase();

        return nombre.includes(termino) ||
            codigo.includes(termino) ||
            categoria.includes(termino);
    });

    if (index < 0 || index >= resultados.length) {
        console.error('❌ Índice fuera de rango');
        return;
    }

    document.querySelectorAll('.resultado-producto').forEach(item => {
        item.classList.remove('seleccionado');
    });

    const item = document.querySelector(`.resultado-producto[data-index="${index}"]`);
    if (item) {
        item.classList.add('seleccionado');
    }

    productoSeleccionadoTemp = resultados[index];
    indiceSeleccionadoProducto = index;

    document.getElementById('btnConfirmarProducto').disabled = false;

    console.log('✅ Producto seleccionado:', productoSeleccionadoTemp);
}

function navegarResultadosProductoTeclado(event) {
    const items = document.querySelectorAll('.resultado-producto');

    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        indiceSeleccionadoProducto = Math.min(indiceSeleccionadoProducto + 1, items.length - 1);
        seleccionarResultadoProducto(indiceSeleccionadoProducto);
        items[indiceSeleccionadoProducto].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    else if (event.key === 'ArrowUp') {
        event.preventDefault();
        indiceSeleccionadoProducto = Math.max(indiceSeleccionadoProducto - 1, 0);
        seleccionarResultadoProducto(indiceSeleccionadoProducto);
        items[indiceSeleccionadoProducto].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    else if (event.key === 'Enter' && productoSeleccionadoTemp) {
        event.preventDefault();
        confirmarSeleccionProducto();
    }
    else if (event.key === 'Escape') {
        event.preventDefault();
        cerrarModalProductos();
    }
}

function confirmarSeleccionProducto() {
    if (!productoSeleccionadoTemp) {
        console.error('❌ No hay producto seleccionado');
        return;
    }

    agregarProductoAFactura(productoSeleccionadoTemp);

    cerrarModalProductos();
}

// ========== AGREGAR PRODUCTO CON RETENCIÓN AUTOMÁTICA ==========
function agregarProductoAFactura(producto) {
    // ── Perfil tributario del cliente seleccionado ──────────────────────────
    // La retención aplica en la factura SOLO si:
    //   1. El producto tiene retención configurada (producto.retencion.aplica)
    //   2. El cliente ES agente retenedor (esAgenteRetenedor = true)
    //   3. El cliente NO es autorretenedor (esAutorretenedor = false)
    //      → Los autorretenedores gestionan la retención internamente; nosotros
    //        no la cobramos en la factura (Art. 368-2 E.T. Colombia).
    const esAgenteRetenedor = clienteSeleccionadoGlobal?.esAgenteRetenedor ?? false;
    const esAutorretenedor  = clienteSeleccionadoGlobal?.esAutorretenedor  ?? false;

    const productoTieneRetencion = producto.retencion?.aplica || false;

    const retencionAplicaAlCliente =
        productoTieneRetencion &&
        esAgenteRetenedor      &&
        !esAutorretenedor;

    const item = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        productoId: producto.id,
        nombre: producto.nombre || producto.descripcion,
        codigo: producto.codigo || '',
        cantidad: 1,
        precioUnitario: parseFloat(producto.precioVenta) || 0,
        descuentoPorcentaje: 0,
        descuentoValor: 0,
        tarifaIva: parseTarifaIva(producto.tarifaIva),

        // ── Retención: combina configuración del producto + perfil del cliente ──
        tieneRetencion:           retencionAplicaAlCliente,   // ← decide si se calcula
        productoTieneRetencion,                               // ← para mostrar el badge informativo
        clienteEsAgenteRetenedor: esAgenteRetenedor,
        clienteEsAutorretenedor:  esAutorretenedor,

        conceptoRetencion:   producto.retencion?.conceptoId  || '',
        nombreRetencion:     producto.retencion?.nombre       || '',
        categoriaRetencion:  producto.retencion?.categoria    || '',
        tarifaRetencion:     parseFloat(producto.retencion?.tarifa) || 0,
        baseMinimaRetencion: producto.retencion?.baseMinimaP  || 0,
        valorRetencion: 0
    };

    calcularSubtotalItem(item);
    itemsFactura.push(item);

    // ── Log descriptivo ────────────────────────────────────────────────────
    if (productoTieneRetencion) {
        if (retencionAplicaAlCliente) {
            console.log(`✅ ${item.nombre}: ReteFuente ${item.tarifaRetencion}% aplicada (cliente es agente retenedor)`);
        } else if (esAutorretenedor) {
            console.log(`⚡ ${item.nombre}: ReteFuente omitida — cliente es autorretenedor`);
        } else {
            console.log(`ℹ️ ${item.nombre}: ReteFuente omitida — cliente NO es agente retenedor`);
        }
    }
    console.log('📊 Total items:', itemsFactura.length);

    renderizarListaProductos();
}

// ========== PARSEAR TARIFA IVA ==========
function parseTarifaIva(tarifaIva) {
    if (typeof tarifaIva === 'number') return tarifaIva;
    
    const tarifaStr = String(tarifaIva).toLowerCase();
    
    if (tarifaStr === '0%' || tarifaStr === 'exento' || tarifaStr === 'excluido') {
        return 0;
    } else if (tarifaStr === '5%') {
        return 5;
    } else if (tarifaStr === '19%') {
        return 19;
    }
    
    const numero = parseFloat(tarifaStr);
    return isNaN(numero) ? 0 : numero;
}

// ========== CALCULAR SUBTOTAL CON RETENCIÓN ==========
function calcularSubtotalItem(item) {
    // 1. Base sin descuento
    const baseOriginal = item.cantidad * item.precioUnitario;

    // 2. Calcular descuento en pesos
    item.descuentoValor = baseOriginal * (item.descuentoPorcentaje / 100);

    // 3. Base después del descuento
    const baseConDescuento = baseOriginal - item.descuentoValor;

    // 4. Calcular IVA sobre la base con descuento
    const valorIva = baseConDescuento * (item.tarifaIva / 100);

    // 5. Guardar valores
    item.base = baseConDescuento;
    item.valorIva = valorIva;
    item.subtotal = baseConDescuento + valorIva;

    // 6. ========== CALCULAR RETENCIÓN AUTOMÁTICA ==========
    if (item.tieneRetencion) {
        // Validar base mínima
        if (item.baseMinimaRetencion > 0 && baseConDescuento < item.baseMinimaRetencion) {
            // No aplica retención porque no supera la base mínima
            item.valorRetencion = 0;
            console.warn(`⚠️ ${item.nombre}: No supera base mínima ($${formatearNumero(item.baseMinimaRetencion)})`);
        } else {
            // Calcular retención sobre la base CON descuento
            const tarifaNum = typeof item.tarifaRetencion === 'number' 
                ? item.tarifaRetencion 
                : parseFloat(item.tarifaRetencion) || 0;
            
            item.valorRetencion = baseConDescuento * (tarifaNum / 100);
            
            console.log(`✅ ${item.nombre}: ReteFuente ${tarifaNum}% = $${formatearNumero(item.valorRetencion)}`);
        }
    } else {
        item.valorRetencion = 0;
    }

    return item;
}

function renderizarListaProductos() {
    const lista = document.getElementById('listaProductos');
    const sinProductos = document.getElementById('sinProductos');

    if (itemsFactura.length === 0) {
        lista.innerHTML = '';
        sinProductos.style.display = 'flex';
        actualizarResumen();
        return;
    }

    sinProductos.style.display = 'none';

    let html = '';

    itemsFactura.forEach((item, index) => {
        // ========== BADGE DE RETENCIÓN ==========
        let retencionBadge = '';

        if (item.productoTieneRetencion) {
            // El producto tiene retención configurada — pero puede no aplicar al cliente
            const tarifaTexto = typeof item.tarifaRetencion === 'number'
                ? `${item.tarifaRetencion}%`
                : item.tarifaRetencion;

            if (item.tieneRetencion && item.valorRetencion > 0) {
                // ✅ Aplica y supera base mínima
                retencionBadge = `
                    <div class="producto-campo">
                        <label>Retención</label>
                        <span class="badge-retencion-activa">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                            ReteFuente ${tarifaTexto} = -$${formatearNumero(item.valorRetencion)}
                        </span>
                    </div>
                `;
            } else if (item.tieneRetencion && item.valorRetencion === 0) {
                // ⚠️ Aplica al cliente pero no supera la base mínima
                retencionBadge = `
                    <div class="producto-campo">
                        <label>Retención</label>
                        <span class="badge-retencion-inactiva" title="No supera la base mínima de $${formatearNumero(item.baseMinimaRetencion)}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            ReteFuente ${tarifaTexto} (No supera base mínima)
                        </span>
                    </div>
                `;
            } else if (item.clienteEsAutorretenedor) {
                // ⚡ Autorretenedor — la gestiona él internamente
                retencionBadge = `
                    <div class="producto-campo">
                        <label>Retención</label>
                        <span class="badge-retencion-autorretenedor" title="El cliente es autorretenedor y gestiona la retención internamente">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ReteFuente ${tarifaTexto} — Autorretenedor (no aplica en factura)
                        </span>
                    </div>
                `;
            } else {
                // ℹ️ Cliente no es agente retenedor — no se cobra
                retencionBadge = `
                    <div class="producto-campo">
                        <label>Retención</label>
                        <span class="badge-retencion-no-aplica" title="El cliente no es agente retenedor; no se le cobra ReteFuente">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                            </svg>
                            ReteFuente ${tarifaTexto} — No aplica (cliente no retenedor)
                        </span>
                    </div>
                `;
            }
        } else {
            // El producto simplemente no tiene retención configurada
            retencionBadge = `
                <div class="producto-campo">
                    <label>Retención</label>
                    <span class="badge-sin-retencion">No aplica</span>
                </div>
            `;
        }

        html += `
            <div class="producto-item">
                <div class="producto-item-header">
                    <div>
                        <div class="producto-nombre">${item.nombre}</div>
                        <div class="producto-codigo">Código: ${item.codigo || 'N/A'}</div>
                    </div>
                    <button type="button" class="btn-eliminar-producto" onclick="eliminarProducto(${index})" title="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="producto-item-body">
                    <div class="producto-campo">
                        <label>Cantidad</label>
                        <input type="number" min="1" value="${item.cantidad}" onchange="cambiarCantidad(${index}, this.value)">
                    </div>
                    <div class="producto-campo">
                        <label>Precio Unitario</label>
                        <input type="text" value="$${formatearNumero(item.precioUnitario)}" readonly>
                    </div>
                    <div class="producto-campo">
                        <label>Descuento (%)</label>
                        <input type="number" class="campo-descuento" min="0" max="100" step="0.1" value="${item.descuentoPorcentaje}" onchange="cambiarDescuento(${index}, this.value)" placeholder="0">
                    </div>
                    <div class="producto-campo">
                        <label>IVA</label>
                        <span class="badge-iva">${item.tarifaIva}%</span>
                    </div>
                    ${retencionBadge}
                </div>
            </div>
        `;
    });

    lista.innerHTML = html;

    console.log('📋 Lista de productos renderizada');

    actualizarResumen();
}

function cambiarCantidad(index, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);

    if (cantidad < 1) {
        mostrarError('La cantidad debe ser mayor a 0');
        itemsFactura[index].cantidad = 1;
        renderizarListaProductos();
        return;
    }

    itemsFactura[index].cantidad = cantidad;
    calcularSubtotalItem(itemsFactura[index]);

    renderizarListaProductos();

    console.log(`✏️ Cantidad actualizada: ${cantidad}`);

    actualizarResumen();
}


function cambiarDescuento(index, nuevoDescuento) {
    const descuento = parseFloat(nuevoDescuento) || 0;

    if (descuento < 0 || descuento > 100) {
        mostrarError('El descuento debe estar entre 0% y 100%');
        itemsFactura[index].descuentoPorcentaje = 0;
        renderizarListaProductos();
        return;
    }

    itemsFactura[index].descuentoPorcentaje = descuento;
    calcularSubtotalItem(itemsFactura[index]);

    renderizarListaProductos();

    console.log(`💰 Descuento actualizado: ${descuento}%`);

    actualizarResumen();
}


function eliminarProducto(index) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) {
        return;
    }

    const productoEliminado = itemsFactura[index];
    itemsFactura.splice(index, 1);

    console.log('🗑️ Producto eliminado:', productoEliminado);
    console.log('📊 Items restantes:', itemsFactura.length);

    renderizarListaProductos();

    actualizarResumen();
}

function irACrearProductoDesdeModal() {
    console.log('➕ Redirigiendo a crear producto...');

    guardarEstadoFactura();

    window.location.href = './Mis-productos.html?returnTo=nueva-factura';
}

// ==========================================
// FASE 3: PANEL DE RESUMEN CON RETENCIONES
// ==========================================

function actualizarResumen() {
    if (itemsFactura.length === 0) {
        mostrarResumenVacio();
        return;
    }

    const totales = calcularTotalesFactura();

    document.getElementById('resumenVacio').style.display = 'none';
    document.getElementById('resumenValores').style.display = 'block';

    actualizarValor('resumenSubtotal', totales.subtotal);
    
    // Mostrar descuentos SIEMPRE
    const lineaDescuentos = document.getElementById('lineaDescuentos');
    if (lineaDescuentos) {
        lineaDescuentos.style.display = 'flex';
        actualizarValor('resumenDescuentos', -totales.totalDescuentos, true);
    }
    
    actualizarValor('resumenTotalIva', totales.totalIva);

    actualizarDesgIoseIva(totales.ivasPorTarifa);

    // ========== RETENCIONES DE PRODUCTOS ==========
    if (totales.totalRetenciones > 0) {
        document.getElementById('lineaRetenciones').style.display = 'flex';
        actualizarValor('resumenRetenciones', -totales.totalRetenciones, true);
        actualizarDesgIoseRetenciones(totales.retencionesPorConcepto);
    } else {
        document.getElementById('lineaRetenciones').style.display = 'none';
        document.getElementById('desgIoseRetenciones').style.display = 'none';
    }

    if (totales.otrosImpuestos > 0) {
        document.getElementById('lineaOtrosImpuestos').style.display = 'flex';
        actualizarValor('resumenOtrosImpuestos', totales.otrosImpuestos);
    } else {
        document.getElementById('lineaOtrosImpuestos').style.display = 'none';
    }

    // ── Retenciones fiscales ────────────────────────────────────────────────
    if (totales.totalRetencionesFiscales > 0) {
        document.getElementById('lineaRetencionesFiscales').style.display = 'flex';
        actualizarValor('resumenRetencionesFiscales', -totales.totalRetencionesFiscales, true);
        actualizarDesgIoseRetencionesFiscales();
    } else {
        document.getElementById('lineaRetencionesFiscales').style.display = 'none';
        document.getElementById('desgIoseRetencionesFiscales').style.display = 'none';
    }

    // ── Total principal: siempre muestra el neto real a pagar ───────────────
    // Cuando hay retenciones (de producto o fiscales), el "Total Factura" es
    // el bruto (subtotal + IVA) y el valor que el cliente efectivamente paga
    // es totalACobrar. Mostramos este último en el bloque destacado para evitar
    // confusión, y ajustamos la etiqueta según haya o no deducciones.
    const hayRetenciones = totales.totalRetenciones > 0 || totales.totalRetencionesFiscales > 0;

    const labelTotal = document.querySelector('.resumen-label-total');
    if (labelTotal) {
        labelTotal.textContent = hayRetenciones ? 'Total a Pagar' : 'Total Factura';
    }

    // El valor destacado = neto real (totalACobrar ya descuenta todo)
    actualizarValor('resumenTotal', totales.totalACobrar);

    // La línea secundaria "Total a Cobrar" ya no es necesaria porque el bloque
    // principal muestra el neto; la ocultamos siempre para evitar duplicidad.
    document.getElementById('lineaCobrar').style.display = 'none';

    console.log('📊 Resumen actualizado:', totales);

    // FASE 4: Actualizar instrumentos si hay productos
    if (instrumentosCobro.length > 0 && formaPagoSeleccionada === 'contado') {
        const totales = calcularTotalesFactura();
        const totalACobrar = totales.totalACobrar;

        if (instrumentosCobro[0]) {
            instrumentosCobro[0].importe = totalACobrar;
            renderizarInstrumentos();
        }
    }
}

function mostrarResumenVacio() {
    document.getElementById('resumenVacio').style.display = 'flex';
    document.getElementById('resumenValores').style.display = 'none';
}

// ========== CALCULAR TOTALES CON RETENCIONES ==========
function calcularTotalesFactura() {
    let subtotal = 0;
    let totalDescuentos = 0;
    let totalIva = 0;
    let totalRetenciones = 0; // Retenciones de productos
    let otrosImpuestos = 0;

    const ivasPorTarifa = {};
    const retencionesPorConcepto = {}; // ← NUEVO: Por concepto en lugar de por tipo

    itemsFactura.forEach(item => {
        totalDescuentos += item.descuentoValor;
        subtotal += item.base;
        totalIva += item.valorIva;

        if (item.tarifaIva > 0) {
            if (!ivasPorTarifa[item.tarifaIva]) {
                ivasPorTarifa[item.tarifaIva] = 0;
            }
            ivasPorTarifa[item.tarifaIva] += item.valorIva;
        }

        // ========== RETENCIONES DE PRODUCTOS ==========
        if (item.tieneRetencion && item.valorRetencion > 0) {
            totalRetenciones += item.valorRetencion;

            // Agrupar por concepto de retención
            const conceptoKey = item.conceptoRetencion || `${item.nombreRetencion}`;
            if (!retencionesPorConcepto[conceptoKey]) {
                retencionesPorConcepto[conceptoKey] = {
                    nombre: item.nombreRetencion,
                    tarifa: item.tarifaRetencion,
                    valor: 0
                };
            }
            retencionesPorConcepto[conceptoKey].valor += item.valorRetencion;
        }
    });

    const totalFactura = subtotal + totalIva + otrosImpuestos;

    // Calcular retenciones fiscales
    let totalRetencionesFiscales = 0;
    if (retencionesFiscales.retefuente.activa) totalRetencionesFiscales += retencionesFiscales.retefuente.valor;
    if (retencionesFiscales.reteiva.activa) totalRetencionesFiscales += retencionesFiscales.reteiva.valor;
    if (retencionesFiscales.reteica.activa) totalRetencionesFiscales += retencionesFiscales.reteica.valor;

    const totalACobrar = totalFactura - totalRetenciones - totalRetencionesFiscales;

    return {
        subtotal,
        totalDescuentos,
        totalIva,
        totalRetenciones,          // Retenciones de productos
        totalRetencionesFiscales,  // Retenciones fiscales (modal)
        otrosImpuestos,
        totalFactura,
        totalACobrar,
        ivasPorTarifa,
        retencionesPorConcepto     // ← NUEVO
    };
}

function actualizarValor(elementId, valor, esNegativo = false) {
    const elemento = document.getElementById(elementId);
    if (!elemento) return;

    const valorFormateado = esNegativo
        ? `-$${formatearNumero(Math.abs(valor))}`
        : `$${formatearNumero(valor)}`;

    if (elemento.textContent !== valorFormateado) {
        elemento.textContent = valorFormateado;
        elemento.classList.add('actualizado');
        setTimeout(() => {
            elemento.classList.remove('actualizado');
        }, 300);
    }
}

function actualizarDesgIoseIva(ivasPorTarifa) {
    const container = document.getElementById('desgIoseIva');

    const tarifas = Object.keys(ivasPorTarifa);

    if (tarifas.length <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    let html = '';
    tarifas.forEach(tarifa => {
        const valor = ivasPorTarifa[tarifa];
        html += `
            <div class="resumen-desglose-item">
                <span class="resumen-desglose-label">IVA ${tarifa}%</span>
                <span class="resumen-desglose-valor">$${formatearNumero(valor)}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ========== DESGLOSE DE RETENCIONES DE PRODUCTOS ==========
function actualizarDesgIoseRetenciones(retencionesPorConcepto) {
    const container = document.getElementById('desgIoseRetenciones');

    const conceptos = Object.keys(retencionesPorConcepto);

    if (conceptos.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    let html = '';
    conceptos.forEach(key => {
        const ret = retencionesPorConcepto[key];
        const tarifaTexto = typeof ret.tarifa === 'number' ? `${ret.tarifa}%` : ret.tarifa;
        
        html += `
            <div class="resumen-desglose-item">
                <span class="resumen-desglose-label">${ret.nombre} ${tarifaTexto}</span>
                <span class="resumen-desglose-valor">-$${formatearNumero(ret.valor)}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function actualizarNumeroFacturaResumen() {
    if (configuracionFacturacion && configuracionFacturacion.resolucion) {
        const prefijo = configuracionFacturacion.resolucion.prefijo || 'FACT';
        const numero = numeroFacturaActual || 1;
        const numeroFormateado = numero.toString().padStart(5, '0');

        document.getElementById('numeroFacturaPreview').textContent = `${prefijo}-${numeroFormateado}`;
    }
}

// ==========================================
// FASE 4: FORMAS Y MEDIOS DE PAGO + FECHAS
// ==========================================

// ========== INICIALIZAR FECHAS ==========
function inicializarFechas() {
    const hoy = new Date();
    const fechaFormateada = formatearFechaParaInput(hoy);

    const inputFechaEmision = document.getElementById('fechaEmision');
    if (inputFechaEmision) {
        inputFechaEmision.value = fechaFormateada;
        console.log('📅 Fecha de emisión establecida:', fechaFormateada);
    }
}

// ========== FORMATEAR FECHA PARA INPUT ==========
function formatearFechaParaInput(fecha) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

// ========== CAMBIAR FORMA DE PAGO ==========
function cambiarFormaPago(tipo) {
    formaPagoSeleccionada = tipo;

    const campoMedioPago = document.getElementById('campoMedioPago');
    const campoFechaVencimiento = document.getElementById('campoFechaVencimiento');
    const seccionInstrumentos = document.getElementById('seccionInstrumentos');

    if (tipo === 'contado') {
        // CONTADO: Mostrar medio de pago, ocultar fecha vencimiento
        if (campoMedioPago) campoMedioPago.style.display = 'block';
        if (campoFechaVencimiento) campoFechaVencimiento.style.display = 'none';
        if (seccionInstrumentos) seccionInstrumentos.style.display = 'block';

        // Limpiar fecha de vencimiento
        const inputVencimiento = document.getElementById('fechaVencimiento');
        if (inputVencimiento) {
            inputVencimiento.value = '';
            inputVencimiento.classList.remove('error');

            // Remover mensaje de error si existe
            const errorPrevio = inputVencimiento.parentElement.querySelector('.mensaje-fecha-error');
            if (errorPrevio) errorPrevio.remove();
        }

        console.log('📄 Forma de pago: De Contado');
    } else {
        // CRÉDITO: Ocultar medio de pago, mostrar fecha vencimiento
        if (campoMedioPago) campoMedioPago.style.display = 'none';
        if (campoFechaVencimiento) campoFechaVencimiento.style.display = 'block';
        if (seccionInstrumentos) seccionInstrumentos.style.display = 'none';

        // Limpiar selección de medio de pago e instrumentos
        const selectMedio = document.getElementById('medioPago');
        if (selectMedio) selectMedio.value = '';
        medioPagoSeleccionado = '';
        instrumentosCobro = [];

        // Establecer fecha de vencimiento por defecto (+30 días)
        const inputVencimiento = document.getElementById('fechaVencimiento');
        if (inputVencimiento && !inputVencimiento.value) {
            agregarDias(30);
        }

        console.log('💳 Forma de pago: Crédito');
    }
}

// ========== AGREGAR DÍAS A LA FECHA ==========
function agregarDias(dias) {
    const inputEmision = document.getElementById('fechaEmision');
    const inputVencimiento = document.getElementById('fechaVencimiento');

    if (!inputEmision || !inputVencimiento) return;

    let fechaEmision = inputEmision.value ? new Date(inputEmision.value + 'T00:00:00') : new Date();

    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

    inputVencimiento.value = formatearFechaParaInput(fechaVencimiento);

    validarFechaVencimiento();

    console.log(`📅 Fecha vencimiento: +${dias} días = ${formatearFechaParaInput(fechaVencimiento)}`);
}

// ========== VALIDAR FECHA DE VENCIMIENTO ==========
function validarFechaVencimiento() {
    const inputEmision = document.getElementById('fechaEmision');
    const inputVencimiento = document.getElementById('fechaVencimiento');

    if (!inputEmision || !inputVencimiento) return true;

    const fechaEmision = new Date(inputEmision.value + 'T00:00:00');
    const fechaVencimiento = new Date(inputVencimiento.value + 'T00:00:00');

    // Remover error previo
    inputVencimiento.classList.remove('error');

    // Validar que vencimiento sea mayor a emisión
    if (fechaVencimiento <= fechaEmision) {
        inputVencimiento.classList.add('error');

        // Mostrar panel de error elegante
        mostrarPanelErrorFechas(fechaEmision, fechaVencimiento);

        console.warn('⚠️ Fecha de vencimiento inválida');
        return false;
    }

    // Calcular días de crédito
    const diffTime = Math.abs(fechaVencimiento - fechaEmision);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    console.log(`✅ Fecha vencimiento válida: ${diffDays} días de crédito`);
    return true;
}

// ========== SELECCIONAR MEDIO DE PAGO ==========
function seleccionarMedioPago() {
    const select = document.getElementById('medioPago');
    medioPagoSeleccionado = select.value;

    if (!medioPagoSeleccionado) {
        instrumentosCobro = [];
        renderizarInstrumentos();
        return;
    }

    console.log('💰 Medio de pago seleccionado:', medioPagoSeleccionado);

    crearInstrumentoAutomatico();
}

// ========== CREAR INSTRUMENTO AUTOMÁTICO ==========
function crearInstrumentoAutomatico() {
    instrumentosCobro = [];

    const totales = calcularTotalesFactura();
    const montoACobrar = totales.totalACobrar;

    const instrumento = {
        id: Date.now().toString(),
        tipoCuenta: obtenerTipoCuenta(medioPagoSeleccionado),
        cuenta: '',
        moneda: 'Pesos Colombianos',
        cotizacion: 1.0000,
        importe: montoACobrar,
        nroCheque: '',
        vtoCheque: '',
        banco: '',
        descripcion: obtenerDescripcionMedioPago(medioPagoSeleccionado)
    };

    instrumentosCobro.push(instrumento);

    renderizarInstrumentos();
}

// ========== OBTENER TIPO DE CUENTA ==========
function obtenerTipoCuenta(medioPago) {
    const tipos = {
        'efectivo': 'Caja',
        'transferencia_credito': 'Banco',
        'transferencia_debito': 'Banco',
        'cheque': 'Banco',
        'consignacion': 'Banco',
        'tarjeta_debito': 'Banco',
        'tarjeta_credito': 'Banco',
        'otro': 'Caja'
    };

    return tipos[medioPago] || 'Caja';
}

// ========== OBTENER DESCRIPCIÓN ==========
function obtenerDescripcionMedioPago(medioPago) {
    const descripciones = {
        'efectivo': 'Pago en efectivo',
        'transferencia_credito': 'Transferencia bancaria',
        'transferencia_debito': 'Transferencia bancaria',
        'cheque': 'Pago con cheque',
        'consignacion': 'Consignación bancaria',
        'tarjeta_debito': 'Pago con tarjeta débito',
        'tarjeta_credito': 'Pago con tarjeta crédito',
        'otro': 'Otro medio de pago'
    };

    return descripciones[medioPago] || 'Pago';
}

// ========== RENDERIZAR INSTRUMENTOS ==========
function renderizarInstrumentos() {
    const lista = document.getElementById('listaInstrumentos');
    const sinInstrumentos = document.getElementById('sinInstrumentos');

    if (instrumentosCobro.length === 0) {
        lista.innerHTML = '';
        sinInstrumentos.style.display = 'flex';
        actualizarTotalesInstrumentos();
        return;
    }

    sinInstrumentos.style.display = 'none';

    let html = '';

    instrumentosCobro.forEach((inst, index) => {
        const esCheque = medioPagoSeleccionado === 'cheque';

        html += `
            <div class="instrumento-item">
                <div class="instrumento-header">
                    <div class="instrumento-tipo">
                        <span>${inst.tipoCuenta}</span>
                        <span class="instrumento-badge">${medioPagoSeleccionado.replace('_', ' ')}</span>
                    </div>
                    <button type="button" class="btn-eliminar-instrumento" onclick="eliminarInstrumento(${index})" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="instrumento-grid">
                    <div class="instrumento-campo">
                        <label>Tipo Cuenta</label>
                        <input type="text" value="${inst.tipoCuenta}" readonly>
                    </div>
                    <div class="instrumento-campo">
                        <label>Cuenta</label>
                        <input type="text" value="${inst.cuenta}" onchange="actualizarCampoInstrumento(${index}, 'cuenta', this.value)" placeholder="Número de cuenta">
                    </div>
                    <div class="instrumento-campo">
                        <label>Moneda</label>
                        <select onchange="actualizarCampoInstrumento(${index}, 'moneda', this.value)">
                            <option value="Pesos Colombianos" selected>Pesos Colombianos</option>
                            <option value="Dólares">Dólares</option>
                            <option value="Euros">Euros</option>
                        </select>
                    </div>
                    <div class="instrumento-campo">
                        <label>Cotización</label>
                        <input type="number" step="0.0001" value="${inst.cotizacion}" onchange="actualizarCampoInstrumento(${index}, 'cotizacion', this.value)">
                    </div>
                    <div class="instrumento-campo">
                        <label>Importe</label>
                        <input type="number" step="0.01" value="${inst.importe}" onchange="actualizarImporteInstrumento(${index}, this.value)">
                    </div>
                    ${esCheque ? `
                        <div class="instrumento-campo">
                            <label>Nro. Cheque</label>
                            <input type="text" value="${inst.nroCheque}" onchange="actualizarCampoInstrumento(${index}, 'nroCheque', this.value)" placeholder="000000">
                        </div>
                        <div class="instrumento-campo">
                            <label>Vto. Cheque</label>
                            <input type="date" value="${inst.vtoCheque}" onchange="actualizarCampoInstrumento(${index}, 'vtoCheque', this.value)">
                        </div>
                        <div class="instrumento-campo">
                            <label>Banco</label>
                            <input type="text" value="${inst.banco}" onchange="actualizarCampoInstrumento(${index}, 'banco', this.value)" placeholder="Nombre del banco">
                        </div>
                    ` : ''}
                    <div class="instrumento-campo" style="grid-column: span ${esCheque ? '1' : '3'};">
                        <label>Descripción</label>
                        <input type="text" value="${inst.descripcion}" onchange="actualizarCampoInstrumento(${index}, 'descripcion', this.value)">
                    </div>
                </div>
            </div>
        `;
    });

    lista.innerHTML = html;

    actualizarTotalesInstrumentos();

    console.log('📝 Instrumentos renderizados:', instrumentosCobro.length);
}

// ========== ACTUALIZAR CAMPO DE INSTRUMENTO ==========
function actualizarCampoInstrumento(index, campo, valor) {
    if (instrumentosCobro[index]) {
        instrumentosCobro[index][campo] = valor;
        console.log(`✏️ Campo ${campo} actualizado:`, valor);
    }
}

// ========== ACTUALIZAR IMPORTE ==========
function actualizarImporteInstrumento(index, valor) {
    const importe = parseFloat(valor) || 0;

    if (instrumentosCobro[index]) {
        instrumentosCobro[index].importe = importe;
        actualizarTotalesInstrumentos();
        console.log(`💵 Importe actualizado: $${formatearNumero(importe)}`);
    }
}

// ========== ELIMINAR INSTRUMENTO ==========
function eliminarInstrumento(index) {
    if (!confirm('¿Eliminar este instrumento de cobro?')) {
        return;
    }

    instrumentosCobro.splice(index, 1);
    renderizarInstrumentos();

    console.log('🗑️ Instrumento eliminado');
}

// ========== ACTUALIZAR TOTALES DE INSTRUMENTOS ==========
function actualizarTotalesInstrumentos() {
    let totalInstrumentos = 0;

    instrumentosCobro.forEach(inst => {
        totalInstrumentos += parseFloat(inst.importe) || 0;
    });

    const totales = calcularTotalesFactura();
    const totalACobrar = totales.totalACobrar;

    document.getElementById('totalInstrumentos').textContent = `$${formatearNumero(totalInstrumentos)}`;

    const diferencia = totalACobrar - totalInstrumentos;

    const divDiferencia = document.getElementById('diferencia');
    const valorDiferencia = document.getElementById('valorDiferencia');

    if (Math.abs(diferencia) > 0.01) {
        divDiferencia.style.display = 'flex';
        valorDiferencia.textContent = `$${formatearNumero(Math.abs(diferencia))}`;

        if (diferencia < 0) {
            valorDiferencia.classList.remove('positiva');
            valorDiferencia.style.color = '#c62828';
        } else {
            valorDiferencia.classList.add('positiva');
            valorDiferencia.style.color = '#2d7a4b';
        }
    } else {
        divDiferencia.style.display = 'none';
    }

    console.log('💰 Total instrumentos:', totalInstrumentos, '| Diferencia:', diferencia);
}

// ========== INICIALIZAR FORMA DE PAGO ==========
function inicializarFormaPago() {
    const campoMedio = document.getElementById('campoMedioPago');
    const campoVencimiento = document.getElementById('campoFechaVencimiento');
    const seccionInst = document.getElementById('seccionInstrumentos');

    if (campoMedio) campoMedio.style.display = 'none';
    if (campoVencimiento) campoVencimiento.style.display = 'none';
    if (seccionInst) seccionInst.style.display = 'none';

    inicializarFechas();

    console.log('💳 Forma de pago inicializada');
}

// ========== VALIDAR PAGO ANTES DE GENERAR ==========
function validarPago() {
    const inputEmision = document.getElementById('fechaEmision');
    if (!inputEmision || !inputEmision.value) {
        mostrarError('Por favor seleccione la fecha de emisión');
        return false;
    }

    if (formaPagoSeleccionada === 'contado') {
        if (!medioPagoSeleccionado) {
            mostrarError('Por favor seleccione un medio de pago');
            return false;
        }

        if (instrumentosCobro.length === 0) {
            mostrarError('No hay instrumentos de cobro');
            return false;
        }

        const totales = calcularTotalesFactura();
        const totalACobrar = totales.totalACobrar;

        let totalInstrumentos = 0;
        instrumentosCobro.forEach(inst => {
            totalInstrumentos += parseFloat(inst.importe) || 0;
        });

        const diferencia = Math.abs(totalACobrar - totalInstrumentos);

        if (diferencia > 0.01) {
            mostrarError(`Los instrumentos no cuadran. Diferencia: $${formatearNumero(diferencia)}`);
            return false;
        }
    }
    else if (formaPagoSeleccionada === 'credito') {
        const inputVencimiento = document.getElementById('fechaVencimiento');
        if (!inputVencimiento || !inputVencimiento.value) {
            mostrarError('Por favor seleccione la fecha de vencimiento');
            return false;
        }

        if (!validarFechaVencimiento()) {
            return false;
        }
    }
    else {
        mostrarError('Por favor seleccione una forma de pago');
        return false;
    }

    return true;
}

// ========== OBTENER DATOS DE LA FACTURA ==========
function obtenerDatosFactura() {
    const fechaEmision = document.getElementById('fechaEmision').value;
    const fechaVencimiento = formaPagoSeleccionada === 'credito'
        ? document.getElementById('fechaVencimiento').value
        : null;

    return {
        fechaEmision,
        fechaVencimiento,
        formaPago: formaPagoSeleccionada,
        medioPago: formaPagoSeleccionada === 'contado' ? medioPagoSeleccionado : null,
        instrumentos: formaPagoSeleccionada === 'contado' ? instrumentosCobro : []
    };
}

// ==========================================
// ESTADO Y RESTAURACIÓN
// ==========================================

function guardarEstadoFactura() {
    const estado = {
        clienteId: clienteSeleccionadoGlobal?.id || null,
        items: itemsFactura,
        observaciones: document.getElementById('observaciones')?.value || '',
        timestamp: Date.now()
    };

    sessionStorage.setItem('facturaTemporal', JSON.stringify(estado));
    console.log('💾 Estado guardado:', estado);
}

function restaurarEstadoFactura() {
    const estadoGuardado = sessionStorage.getItem('facturaTemporal');

    if (!estadoGuardado) {
        console.log('ℹ️ No hay estado para restaurar');
        return;
    }

    console.log('♻️ Restaurando estado...');

    const estado = JSON.parse(estadoGuardado);

    if (estado.clienteId) {
        const cliente = todosLosClientes.find(c => c.id === estado.clienteId);

        if (cliente) {
            clienteSeleccionadoGlobal = cliente;
            mostrarClienteEnCard();
            console.log('✅ Cliente restaurado');
        }
    }

    if (estado.items && estado.items.length > 0) {
        itemsFactura = estado.items;
        renderizarListaProductos();
        console.log(`✅ ${itemsFactura.length} productos restaurados`);
    }

    if (estado.observaciones) {
        const obsTextarea = document.getElementById('observaciones');
        if (obsTextarea) {
            obsTextarea.value = estado.observaciones;
        }
    }

    sessionStorage.removeItem('facturaTemporal');
    console.log('🗑️ Estado temporal limpiado');
}

// ==========================================
// GENERAR FACTURA
// ==========================================

function generarFactura() {
    console.log('🚀 Generando factura...');

    if (!clienteSeleccionadoGlobal) {
        mostrarError('Por favor seleccione un cliente');
        return;
    }

    if (itemsFactura.length === 0) {
        mostrarError('Por favor agregue al menos un producto');
        return;
    }

    if (!validarPago()) {
        return;
    }

    const datosFactura  = obtenerDatosFactura();
    const totales       = calcularTotalesFactura();
    const config        = configuracionFacturacion;
    const usuario       = JSON.parse(sessionStorage.getItem('usuarioActual'));

    // ========== ARMAR OBJETO FACTURA ==========
    const prefijo          = config.resolucion.prefijo || 'FACT';
    const numeroFormateado = String(numeroFacturaActual).padStart(5, '0');
    const numeroCompleto   = `${prefijo}-${numeroFormateado}`;

    const factura = {
        id:             Date.now().toString(),
        numero:         numeroFacturaActual,
        prefijo,
        numeroCompleto,
        fecha:          datosFactura.fechaEmision,
        fechaVencimiento: datosFactura.fechaVencimiento || null,
        formaPago:      datosFactura.formaPago,
        medioPago:      datosFactura.medioPago || null,
        instrumentos:   datosFactura.instrumentos || [],
        cliente: {
            id:                 clienteSeleccionadoGlobal.id,
            nombre:             clienteSeleccionadoGlobal.nombreCompleto || clienteSeleccionadoGlobal.razonSocial,
            tipo:               clienteSeleccionadoGlobal.tipo,
            tipoDocumento:      clienteSeleccionadoGlobal.tipoDocumento || 'NIT',
            numeroDocumento:    clienteSeleccionadoGlobal.numeroDocumento || clienteSeleccionadoGlobal.nit,
            dv:                 clienteSeleccionadoGlobal.dv || '',
            telefono:           clienteSeleccionadoGlobal.telefono || '',
            email:              clienteSeleccionadoGlobal.email || '',
            direccion:          clienteSeleccionadoGlobal.direccion || '',
            esAgenteRetenedor:  clienteSeleccionadoGlobal.esAgenteRetenedor || false,
            esAutorretenedor:   clienteSeleccionadoGlobal.esAutorretenedor  || false,
        },
        items:                  itemsFactura,
        observaciones:          document.getElementById('observaciones')?.value?.trim() || '',
        subtotal:               totales.subtotal,
        totalDescuentos:        totales.totalDescuentos,
        iva:                    totales.totalIva,
        retenciones:            totales.totalRetenciones,
        retencionesFiscales:    {
            retefuente: { ...retencionesFiscales.retefuente },
            reteiva:    { ...retencionesFiscales.reteiva },
            reteica:    { ...retencionesFiscales.reteica },
        },
        total:                  totales.totalFactura,
        totalACobrar:           totales.totalACobrar,
        retencionesPorConcepto: totales.retencionesPorConcepto,
        config: {
            razonSocial:    config.razonSocial,
            nit:            config.nit,
            regimen:        config.regimen,
            direccion:      config.direccion,
            ciudad:         config.ciudad,
            telefono:       config.telefono,
            email:          config.email,
            logo:           config.logo || null,
            resolucion:     config.resolucion.numero,
            prefijo:        config.resolucion.prefijo,
            pieFact:        config.pieFact || '',
            actividadEconomica: config.actividadEconomica || '',
        }
    };

    // ========== GUARDAR EN LOCALSTORAGE ==========
    const claveFacturas = `facturas_${usuario.email}`;
    const facturas      = JSON.parse(localStorage.getItem(claveFacturas)) || [];
    facturas.push(factura);
    localStorage.setItem(claveFacturas, JSON.stringify(facturas));

    // ========== INCREMENTAR NÚMERO DE RESOLUCIÓN ==========
    const claveConfig = `config_facturacion_${usuario.email}`;
    const configActual = JSON.parse(localStorage.getItem(claveConfig));
    configActual.resolucion.numeracionActual = numeroFacturaActual + 1;
    localStorage.setItem(claveConfig, JSON.stringify(configActual));

    console.log('✅ Factura guardada:', numeroCompleto);

    // ========== EXPORTAR PDF ==========
    exportarFacturaPDF(factura);
}

// ==========================================
// EXPORTAR FACTURA COMO PDF CON jsPDF
// ==========================================

function exportarFacturaPDF(factura) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // ── Paleta de colores ──
    const ROJO      = [128, 25, 49];
    const GRIS_OSC  = [45, 45, 45];
    const GRIS_MED  = [100, 100, 100];
    const GRIS_LIG  = [220, 220, 220];
    const BLANCO    = [255, 255, 255];
    const VERDE     = [45, 122, 75];
    const AZUL      = [25, 118, 210];

    const PW = 210; // ancho página A4
    const M  = 14;  // margen lateral
    const CW = PW - M * 2; // ancho útil
    let y    = 0;

    // ─────────────────────────────────────────
    // ENCABEZADO — banda roja superior
    // ─────────────────────────────────────────
    // Banda roja: altura 38 si hay actividad económica, 32 si no
    const tieneActividad = !!(factura.config.actividadEconomica);
    const altoBanda = tieneActividad ? 38 : 32;
    doc.setFillColor(...ROJO);
    doc.rect(0, 0, PW, altoBanda, 'F');

    // Logo (si existe)
    if (factura.config.logo) {
        try {
            doc.addImage(factura.config.logo, 'PNG', M, 4, 24, 24);
        } catch (e) { /* si falla, omitir logo */ }
    }

    // Datos de la empresa — columna izquierda
    const logoOffset = factura.config.logo ? 30 : 0;
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(factura.config.razonSocial || 'Empresa', M + logoOffset, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`NIT: ${factura.config.nit || ''}`, M + logoOffset, 19);
    doc.text(factura.config.direccion || '', M + logoOffset, 24);
    doc.text(`Tel: ${factura.config.telefono || ''}  |  ${factura.config.email || ''}`, M + logoOffset, 29);

    // Actividad económica (si existe) — línea adicional en la banda
    if (tieneActividad) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 220, 220); // blanco rosado para distinguirla
        doc.text(`Act. Económica: ${factura.config.actividadEconomica}`, M + logoOffset, 35);
    }

    // Número de factura — columna derecha
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLANCO);
    doc.setFontSize(11);
    doc.text('FACTURA ELECTRÓNICA', PW - M, 11, { align: 'right' });
    doc.setFontSize(16);
    doc.text(factura.numeroCompleto, PW - M, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Resolución DIAN No. ${factura.config.resolucion || ''}`, PW - M, 27, { align: 'right' });

    y = altoBanda + 4;

    // ─────────────────────────────────────────
    // FILA DE FECHAS Y PAGO
    // ─────────────────────────────────────────
    doc.setFillColor(245, 245, 247);
    doc.roundedRect(M, y, CW, 14, 2, 2, 'F');

    doc.setTextColor(...GRIS_OSC);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    const col = CW / 3;
    doc.text('FECHA DE EMISIÓN', M + 4, y + 5);
    doc.text('VENCIMIENTO', M + col + 4, y + 5);
    doc.text('FORMA DE PAGO', M + col * 2 + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(factura.fecha || '-', M + 4, y + 11);
    doc.text(factura.fechaVencimiento || 'Contado', M + col + 4, y + 11);
    const formaPagoTexto = factura.formaPago === 'contado' ? 'De Contado' : 'Crédito';
    doc.text(formaPagoTexto, M + col * 2 + 4, y + 11);

    y += 18;

    // ─────────────────────────────────────────
    // BLOQUE CLIENTE
    // ─────────────────────────────────────────
    doc.setFillColor(...ROJO);
    doc.roundedRect(M, y, CW, 6, 1, 1, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DATOS DEL CLIENTE', M + 3, y + 4.2);
    y += 8;

    const c = factura.cliente;
    const docCliente = c.tipo === 'natural'
        ? `${c.tipoDocumento}: ${c.numeroDocumento}`
        : `NIT: ${c.numeroDocumento}-${c.dv}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GRIS_OSC);
    doc.text(c.nombre, M, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS_MED);

    // columna izquierda
    doc.text(docCliente, M, y + 11);
    doc.text(`Tel: ${c.telefono || 'N/A'}`, M, y + 16);

    // columna derecha
    doc.text(`Email: ${c.email || 'N/A'}`, M + CW / 2, y + 11);
    doc.text(`Dir: ${c.direccion || 'N/A'}`, M + CW / 2, y + 16);

    // Badge agente retenedor / autorretenedor
    if (c.esAutorretenedor) {
        doc.setFillColor(...AZUL);
        doc.roundedRect(PW - M - 38, y + 1, 38, 6, 1, 1, 'F');
        doc.setTextColor(...BLANCO);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('AUTORRETENEDOR', PW - M - 19, y + 5.2, { align: 'center' });
    } else if (c.esAgenteRetenedor) {
        doc.setFillColor(...VERDE);
        doc.roundedRect(PW - M - 38, y + 1, 38, 6, 1, 1, 'F');
        doc.setTextColor(...BLANCO);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('AGENTE RETENEDOR', PW - M - 19, y + 5.2, { align: 'center' });
    }

    y += 22;

    // Separador
    doc.setDrawColor(...GRIS_LIG);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y);
    y += 4;

    // ─────────────────────────────────────────
    // TABLA DE ÍTEMS con autoTable
    // ─────────────────────────────────────────
    const filas = factura.items.map((item, i) => {
        const retencionTexto = item.tieneRetencion && item.valorRetencion > 0
            ? `-$${formatearNumero(item.valorRetencion)}`
            : (item.productoTieneRetencion && !item.tieneRetencion)
                ? (item.clienteEsAutorretenedor ? 'Autorretenedor' : 'No aplica')
                : '-';

        return [
            i + 1,
            item.nombre + (item.codigo ? `\nCód: ${item.codigo}` : ''),
            item.cantidad,
            `$${formatearNumero(item.precioUnitario)}`,
            `${item.descuentoPorcentaje > 0 ? item.descuentoPorcentaje + '%' : '-'}`,
            `${item.tarifaIva}%`,
            retencionTexto,
            `$${formatearNumero(item.base)}`
        ];
    });

    doc.autoTable({
        startY: y,
        head: [['#', 'Descripción', 'Cant.', 'P. Unit.', 'Dto.', 'IVA', 'ReteFuente', 'Subtotal']],
        body: filas,
        margin: { left: M, right: M },
        styles: {
            fontSize: 8,
            cellPadding: 2.5,
            textColor: GRIS_OSC,
            lineColor: GRIS_LIG,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: ROJO,
            textColor: BLANCO,
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 55 },
            2: { halign: 'center', cellWidth: 12 },
            3: { halign: 'right',  cellWidth: 22 },
            4: { halign: 'center', cellWidth: 12 },
            5: { halign: 'center', cellWidth: 12 },
            6: { halign: 'right',  cellWidth: 24 },
            7: { halign: 'right',  cellWidth: 27 },
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: (data) => {
            // Colorear columna ReteFuente negativa en verde oscuro
            if (data.column.index === 6 && data.section === 'body') {
                const val = data.cell.raw;
                if (val && val.startsWith('-$')) {
                    data.cell.styles.textColor = VERDE;
                    data.cell.styles.fontStyle = 'bold';
                }
                if (val === 'No aplica' || val === 'Autorretenedor') {
                    data.cell.styles.textColor = GRIS_MED;
                    data.cell.styles.fontSize = 7;
                }
            }
        }
    });

    y = doc.lastAutoTable.finalY + 4;

    // ─────────────────────────────────────────
    // PANEL DE TOTALES (derecha)
    // ─────────────────────────────────────────
    const panelX = M + CW - 75;
    const panelW = 75;

    // Fondo del panel
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(panelX, y, panelW, 68, 2, 2, 'F');

    const fila = (label, valor, bold = false, color = GRIS_OSC) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...GRIS_MED);
        doc.text(label, panelX + 3, y + 5);
        doc.setTextColor(...color);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(valor, panelX + panelW - 3, y + 5, { align: 'right' });
        y += 7;
    };

    const yPanelStart = y;
    y += 3;

    fila('Subtotal', `$${formatearNumero(factura.subtotal)}`);

    if (factura.totalDescuentos > 0) {
        fila('Descuentos', `-$${formatearNumero(factura.totalDescuentos)}`, false, [200, 100, 0]);
    }

    fila(`IVA`, `$${formatearNumero(factura.iva)}`);

    // Desglose retenciones de producto
    if (factura.retenciones > 0) {
        Object.values(factura.retencionesPorConcepto).forEach(ret => {
            const tarTxt = typeof ret.tarifa === 'number' ? `${ret.tarifa}%` : ret.tarifa;
            fila(`  ${ret.nombre} ${tarTxt}`, `-$${formatearNumero(ret.valor)}`, false, VERDE);
        });
    }

    // Línea divisoria
    doc.setDrawColor(...GRIS_LIG);
    doc.line(panelX + 2, yPanelStart + (y - yPanelStart), panelX + panelW - 2, yPanelStart + (y - yPanelStart));
    y += 3;

    // ── Bloque total destacado ───────────────────────────────────────────────
    // Cuando hay retenciones de producto, "TOTAL FACTURA" es el bruto y
    // "TOTAL A PAGAR" es el neto. Mostramos ambos para claridad:
    //  · Si hay retenciones de producto → línea gris con el bruto + línea roja con el neto
    //  · Si no hay retenciones            → solo línea roja con el total (son iguales)
    const hayRetProducto = factura.retenciones > 0;

    if (hayRetProducto) {
        // Línea secundaria: total bruto (antes de retenciones de producto)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...GRIS_MED);
        doc.text('Total Bruto', panelX + 3, y + 4);
        doc.text(`$${formatearNumero(factura.total)}`, panelX + panelW - 3, y + 4, { align: 'right' });
        y += 7;
    }

    // Línea principal: siempre el neto real a pagar
    const etiquetaTotal = hayRetProducto ? 'TOTAL A PAGAR' : 'TOTAL FACTURA';
    const valorTotal    = factura.totalACobrar;   // ← neto: ya descuenta retenciones de producto

    doc.setFillColor(...ROJO);
    doc.roundedRect(panelX, y - 2, panelW, 10, 1, 1, 'F');
    doc.setTextColor(...BLANCO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(etiquetaTotal, panelX + 3, y + 5);
    doc.setFontSize(10);
    doc.text(`$${formatearNumero(valorTotal)}`, panelX + panelW - 3, y + 5, { align: 'right' });
    y += 13;

    // Retenciones fiscales (si las hay)
    const rf = factura.retencionesFiscales;
    const hayRetFiscales = (rf.retefuente.activa && rf.retefuente.valor > 0)
                        || (rf.reteiva.activa    && rf.reteiva.valor    > 0)
                        || (rf.reteica.activa    && rf.reteica.valor    > 0);

    if (hayRetFiscales) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...GRIS_MED);
        doc.text('Retenciones Fiscales:', panelX + 3, y + 4);
        y += 6;

        if (rf.retefuente.activa && rf.retefuente.valor > 0)
            fila(`  ReteFuente ${rf.retefuente.tarifa}%`, `-$${formatearNumero(rf.retefuente.valor)}`, false, VERDE);
        if (rf.reteiva.activa    && rf.reteiva.valor    > 0)
            fila(`  ReteIVA ${rf.reteiva.tarifa}%`,       `-$${formatearNumero(rf.reteiva.valor)}`,    false, VERDE);
        if (rf.reteica.activa    && rf.reteica.valor    > 0)
            fila(`  ReteICA ${rf.reteica.tarifa}%`,       `-$${formatearNumero(rf.reteica.valor)}`,    false, VERDE);

        // Total a cobrar
        doc.setFillColor(...VERDE);
        doc.roundedRect(panelX, y - 2, panelW, 10, 1, 1, 'F');
        doc.setTextColor(...BLANCO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('TOTAL A COBRAR', panelX + 3, y + 5);
        doc.text(`$${formatearNumero(factura.totalACobrar)}`, panelX + panelW - 3, y + 5, { align: 'right' });
        y += 13;
    }

    // ─────────────────────────────────────────
    // OBSERVACIONES (izquierda, a la altura del panel)
    // ─────────────────────────────────────────
    if (factura.observaciones) {
        const obsY    = doc.lastAutoTable.finalY + 8;
        const obsMaxW = panelX - M - 4;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...ROJO);
        doc.text('Observaciones:', M, obsY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRIS_MED);
        const lines = doc.splitTextToSize(factura.observaciones, obsMaxW);
        doc.text(lines, M, obsY + 5);
    }

    // ─────────────────────────────────────────
    // TEXTO LEGAL — Ley 1231 de 2008
    // ─────────────────────────────────────────
    const TEXTO_LEGAL =
        'A esta factura de venta aplican las normas relativas a la letra de cambio ' +
        '(artículo 5 Ley 1231 de 2008). Con esta el Comprador declara haber recibido ' +
        'real y materialmente las mercancías o prestación de servicios descritos en este título.';

    // Calcular posición: encima del pie fijo, dejando espacio suficiente
    const pageH = doc.internal.pageSize.getHeight();
    const legalMaxW = CW;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...GRIS_MED);
    const legalLines = doc.splitTextToSize(TEXTO_LEGAL, legalMaxW);
    // Altura aproximada del bloque legal (líneas × interlineado ~3.5mm)
    const legalBlockH = legalLines.length * 3.5 + 8; // +8 por el recuadro y padding
    const legalY = pageH - 22 - legalBlockH;

    // Recuadro sutil detrás del texto legal
    doc.setFillColor(250, 248, 245);
    doc.setDrawColor(210, 200, 195);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, legalY, CW, legalBlockH, 1.5, 1.5, 'FD');

    // Etiqueta "Nota Legal"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...ROJO);
    doc.text('NOTA LEGAL', M + 3, legalY + 4.5);

    // Texto de la ley
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...GRIS_MED);
    doc.text(legalLines, M + 3, legalY + 8);

    // ─────────────────────────────────────────
    // PIE DE PÁGINA
    // ─────────────────────────────────────────

    // Línea decorativa
    doc.setDrawColor(...ROJO);
    doc.setLineWidth(0.8);
    doc.line(M, pageH - 22, M + CW, pageH - 22);
    if (factura.config.pieFact) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...GRIS_MED);
        const pieLines = doc.splitTextToSize(factura.config.pieFact, CW);
        doc.text(pieLines, PW / 2, pageH - 17, { align: 'center' });
    }

    // Firma digital / marca de agua
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...ROJO);
    doc.text('Generado por Sparkles · Software Contable', PW / 2, pageH - 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS_MED);
    doc.setFontSize(6.5);
    doc.text(`Documento emitido el ${new Date().toLocaleDateString('es-CO')} · ${factura.numeroCompleto}`, PW / 2, pageH - 4, { align: 'center' });

    // ─────────────────────────────────────────
    // DESCARGAR
    // ─────────────────────────────────────────
    doc.save(`Factura_${factura.numeroCompleto}.pdf`);

    console.log(`✅ PDF generado: Factura_${factura.numeroCompleto}.pdf`);
}

// ==========================================
// RETENCIONES FISCALES
// ==========================================

function abrirModalRetenciones() {
    const modal = document.getElementById('modalRetenciones');
    modal.style.display = 'flex';
    
    // Actualizar bases de cálculo
    actualizarBasesRetenciones();
    
    console.log('📊 Modal de retenciones abierto');
}

function cerrarModalRetenciones() {
    const modal = document.getElementById('modalRetenciones');
    modal.style.display = 'none';
}

function cerrarModalRetencionesClickFuera(event) {
    if (event.target.id === 'modalRetenciones') {
        cerrarModalRetenciones();
    }
}

function toggleRetencion(tipo) {
    const checkbox = document.getElementById(`check${tipo === 'retefuente' ? 'ReteFuente' : tipo === 'reteiva' ? 'ReteIVA' : 'ReteICA'}`);
    const inputTarifa = document.getElementById(`tarifa${tipo === 'retefuente' ? 'ReteFuente' : tipo === 'reteiva' ? 'ReteIVA' : 'ReteICA'}`);
    const item = document.getElementById(`retencion${tipo === 'retefuente' ? 'ReteFuente' : tipo === 'reteiva' ? 'ReteIVA' : 'ReteICA'}`);
    
    retencionesFiscales[tipo].activa = checkbox.checked;
    inputTarifa.disabled = !checkbox.checked;
    
    if (checkbox.checked) {
        item.classList.add('activa');
    } else {
        item.classList.remove('activa');
    }
    
    calcularRetencion(tipo);
}

function actualizarBasesRetenciones() {
    const totales = calcularTotalesFactura();
    
    // ReteFuente se calcula sobre subtotal (base sin IVA)
    retencionesFiscales.retefuente.base = totales.subtotal;
    document.getElementById('baseReteFuente').value = `$${formatearNumero(totales.subtotal)}`;
    
    // ReteIVA se calcula sobre el IVA total
    retencionesFiscales.reteiva.base = totales.totalIva;
    document.getElementById('baseReteIVA').value = `$${formatearNumero(totales.totalIva)}`;
    
    // ReteICA se calcula sobre el total factura
    retencionesFiscales.reteica.base = totales.totalFactura;
    document.getElementById('baseReteICA').value = `$${formatearNumero(totales.totalFactura)}`;
    
    // Recalcular valores
    calcularRetencion('retefuente');
    calcularRetencion('reteiva');
    calcularRetencion('reteica');
}

function calcularRetencion(tipo) {
    const fieldName = tipo === 'retefuente' ? 'ReteFuente' : tipo === 'reteiva' ? 'ReteIVA' : 'ReteICA';
    const tarifa = parseFloat(document.getElementById(`tarifa${fieldName}`).value) || 0;
    
    retencionesFiscales[tipo].tarifa = tarifa;
    
    if (retencionesFiscales[tipo].activa) {
        const base = retencionesFiscales[tipo].base;
        const valor = base * (tarifa / 100);
        retencionesFiscales[tipo].valor = valor;
        document.getElementById(`valor${fieldName}`).value = `$${formatearNumero(valor)}`;
    } else {
        retencionesFiscales[tipo].valor = 0;
        document.getElementById(`valor${fieldName}`).value = `$0.00`;
    }
    
    actualizarTotalRetencionesModal();
}

function actualizarTotalRetencionesModal() {
    let total = 0;
    if (retencionesFiscales.retefuente.activa) total += retencionesFiscales.retefuente.valor;
    if (retencionesFiscales.reteiva.activa) total += retencionesFiscales.reteiva.valor;
    if (retencionesFiscales.reteica.activa) total += retencionesFiscales.reteica.valor;
    
    document.getElementById('totalRetencionesModal').textContent = `$${formatearNumero(total)}`;
}

function aplicarRetenciones() {
    cerrarModalRetenciones();
    actualizarResumen();
    
    console.log('✅ Retenciones aplicadas:', retencionesFiscales);
}

function actualizarDesgIoseRetencionesFiscales() {
    const container = document.getElementById('desgIoseRetencionesFiscales');
    
    let html = '';
    
    if (retencionesFiscales.retefuente.activa && retencionesFiscales.retefuente.valor > 0) {
        html += `
            <div class="resumen-retencion-detalle">
                <span class="resumen-retencion-nombre">ReteFuente ${retencionesFiscales.retefuente.tarifa}%</span>
                <span class="resumen-retencion-valor">-$${formatearNumero(retencionesFiscales.retefuente.valor)}</span>
            </div>
        `;
    }
    
    if (retencionesFiscales.reteiva.activa && retencionesFiscales.reteiva.valor > 0) {
        html += `
            <div class="resumen-retencion-detalle">
                <span class="resumen-retencion-nombre">ReteIVA ${retencionesFiscales.reteiva.tarifa}%</span>
                <span class="resumen-retencion-valor">-$${formatearNumero(retencionesFiscales.reteiva.valor)}</span>
            </div>
        `;
    }
    
    if (retencionesFiscales.reteica.activa && retencionesFiscales.reteica.valor > 0) {
        html += `
            <div class="resumen-retencion-detalle">
                <span class="resumen-retencion-nombre">ReteICA ${retencionesFiscales.reteica.tarifa}%</span>
                <span class="resumen-retencion-valor">-$${formatearNumero(retencionesFiscales.reteica.valor)}</span>
            </div>
        `;
    }
    
    if (html) {
        container.innerHTML = html;
        container.style.display = 'flex';
    } else {
        container.style.display = 'none';
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function formatearNumero(numero) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero);
}

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';

        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// ========== PANELES DE ERROR DE FECHAS ==========
function mostrarPanelErrorFechas(fechaEmision, fechaVencimiento) {
    // Evitar múltiples paneles
    cerrarPanelErrorFechas();

    // Formatear fechas para mostrar
    const formatoFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const emisionStr = fechaEmision.toLocaleDateString('es-CO', formatoFecha);
    const vencimientoStr = fechaVencimiento.toLocaleDateString('es-CO', formatoFecha);

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay-error-fechas';
    overlay.id = 'overlayErrorFechas';

    // Crear panel
    const panel = document.createElement('div');
    panel.className = 'panel-error-fechas';
    panel.id = 'panelErrorFechas';

    panel.innerHTML = `
        <div class="panel-error-header">
            <div class="panel-error-icono">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h3 class="panel-error-titulo">Error de Validación</h3>
        </div>
        
        <div class="panel-error-contenido">
            <p class="panel-error-mensaje">
                La <strong>fecha de vencimiento</strong> debe ser posterior a la <strong>fecha de emisión</strong> de la factura.
            </p>
            
            <div class="panel-error-detalle">
                <div class="panel-error-fecha-item">
                    <span class="panel-error-fecha-label">Fecha de Emisión:</span>
                    <span class="panel-error-fecha-valor">${emisionStr}</span>
                </div>
                <div class="panel-error-fecha-item">
                    <span class="panel-error-fecha-label">Fecha de Vencimiento:</span>
                    <span class="panel-error-fecha-valor">${vencimientoStr}</span>
                </div>
            </div>
            
            <p class="panel-error-mensaje" style="margin-top: 12px; font-size: 13px; color: #6c757d;">
                💡 Usa los botones de atajos (+15, +30, +60 días) o selecciona una fecha posterior manualmente.
            </p>
        </div>
        
        <div class="panel-error-acciones">
            <button type="button" class="btn-error-corregir" onclick="corregirFechaAutomatica()">
                Corregir Automáticamente
            </button>
            <button type="button" class="btn-error-entendido" onclick="cerrarPanelErrorFechas()">
                Entendido
            </button>
        </div>
    `;

    // Agregar al DOM
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Cerrar con click en overlay
    overlay.addEventListener('click', cerrarPanelErrorFechas);

    // Cerrar con tecla ESC
    document.addEventListener('keydown', cerrarPanelConEscape);

    console.log('⚠️ Panel de error de fechas mostrado');
}

function cerrarPanelErrorFechas() {
    const overlay = document.getElementById('overlayErrorFechas');
    const panel = document.getElementById('panelErrorFechas');

    if (overlay && panel) {
        // Animar salida
        overlay.classList.add('saliendo');
        panel.classList.add('saliendo');

        // Remover del DOM después de la animación
        setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
            if (panel.parentNode) panel.remove();
        }, 300);

        // Remover listener de ESC
        document.removeEventListener('keydown', cerrarPanelConEscape);
    }
}

function cerrarPanelConEscape(event) {
    if (event.key === 'Escape') {
        cerrarPanelErrorFechas();
    }
}

function corregirFechaAutomatica() {
    // Agregar 30 días por defecto
    agregarDias(30);

    // Cerrar el panel
    cerrarPanelErrorFechas();

    // Enfocar el campo de fecha de vencimiento
    const inputVencimiento = document.getElementById('fechaVencimiento');
    if (inputVencimiento) {
        inputVencimiento.focus();

        // Pequeña animación de confirmación
        inputVencimiento.classList.remove('error');
        inputVencimiento.style.borderColor = '#2d7a4b';
        setTimeout(() => {
            inputVencimiento.style.borderColor = '';
        }, 1000);
    }

    console.log('✅ Fecha corregida automáticamente a +30 días');
}

console.log('✅ Sistema de facturación COMPLETO con retenciones automáticas cargado');