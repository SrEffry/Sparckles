// Gestión de Empresas - Sparkles

// Array para almacenar empresas
let empresas = [];

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    cargarEmpresas();
    actualizarEstadisticas();
    renderizarEmpresas();
    setupLogout();
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
        
        // Actualizar nombre en el sidebar
        const userNameElements = document.querySelectorAll('.user-details strong');
        userNameElements.forEach(el => {
            el.textContent = `${usuario.nombre} ${usuario.apellido}`;
        });
        
        const userEmailElements = document.querySelectorAll('.user-details span');
        userEmailElements.forEach(el => {
            el.textContent = usuario.email;
        });
        
        // Actualizar nombre en el header
        const headerNameElements = document.querySelectorAll('.user-info-header strong');
        headerNameElements.forEach(el => {
            el.textContent = `${usuario.nombre} ${usuario.apellido}`;
        });
        
        // Actualizar iniciales en avatares
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

// ========== CARGAR EMPRESAS DESDE LOCALSTORAGE ==========
function cargarEmpresas() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) return;
    
    const usuario = JSON.parse(usuarioActual);
    const todasLasEmpresas = JSON.parse(localStorage.getItem('empresas')) || [];
    
    console.log('=== DEBUG CARGAR EMPRESAS ===');
    console.log('Total empresas en localStorage:', todasLasEmpresas.length);
    console.log('Usuario actual email:', usuario.email);
    console.log('Todas las empresas:', todasLasEmpresas);
    
    // Filtrar solo las empresas del usuario actual
    empresas = todasLasEmpresas.filter(empresa => {
        console.log(`Empresa ${empresa.nombre} - usuarioId: ${empresa.usuarioId} - match: ${empresa.usuarioId === usuario.email}`);
        return empresa.usuarioId === usuario.email;
    });
    
    console.log(`Empresas filtradas del usuario ${usuario.email}:`, empresas.length);
    console.log('Empresas del usuario:', empresas);
}

// ========== GUARDAR EMPRESAS EN LOCALSTORAGE ==========
function guardarEmpresas() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) return;
    
    const usuario = JSON.parse(usuarioActual);
    
    // Obtener todas las empresas
    const todasLasEmpresas = JSON.parse(localStorage.getItem('empresas')) || [];
    
    // Filtrar empresas que NO son del usuario actual
    const empresasOtrosUsuarios = todasLasEmpresas.filter(e => e.usuarioId !== usuario.email);
    
    // Combinar empresas de otros usuarios con las del usuario actual
    const empresasActualizadas = [...empresasOtrosUsuarios, ...empresas];
    
    // Guardar todo
    localStorage.setItem('empresas', JSON.stringify(empresasActualizadas));
}

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function actualizarEstadisticas() {
    const total = empresas.length;
    const activas = empresas.filter(e => e.estado === 'Activo').length;
    const regimenComun = empresas.filter(e => e.regimen === 'Común').length;
    const regimenSimplificado = empresas.filter(e => e.regimen === 'Simplificado').length;

    document.getElementById('totalEmpresas').textContent = total;
    document.getElementById('empresasActivas').textContent = activas;
    document.getElementById('regimenComun').textContent = regimenComun;
    document.getElementById('regimenSimplificado').textContent = regimenSimplificado;
}

