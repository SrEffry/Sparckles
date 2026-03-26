// Gestión de Clientes - Sparkles CON AGENTE RETENEDOR

let clienteEditando = null;

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    setupLogout();
    cargarClientes();
    actualizarEstadisticas();
    
    console.log('✅ Módulo de clientes con agente retenedor cargado');
});

// ========== VERIFICAR SESIÓN ==========
function verificarSesion() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) {
        window.location.href = '../index.html';
        return;
    }
}

// ========== CARGAR DATOS DEL USUARIO ==========
function cargarDatosUsuario() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (usuarioActual) {
        const usuario = JSON.parse(usuarioActual);
        
        const userNameElements = document.querySelectorAll('.user-details strong');
        userNameElements.forEach(el => {
            el.textContent = `${usuario.nombre} ${usuario.apellido}`;
        });
        
        const userEmailElements = document.querySelectorAll('.user-details span');
        userEmailElements.forEach(el => {
            el.textContent = usuario.email;
        });
        
        const headerNameElements = document.querySelectorAll('.user-info-header strong');
        headerNameElements.forEach(el => {
            el.textContent = `${usuario.nombre} ${usuario.apellido}`;
        });
        
        const iniciales = usuario.nombre.charAt(0) + usuario.apellido.charAt(0);
        const avatarElements = document.querySelectorAll('.user-avatar, .user-avatar-small');
        avatarElements.forEach(el => {
            el.textContent = iniciales.toUpperCase();
        });
    }
}

// ========== CONFIGURAR BOTÓN DE SALIR ==========
function setupLogout() {
    const logoutBtn = document.querySelector('.footer-btn:last-child');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                sessionStorage.removeItem('usuarioActual');
                window.location.href = '../index.html';
            }
        });
    }
}

// ========== CAMBIAR TIPO DE CLIENTE ==========
function cambiarTipoCliente() {
    const tipo = document.querySelector('input[name="tipoCliente"]:checked').value;
    const formNatural = document.getElementById('formNatural');
    const formEmpresa = document.getElementById('formEmpresa');
    
    if (tipo === 'natural') {
        formNatural.style.display = 'grid';
        formEmpresa.style.display = 'none';
        
        // ========== NUEVO: Valor por defecto para personas naturales ==========
        document.getElementById('agenteRetenedorNatural').checked = false;
    } else {
        formNatural.style.display = 'none';
        formEmpresa.style.display = 'grid';
        
        // ========== NUEVO: Valor por defecto para empresas ==========
        document.getElementById('agenteRetenedorEmpresa').checked = true;
        document.getElementById('autorretenedorEmpresa').checked = false;
    }
}

// ========== ABRIR MODAL CLIENTE ==========
function abrirModalCliente(cliente = null) {
    clienteEditando = cliente;
    const modal = document.getElementById('modalCliente');
    const titulo = document.getElementById('modalTitle');
    
    if (cliente) {
        titulo.textContent = 'Editar Cliente';
        cargarDatosCliente(cliente);
    } else {
        titulo.textContent = 'Nuevo Cliente';
        limpiarFormulario();
    }
    
    modal.style.display = 'flex';
}

// ========== CERRAR MODAL CLIENTE ==========
function cerrarModalCliente() {
    document.getElementById('modalCliente').style.display = 'none';
    limpiarFormulario();
    clienteEditando = null;
}

