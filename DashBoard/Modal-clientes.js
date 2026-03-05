// ========== MODAL DE BÚSQUEDA DE CLIENTES CON AUTOCOMPLETADO ==========

let todosLosClientes = [];
let clienteSeleccionadoTemp = null;
let indiceSeleccionado = -1;

// ========== CARGAR CLIENTES (reemplaza la función anterior) ==========
function cargarClientes() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveClientes = `clientes_${usuarioActual.email}`;
    
    console.log('📋 Cargando clientes desde:', claveClientes);
    
    todosLosClientes = JSON.parse(localStorage.getItem(claveClientes)) || [];
    
    console.log(`✅ ${todosLosClientes.length} clientes cargados`);
}

// ========== ABRIR MODAL ==========
function abrirModalClientes() {
    const modal = document.getElementById('modalBusquedaClientes');
    const input = document.getElementById('inputBusquedaCliente');
    
    modal.style.display = 'flex';
    
    // Resetear búsqueda
    limpiarBusqueda();
    clienteSeleccionadoTemp = null;
    indiceSeleccionado = -1;
    
    // Mostrar estado inicial
    mostrarEstadoInicial();
    
    // Deshabilitar botón seleccionar
    document.getElementById('btnConfirmarSeleccion').disabled = true;
    
    // Focus en el input después de la animación
    setTimeout(() => {
        input.focus();
    }, 100);
    
    console.log('🔍 Modal de búsqueda abierto');
}

// ========== CERRAR MODAL ==========
function cerrarModalClientes() {
    const modal = document.getElementById('modalBusquedaClientes');
    modal.style.display = 'none';
    
    console.log('❌ Modal de búsqueda cerrado');
}

// ========== CERRAR SI CLICK FUERA ==========
function cerrarModalSiClickFuera(event) {
    if (event.target.id === 'modalBusquedaClientes') {
        cerrarModalClientes();
    }
}

// ========== LIMPIAR BÚSQUEDA ==========
function limpiarBusqueda() {
    const input = document.getElementById('inputBusquedaCliente');
    const btnLimpiar = document.querySelector('.btn-limpiar-busqueda');
    
    input.value = '';
    btnLimpiar.style.display = 'none';
    
    mostrarEstadoInicial();
    
    input.focus();
}

// ========== MOSTRAR ESTADO INICIAL ==========
function mostrarEstadoInicial() {
    document.getElementById('estadoInicial').style.display = 'flex';
    document.getElementById('listaResultados').style.display = 'none';
    document.getElementById('sinResultados').style.display = 'none';
}

// ========== BUSCAR CLIENTES EN TIEMPO REAL ==========
function buscarClientesEnTiempoReal() {
    const input = document.getElementById('inputBusquedaCliente');
    const btnLimpiar = document.querySelector('.btn-limpiar-busqueda');
    const termino = input.value.trim().toLowerCase();
    
    // Mostrar/ocultar botón limpiar
    btnLimpiar.style.display = termino ? 'flex' : 'none';
    
    // Si no hay término, mostrar estado inicial
    if (!termino) {
        mostrarEstadoInicial();
        return;
    }
    
    // Filtrar clientes
    const resultados = todosLosClientes.filter(cliente => {
        const nombre = (cliente.nombreCompleto || cliente.razonSocial || '').toLowerCase();
        const documento = (cliente.numeroDocumento || cliente.nit || '').toLowerCase();
        const email = (cliente.email || '').toLowerCase();
        
        return nombre.includes(termino) || 
               documento.includes(termino) || 
               email.includes(termino);
    });
    
    console.log(`🔍 Búsqueda: "${termino}" → ${resultados.length} resultados`);
    
    // Mostrar resultados
    mostrarResultados(resultados);
}

// ========== MOSTRAR RESULTADOS ==========
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
    
    // Construir HTML de resultados
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
    
    // Resetear selección
    indiceSeleccionado = -1;
    clienteSeleccionadoTemp = null;
    document.getElementById('btnConfirmarSeleccion').disabled = true;
}

// ========== SELECCIONAR RESULTADO ==========
function seleccionarResultado(index) {
    // Obtener el término de búsqueda actual
    const termino = document.getElementById('inputBusquedaCliente').value.trim().toLowerCase();
    
    // Re-filtrar para obtener el cliente correcto
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
    
    // Quitar selección anterior
    document.querySelectorAll('.resultado-item').forEach(item => {
        item.classList.remove('seleccionado');
    });
    
    // Agregar selección nueva
    const item = document.querySelector(`[data-index="${index}"]`);
    if (item) {
        item.classList.add('seleccionado');
    }
    
    // Guardar cliente seleccionado
    clienteSeleccionadoTemp = resultados[index];
    indiceSeleccionado = index;
    
    // Habilitar botón confirmar
    document.getElementById('btnConfirmarSeleccion').disabled = false;
    
    console.log('✅ Cliente seleccionado:', clienteSeleccionadoTemp);
}

// ========== NAVEGAR CON TECLADO ==========
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

// ========== CONFIRMAR SELECCIÓN ==========
function confirmarSeleccionCliente() {
    if (!clienteSeleccionadoTemp) {
        console.error('❌ No hay cliente seleccionado');
        return;
    }
    
    // Guardar en variable global
    clienteSeleccionadoGlobal = clienteSeleccionadoTemp;
    
    console.log('✅ Cliente confirmado:', clienteSeleccionadoGlobal);
    
    // Mostrar tarjeta del cliente
    mostrarClienteEnCard();
    
    // Cerrar modal
    cerrarModalClientes();
}

// ========== MOSTRAR CLIENTE EN CARD ==========
function mostrarClienteEnCard() {
    const cliente = clienteSeleccionadoGlobal;
    
    if (!cliente) return;
    
    // Ocultar botón "Seleccionar Cliente"
    document.getElementById('btnSeleccionarCliente').style.display = 'none';
    
    // Mostrar tarjeta
    const card = document.getElementById('clienteSeleccionadoCard');
    card.style.display = 'block';
    
    // Llenar datos
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

// ========== IR A CREAR CLIENTE DESDE MODAL ==========
function irACrearClienteDesdeModal() {
    console.log('➕ Redirigiendo a crear cliente desde modal...');
    
    // Guardar estado de la factura
    guardarEstadoFactura();
    
    // Redirigir (AJUSTA LA RUTA SEGÚN TU ESTRUCTURA)
    window.location.href = './Clientes.html?returnTo=nueva-factura';
}

// ========== RESTAURAR ESTADO (actualizado) ==========
function restaurarEstadoFactura() {
    const estadoGuardado = sessionStorage.getItem('facturaTemporal');
    
    if (!estadoGuardado) {
        console.log('ℹ️ No hay estado guardado para restaurar');
        return;
    }
    
    console.log('♻️ Restaurando estado de factura...');
    
    const estado = JSON.parse(estadoGuardado);
    
    // Restaurar cliente seleccionado
    if (estado.clienteId) {
        const cliente = todosLosClientes.find(c => c.id === estado.clienteId);
        
        if (cliente) {
            clienteSeleccionadoGlobal = cliente;
            mostrarClienteEnCard();
            console.log('✅ Cliente restaurado:', cliente);
        }
    }
    
    // Limpiar el estado guardado
    sessionStorage.removeItem('facturaTemporal');
    console.log('🗑️ Estado temporal limpiado');
}

console.log('✅ Modal de búsqueda de clientes cargado');