// ========== RENDERIZAR TABLA DE EMPRESAS ==========
function renderizarEmpresas() {
    const tbody = document.getElementById('empresasTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('empresasTable');

    console.log('=== RENDERIZAR EMPRESAS ===');
    console.log('Cantidad de empresas a renderizar:', empresas.length);

    if (empresas.length === 0) {
        console.log('No hay empresas, mostrando empty state');
        emptyState.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    console.log('Mostrando tabla con empresas');
    emptyState.style.display = 'none';
    table.style.display = 'table';

    tbody.innerHTML = empresas.map((empresa, index) => {
        console.log(`Renderizando empresa ${index + 1}:`, empresa.nombre);
        
        const iniciales = empresa.nombre.split(' ').map(palabra => palabra[0]).join('').substring(0, 2).toUpperCase();
        
        return `
            <tr>
                <td>
                    <div class="empresa-cell">
                        <div class="empresa-avatar">${iniciales}</div>
                        <div class="empresa-info">
                            <div class="empresa-nombre">${empresa.nombre}</div>
                        </div>
                    </div>
                </td>
                <td>${empresa.nit || 'N/A'}</td>
                <td>
                    <span class="badge-regimen ${empresa.regimen ? empresa.regimen.toLowerCase().replace(' ', '-') : 'comun'}">
                        ${empresa.regimen || 'Común'}
                    </span>
                </td>
                <td>
                    <span class="badge-estado ${empresa.estado ? empresa.estado.toLowerCase() : 'activo'}">
                        ${empresa.estado || 'Activo'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="verEmpresa('${empresa.id}')" title="Ver detalles">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn edit" onclick="editarEmpresa('${empresa.id}')" title="Editar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick="eliminarEmpresa('${empresa.id}')" title="Eliminar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('Tabla renderizada correctamente');
}

// ========== FILTRAR EMPRESAS ==========
function filtrarEmpresas() {
    const searchTerm = document.getElementById('searchEmpresa').value.toLowerCase();
    const rows = document.querySelectorAll('#empresasTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ========== ABRIR MODAL NUEVA EMPRESA ==========
function abrirModalNuevaEmpresa() {
    const modalHTML = `
        <div class="modal-overlay" id="modalEmpresa" onclick="cerrarModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Nueva Empresa</h2>
                    <button class="modal-close" onclick="cerrarModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nombre de la Empresa *</label>
                        <input type="text" id="empresaNombre" placeholder="Ej: Empresa ABC S.A.S">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>NIT *</label>
                            <input type="text" id="empresaNit" placeholder="900.123.456-7">
                        </div>
                        <div class="form-group">
                            <label>Régimen *</label>
                            <select id="empresaRegimen">
                                <option value="">Seleccione régimen</option>
                                <option value="Común">Común</option>
                                <option value="Simplificado">Simplificado</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Dirección</label>
                            <input type="text" id="empresaDireccion" placeholder="Calle 123 #45-67">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="text" id="empresaTelefono" placeholder="(+57) 300 123 4567">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Ciudad</label>
                            <input type="text" id="empresaCiudad" placeholder="Ej: Bogotá">
                        </div>
                        <div class="form-group">
                            <label>Estado *</label>
                            <select id="empresaEstado">
                                <option value="Activo" selected>Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Contacto Principal</label>
                        <input type="text" id="empresaContacto" placeholder="Nombre del contacto">
                    </div>

                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="empresaEmail" placeholder="contacto@empresa.com">
                    </div>

                    <div id="mensajeError" class="mensaje-error" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
                    <button class="btn-primary" onclick="guardarEmpresa()">Guardar Empresa</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

// ========== CERRAR MODAL ==========
function cerrarModal(event) {
    if (event && event.target.className !== 'modal-overlay') return;
    
    const modal = document.getElementById('modalEmpresa');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// ========== GUARDAR EMPRESA ==========
function guardarEmpresa() {
    const nombre = document.getElementById('empresaNombre').value.trim();
    const nit = document.getElementById('empresaNit').value.trim();
    const regimen = document.getElementById('empresaRegimen').value;
    const direccion = document.getElementById('empresaDireccion').value.trim();
    const telefono = document.getElementById('empresaTelefono').value.trim();
    const ciudad = document.getElementById('empresaCiudad').value.trim();
    const estado = document.getElementById('empresaEstado').value;
    const contacto = document.getElementById('empresaContacto').value.trim();
    const email = document.getElementById('empresaEmail').value.trim();

    // Validaciones
    if (!nombre || !nit || !regimen) {
        mostrarErrorModal('Por favor complete los campos obligatorios (*)');
        return;
    }

    // Crear empresa
    const nuevaEmpresa = {
        id: Date.now().toString(),
        nombre: nombre,
        nit: nit,
        regimen: regimen,
        direccion: direccion,
        telefono: telefono,
        ciudad: ciudad,
        estado: estado,
        contacto: contacto,
        email: email,
        fechaCreacion: new Date().toISOString()
    };

    empresas.push(nuevaEmpresa);
    guardarEmpresas();
    actualizarEstadisticas();
    renderizarEmpresas();
    cerrarModal();

    // Mostrar mensaje de éxito
    mostrarNotificacion('Empresa creada exitosamente', 'success');
}

// ========== EDITAR EMPRESA ==========
function editarEmpresa(id) {
    const empresa = empresas.find(e => e.id === id);
    if (!empresa) return;

    const modalHTML = `
        <div class="modal-overlay" id="modalEmpresa" onclick="cerrarModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>Editar Empresa</h2>
                    <button class="modal-close" onclick="cerrarModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nombre de la Empresa *</label>
                        <input type="text" id="empresaNombre" value="${empresa.nombre}">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>NIT *</label>
                            <input type="text" id="empresaNit" value="${empresa.nit}">
                        </div>
                        <div class="form-group">
                            <label>Régimen *</label>
                            <select id="empresaRegimen">
                                <option value="Común" ${empresa.regimen === 'Común' ? 'selected' : ''}>Común</option>
                                <option value="Simplificado" ${empresa.regimen === 'Simplificado' ? 'selected' : ''}>Simplificado</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Dirección</label>
                            <input type="text" id="empresaDireccion" value="${empresa.direccion || ''}">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="text" id="empresaTelefono" value="${empresa.telefono || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Ciudad</label>
                            <input type="text" id="empresaCiudad" value="${empresa.ciudad || ''}">
                        </div>
                        <div class="form-group">
                            <label>Estado *</label>
                            <select id="empresaEstado">
                                <option value="Activo" ${empresa.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                                <option value="Inactivo" ${empresa.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Contacto Principal</label>
                        <input type="text" id="empresaContacto" value="${empresa.contacto || ''}">
                    </div>

                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="empresaEmail" value="${empresa.email || ''}">
                    </div>

                    <div id="mensajeError" class="mensaje-error" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
                    <button class="btn-primary" onclick="actualizarEmpresa('${id}')">Actualizar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

// ========== ACTUALIZAR EMPRESA ==========
function actualizarEmpresa(id) {
    const index = empresas.findIndex(e => e.id === id);
    if (index === -1) return;

    const nombre = document.getElementById('empresaNombre').value.trim();
    const nit = document.getElementById('empresaNit').value.trim();
    const regimen = document.getElementById('empresaRegimen').value;

    if (!nombre || !nit || !regimen) {
        mostrarErrorModal('Por favor complete los campos obligatorios (*)');
        return;
    }

    empresas[index] = {
        ...empresas[index],
        nombre: nombre,
        nit: nit,
        regimen: regimen,
        direccion: document.getElementById('empresaDireccion').value.trim(),
        telefono: document.getElementById('empresaTelefono').value.trim(),
        ciudad: document.getElementById('empresaCiudad').value.trim(),
        estado: document.getElementById('empresaEstado').value,
        contacto: document.getElementById('empresaContacto').value.trim(),
        email: document.getElementById('empresaEmail').value.trim(),
        fechaModificacion: new Date().toISOString()
    };

    guardarEmpresas();
    actualizarEstadisticas();
    renderizarEmpresas();
    cerrarModal();

    mostrarNotificacion('Empresa actualizada exitosamente', 'success');
}

// ========== VER EMPRESA ==========
function verEmpresa(id) {
    const empresa = empresas.find(e => e.id === id);
    if (!empresa) return;

    alert(`Detalles de ${empresa.nombre}\n\nNIT: ${empresa.nit}\nRégimen: ${empresa.regimen}\nEstado: ${empresa.estado}\nDirección: ${empresa.direccion || 'N/A'}\nTeléfono: ${empresa.telefono || 'N/A'}\nCiudad: ${empresa.ciudad || 'N/A'}\nContacto: ${empresa.contacto || 'N/A'}\nEmail: ${empresa.email || 'N/A'}`);
}

// ========== ELIMINAR EMPRESA ==========
function eliminarEmpresa(id) {
    const empresa = empresas.find(e => e.id === id);
    if (!empresa) return;

    if (confirm(`¿Está seguro de eliminar la empresa "${empresa.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        empresas = empresas.filter(e => e.id !== id);
        guardarEmpresas();
        actualizarEstadisticas();
        renderizarEmpresas();
        mostrarNotificacion('Empresa eliminada exitosamente', 'success');
    }
}

// ========== MOSTRAR ERROR EN MODAL ==========
function mostrarErrorModal(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 4000);
    }
}

// ========== MOSTRAR NOTIFICACIÓN ==========
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.textContent = mensaje;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#2d7a4b' : '#c62828'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// ========== TOGGLE FILTROS ==========
function toggleFiltros() {
    alert('Funcionalidad de filtros avanzados - En desarrollo');
}

console.log('Módulo de Empresas cargado correctamente ✨');