// ========== LIMPIAR FORMULARIO ==========
function limpiarFormulario() {
    // Resetear tipo a natural
    document.querySelector('input[name="tipoCliente"][value="natural"]').checked = true;
    cambiarTipoCliente();
    
    // Limpiar campos Natural
    document.getElementById('nombresNatural').value = '';
    document.getElementById('apellidosNatural').value = '';
    document.getElementById('tipoDocNatural').value = 'CC';
    document.getElementById('numDocNatural').value = '';
    document.getElementById('telefonoNatural').value = '';
    document.getElementById('emailNatural').value = '';
    document.getElementById('direccionNatural').value = '';
    document.getElementById('ciudadNatural').value = '';
    document.getElementById('departamentoNatural').value = '';
    
    // ========== NUEVO: Limpiar checkbox agente retenedor Natural ==========
    document.getElementById('agenteRetenedorNatural').checked = false;
    
    // Limpiar campos Empresa
    document.getElementById('razonSocialEmpresa').value = '';
    document.getElementById('nombreComercialEmpresa').value = '';
    document.getElementById('nitEmpresa').value = '';
    document.getElementById('dvEmpresa').value = '';
    document.getElementById('telefonoEmpresa').value = '';
    document.getElementById('emailEmpresa').value = '';
    document.getElementById('direccionEmpresa').value = '';
    document.getElementById('ciudadEmpresa').value = '';
    document.getElementById('departamentoEmpresa').value = '';
    document.getElementById('contactoEmpresa').value = '';
    
    // ========== NUEVO: Limpiar checkbox agente retenedor Empresa ==========
    document.getElementById('agenteRetenedorEmpresa').checked = true;
    document.getElementById('autorretenedorEmpresa').checked = false;
    
    // Limpiar mensajes
    document.getElementById('mensajeError').style.display = 'none';
}

// ========== CARGAR DATOS CLIENTE ==========
function cargarDatosCliente(cliente) {
    if (cliente.tipo === 'natural') {
        document.querySelector('input[name="tipoCliente"][value="natural"]').checked = true;
        cambiarTipoCliente();
        
        document.getElementById('nombresNatural').value = cliente.nombres || '';
        document.getElementById('apellidosNatural').value = cliente.apellidos || '';
        document.getElementById('tipoDocNatural').value = cliente.tipoDocumento || 'CC';
        document.getElementById('numDocNatural').value = cliente.numeroDocumento || '';
        document.getElementById('telefonoNatural').value = cliente.telefono || '';
        document.getElementById('emailNatural').value = cliente.email || '';
        document.getElementById('direccionNatural').value = cliente.direccion || '';
        document.getElementById('ciudadNatural').value = cliente.ciudad || '';
        document.getElementById('departamentoNatural').value = cliente.departamento || '';
        
        // ========== NUEVO: Cargar agente retenedor Natural ==========
        document.getElementById('agenteRetenedorNatural').checked = cliente.esAgenteRetenedor || false;
    } else {
        document.querySelector('input[name="tipoCliente"][value="empresa"]').checked = true;
        cambiarTipoCliente();
        
        document.getElementById('razonSocialEmpresa').value = cliente.razonSocial || '';
        document.getElementById('nombreComercialEmpresa').value = cliente.nombreComercial || '';
        document.getElementById('nitEmpresa').value = cliente.nit || '';
        document.getElementById('dvEmpresa').value = cliente.dv || '';
        document.getElementById('telefonoEmpresa').value = cliente.telefono || '';
        document.getElementById('emailEmpresa').value = cliente.email || '';
        document.getElementById('direccionEmpresa').value = cliente.direccion || '';
        document.getElementById('ciudadEmpresa').value = cliente.ciudad || '';
        document.getElementById('departamentoEmpresa').value = cliente.departamento || '';
        document.getElementById('contactoEmpresa').value = cliente.personaContacto || '';
        
        // ========== NUEVO: Cargar agente retenedor Empresa ==========
        document.getElementById('agenteRetenedorEmpresa').checked = cliente.esAgenteRetenedor !== undefined ? cliente.esAgenteRetenedor : true;
        document.getElementById('autorretenedorEmpresa').checked = cliente.esAutorretenedor || false;
    }
}

// ========== GUARDAR CLIENTE CON AGENTE RETENEDOR ==========
function guardarCliente() {
    const tipo = document.querySelector('input[name="tipoCliente"]:checked').value;
    let cliente = {};
    
    if (tipo === 'natural') {
        const nombres = document.getElementById('nombresNatural').value.trim();
        const apellidos = document.getElementById('apellidosNatural').value.trim();
        const tipoDoc = document.getElementById('tipoDocNatural').value;
        const numDoc = document.getElementById('numDocNatural').value.trim();
        
        if (!nombres || !apellidos || !numDoc) {
            mostrarError('Por favor complete los campos obligatorios (Nombres, Apellidos y Documento)');
            return;
        }
        
        cliente = {
            id: clienteEditando ? clienteEditando.id : Date.now().toString(),
            tipo: 'natural',
            nombres: nombres,
            apellidos: apellidos,
            nombreCompleto: `${nombres} ${apellidos}`,
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            telefono: document.getElementById('telefonoNatural').value.trim(),
            email: document.getElementById('emailNatural').value.trim(),
            direccion: document.getElementById('direccionNatural').value.trim(),
            ciudad: document.getElementById('ciudadNatural').value.trim(),
            departamento: document.getElementById('departamentoNatural').value.trim(),
            
            // ========== NUEVO: Agente Retenedor ==========
            esAgenteRetenedor: document.getElementById('agenteRetenedorNatural').checked,
            esAutorretenedor: false, // Personas naturales NO pueden ser autorretenedoras
            
            fechaRegistro: clienteEditando ? clienteEditando.fechaRegistro : new Date().toISOString()
        };
    } else {
        const razonSocial = document.getElementById('razonSocialEmpresa').value.trim();
        const nit = document.getElementById('nitEmpresa').value.trim();
        const dv = document.getElementById('dvEmpresa').value.trim();
        
        if (!razonSocial || !nit || !dv) {
            mostrarError('Por favor complete los campos obligatorios (Razón Social, NIT y DV)');
            return;
        }
        
        if (dv.length !== 1 || isNaN(dv)) {
            mostrarError('El DV debe ser un solo dígito numérico');
            return;
        }
        
        cliente = {
            id: clienteEditando ? clienteEditando.id : Date.now().toString(),
            tipo: 'empresa',
            razonSocial: razonSocial,
            nombreComercial: document.getElementById('nombreComercialEmpresa').value.trim() || razonSocial,
            nombreCompleto: razonSocial,
            nit: nit,
            dv: dv,
            telefono: document.getElementById('telefonoEmpresa').value.trim(),
            email: document.getElementById('emailEmpresa').value.trim(),
            direccion: document.getElementById('direccionEmpresa').value.trim(),
            ciudad: document.getElementById('ciudadEmpresa').value.trim(),
            departamento: document.getElementById('departamentoEmpresa').value.trim(),
            personaContacto: document.getElementById('contactoEmpresa').value.trim(),
            
            // ========== NUEVO: Agente Retenedor ==========
            esAgenteRetenedor: document.getElementById('agenteRetenedorEmpresa').checked,
            esAutorretenedor: document.getElementById('autorretenedorEmpresa').checked,
            
            fechaRegistro: clienteEditando ? clienteEditando.fechaRegistro : new Date().toISOString()
        };
    }
    
    // Obtener usuario actual
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    cliente.usuarioId = usuarioActual.email;
    
    // Guardar en localStorage
    const claveClientes = `clientes_${usuarioActual.email}`;
    let clientes = JSON.parse(localStorage.getItem(claveClientes)) || [];
    
    if (clienteEditando) {
        // Actualizar cliente existente
        const index = clientes.findIndex(c => c.id === clienteEditando.id);
        if (index !== -1) {
            clientes[index] = cliente;
        }
    } else {
        // Agregar nuevo cliente
        clientes.push(cliente);
    }
    
    localStorage.setItem(claveClientes, JSON.stringify(clientes));
    
    // ========== NUEVO: Log de agente retenedor ==========
    console.log('✅ Cliente guardado:', cliente);
    if (cliente.esAgenteRetenedor) {
        console.log('   💰 Es agente retenedor - Se aplicarán retenciones en facturas');
        if (cliente.esAutorretenedor) {
            console.log('   ⚡ Es autorretenedor - Grandes Contribuyentes');
        }
    } else {
        console.log('   ⚠️ NO es agente retenedor - NO se aplicarán retenciones');
    }
    
    // Cerrar modal y actualizar tabla
    cerrarModalCliente();
    cargarClientes();
    actualizarEstadisticas();
    
    // Mostrar notificación (opcional)
    mostrarNotificacion(clienteEditando ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente');
}

// ========== CARGAR CLIENTES ==========
function cargarClientes() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveClientes = `clientes_${usuarioActual.email}`;
    
    let clientes = JSON.parse(localStorage.getItem(claveClientes)) || [];
    
    const tbody = document.getElementById('clientesTableBody');
    const table = document.getElementById('clientesTable');
    const emptyState = document.getElementById('emptyState');
    
    if (clientes.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    tbody.innerHTML = '';
    
    clientes.forEach(cliente => {
        const iniciales = obtenerIniciales(cliente.nombreCompleto);
        const tipoLabel = cliente.tipo === 'natural' ? 'Persona Natural' : 'Empresa';
        const documento = cliente.tipo === 'natural' 
            ? `${cliente.tipoDocumento}: ${cliente.numeroDocumento}`
            : `NIT: ${cliente.nit}-${cliente.dv}`;
        
        const row = `
            <tr>
                <td>
                    <div class="cliente-cell">
                        <div class="cliente-avatar">${iniciales}</div>
                        <div class="cliente-info">
                            <div class="cliente-nombre">${cliente.nombreCompleto}</div>
                            ${cliente.email ? `<div class="cliente-email">${cliente.email}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge-tipo ${cliente.tipo}">${tipoLabel}</span>
                </td>
                <td>${documento}</td>
                <td>${cliente.telefono || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick='verCliente(${JSON.stringify(cliente)})' title="Ver detalles">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn edit" onclick='editarCliente(${JSON.stringify(cliente)})' title="Editar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick='eliminarCliente("${cliente.id}")' title="Eliminar">
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

// ========== VER CLIENTE ==========
function verCliente(cliente) {
    let detalles = `
INFORMACIÓN DEL CLIENTE

Tipo: ${cliente.tipo === 'natural' ? 'Persona Natural' : 'Empresa'}
`;
    
    if (cliente.tipo === 'natural') {
        detalles += `
Nombres: ${cliente.nombres}
Apellidos: ${cliente.apellidos}
${cliente.tipoDocumento}: ${cliente.numeroDocumento}
`;
    } else {
        detalles += `
Razón Social: ${cliente.razonSocial}
${cliente.nombreComercial !== cliente.razonSocial ? `Nombre Comercial: ${cliente.nombreComercial}\n` : ''}NIT: ${cliente.nit}-${cliente.dv}
${cliente.personaContacto ? `Persona de Contacto: ${cliente.personaContacto}\n` : ''}`;
    }
    
    detalles += `
${cliente.telefono ? `Teléfono: ${cliente.telefono}\n` : ''}${cliente.email ? `Email: ${cliente.email}\n` : ''}${cliente.direccion ? `Dirección: ${cliente.direccion}\n` : ''}${cliente.ciudad ? `Ciudad: ${cliente.ciudad}\n` : ''}${cliente.departamento ? `Departamento: ${cliente.departamento}\n` : ''}
Fecha de Registro: ${new Date(cliente.fechaRegistro).toLocaleDateString('es-CO')}

    `;
    
    // ========== NUEVO: Mostrar info de agente retenedor ==========
    detalles += `\n--- RETENCIONES ---\n`;
    detalles += cliente.esAgenteRetenedor ? '✓ Es agente de retención\n' : '✗ NO es agente de retención\n';
    if (cliente.esAutorretenedor) {
        detalles += '⚡ Es autorretenedor (Gran Contribuyente)\n';
    }
    
    alert(detalles);
}

// ========== EDITAR CLIENTE ==========
function editarCliente(cliente) {
    abrirModalCliente(cliente);
}

// ========== ELIMINAR CLIENTE ==========
function eliminarCliente(clienteId) {
    if (!confirm('¿Está seguro de que desea eliminar este cliente?')) {
        return;
    }
    
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveClientes = `clientes_${usuarioActual.email}`;
    
    let clientes = JSON.parse(localStorage.getItem(claveClientes)) || [];
    clientes = clientes.filter(c => c.id !== clienteId);
    
    localStorage.setItem(claveClientes, JSON.stringify(clientes));
    
    cargarClientes();
    actualizarEstadisticas();
    mostrarNotificacion('Cliente eliminado exitosamente');
}

// ========== FILTRAR CLIENTES ==========
function filtrarClientes() {
    const searchTerm = document.getElementById('searchCliente').value.toLowerCase();
    const filtroTipo = document.getElementById('filtroTipo').value;
    
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveClientes = `clientes_${usuarioActual.email}`;
    let clientes = JSON.parse(localStorage.getItem(claveClientes)) || [];
    
    // Filtrar por búsqueda
    if (searchTerm) {
        clientes = clientes.filter(c => {
            const nombre = c.nombreCompleto.toLowerCase();
            const documento = c.tipo === 'natural' ? c.numeroDocumento : c.nit;
            return nombre.includes(searchTerm) || documento.includes(searchTerm);
        });
    }
    
    // Filtrar por tipo
    if (filtroTipo) {
        clientes = clientes.filter(c => c.tipo === filtroTipo);
    }
    
    // Renderizar filtrados
    const tbody = document.getElementById('clientesTableBody');
    const table = document.getElementById('clientesTable');
    const emptyState = document.getElementById('emptyState');
    
    if (clientes.length === 0) {
        table.style.display = 'none';
        emptyState.querySelector('h3').textContent = 'No se encontraron clientes';
        emptyState.querySelector('p').textContent = 'Intenta con otros criterios de búsqueda';
        emptyState.querySelector('button').style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    tbody.innerHTML = '';
    
    clientes.forEach(cliente => {
        const iniciales = obtenerIniciales(cliente.nombreCompleto);
        const tipoLabel = cliente.tipo === 'natural' ? 'Persona Natural' : 'Empresa';
        const documento = cliente.tipo === 'natural' 
            ? `${cliente.tipoDocumento}: ${cliente.numeroDocumento}`
            : `NIT: ${cliente.nit}-${cliente.dv}`;
        
        const row = `
            <tr>
                <td>
                    <div class="cliente-cell">
                        <div class="cliente-avatar">${iniciales}</div>
                        <div class="cliente-info">
                            <div class="cliente-nombre">${cliente.nombreCompleto}</div>
                            ${cliente.email ? `<div class="cliente-email">${cliente.email}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge-tipo ${cliente.tipo}">${tipoLabel}</span>
                </td>
                <td>${documento}</td>
                <td>${cliente.telefono || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick='verCliente(${JSON.stringify(cliente)})' title="Ver detalles">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn edit" onclick='editarCliente(${JSON.stringify(cliente)})' title="Editar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick='eliminarCliente("${cliente.id}")' title="Eliminar">
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

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function actualizarEstadisticas() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveClientes = `clientes_${usuarioActual.email}`;
    const clientes = JSON.parse(localStorage.getItem(claveClientes)) || [];
    
    const totalClientes = clientes.length;
    const clientesNaturales = clientes.filter(c => c.tipo === 'natural').length;
    const clientesEmpresas = clientes.filter(c => c.tipo === 'empresa').length;
    
    document.getElementById('totalClientes').textContent = totalClientes;
    document.getElementById('clientesNaturales').textContent = clientesNaturales;
    document.getElementById('clientesEmpresas').textContent = clientesEmpresas;
}

// ========== UTILIDADES ==========
function obtenerIniciales(nombreCompleto) {
    const palabras = nombreCompleto.trim().split(' ');
    if (palabras.length === 1) {
        return palabras[0].substring(0, 2).toUpperCase();
    }
    return (palabras[0].charAt(0) + palabras[palabras.length - 1].charAt(0)).toUpperCase();
}

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function mostrarNotificacion(mensaje) {
    // Crear notificación temporal
    const notif = document.createElement('div');
    notif.className = 'mensaje-exito';
    notif.textContent = mensaje;
    notif.style.position = 'fixed';
    notif.style.top = '20px';
    notif.style.right = '20px';
    notif.style.zIndex = '10000';
    notif.style.animation = 'slideInRight 0.3s ease';
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

console.log('✅ Gestión de Clientes con Agente Retenedor - Módulo cargado correctamente');