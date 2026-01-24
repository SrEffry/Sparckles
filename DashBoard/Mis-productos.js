// Gestión de Productos - Sparkles

let productos = [];
let productoEditando = null;

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    cargarProductos();
    actualizarEstadisticas();
    renderizarProductos();
    cargarCategoriasEnFiltro();
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

// ========== CARGAR PRODUCTOS ==========
function cargarProductos() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) return;
    
    const usuario = JSON.parse(usuarioActual);
    const claveProductos = `productos_${usuario.email}`;
    
    productos = JSON.parse(localStorage.getItem(claveProductos)) || [];
    console.log('Productos cargados:', productos.length);
}

// ========== GUARDAR PRODUCTOS ==========
function guardarProductos() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) return;
    
    const usuario = JSON.parse(usuarioActual);
    const claveProductos = `productos_${usuario.email}`;
    
    localStorage.setItem(claveProductos, JSON.stringify(productos));
    console.log('Productos guardados:', productos.length);
}

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function actualizarEstadisticas() {
    const total = productos.length;
    const activos = productos.length; // Todos están activos por defecto
    const conIva = productos.filter(p => p.tarifaIva !== '0%' && p.tarifaIva !== 'Exento').length;

    document.getElementById('totalProductos').textContent = total;
    document.getElementById('productosActivos').textContent = activos;
    document.getElementById('productosConIva').textContent = conIva;
}

// ========== RENDERIZAR TABLA ==========
function renderizarProductos() {
    const tbody = document.getElementById('productosTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('productosTable');

    if (productos.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';

    tbody.innerHTML = productos.map(producto => `
        <tr>
            <td><strong>${producto.codigo}</strong></td>
            <td>${producto.descripcion}</td>
            <td>${producto.comoSeVende}</td>
            <td>$${formatearNumero(producto.precioVenta)}</td>
            <td>${producto.tarifaIva}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="verProducto('${producto.id}')" title="Ver detalles">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="action-btn edit" onclick="editarProducto('${producto.id}')" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="eliminarProducto('${producto.id}')" title="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ========== ABRIR MODAL PRODUCTO ==========
function abrirModalProducto(esEdicion = false) {
    productoEditando = null;
    
    const modalHTML = `
        <div class="modal-overlay" id="modalProducto" onclick="cerrarModalSiClickFuera(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>${esEdicion ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                    <button class="modal-close" onclick="cerrarModalProducto()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-grid-producto">
                        <div class="form-field-producto codigo-manual-field">
                            <label>Código</label>
                            <input type="text" id="productoCodigo" placeholder="Auto-generado" readonly>
                            <button class="codigo-manual-toggle" onclick="toggleCodigoManual()">Manual</button>
                        </div>

                        <div class="form-field-producto full-width">
                            <label>Descripción *</label>
                            <input type="text" id="productoDescripcion" placeholder="Descripción del producto">
                        </div>

                        <div class="form-field-producto">
                            <label>Unidad de Medida *</label>
                            <select id="productoUnidad">
                                <option value="Unidad">Unidad</option>
                                <option value="Kilogramo">Kilogramo (KG)</option>
                                <option value="Gramo">Gramo (G)</option>
                                <option value="Libra">Libra (LB)</option>
                                <option value="Metro">Metro (M)</option>
                                <option value="Centímetro">Centímetro (CM)</option>
                                <option value="Litro">Litro (L)</option>
                                <option value="Mililitro">Mililitro (ML)</option>
                                <option value="Caja">Caja</option>
                                <option value="Paquete">Paquete</option>
                                <option value="Docena">Docena</option>
                                <option value="Hora">Hora</option>
                                <option value="Servicio">Servicio</option>
                            </select>
                        </div>

                        <div class="form-field-producto">
                            <label>Cómo se Compra *</label>
                            <select id="productoComoCompra">
                                <option value="Compras">Compras</option>
                                <option value="Productos Terminados">Productos Terminados</option>
                                <option value="Materia Prima">Materia Prima</option>
                                <option value="No Aplica">No Aplica</option>
                            </select>
                        </div>

                        <div class="form-field-producto">
                            <label>Cómo se Vende *</label>
                            <select id="productoComoVende">
                                <option value="Productos">Productos</option>
                                <option value="Servicios">Servicios</option>
                                <option value="Activos Fijos">Activos Fijos</option>
                                <option value="No Aplica">No Aplica</option>
                            </select>
                        </div>

                        <div class="form-field-producto">
                            <label>Retener por *</label>
                            <select id="productoRetener">
                                <option value="Compras">Compras</option>
                                <option value="Servicios">Servicios</option>
                                <option value="No Aplica">No Aplica</option>
                            </select>
                        </div>

                        <div class="form-field-producto">
                            <label>Tarifa de IVA *</label>
                            <select id="productoTarifaIva">
                                <option value="0%">0%</option>
                                <option value="5%">5%</option>
                                <option value="19%">19%</option>
                                <option value="Exento">Exento</option>
                                <option value="Excluido">Excluido</option>
                            </select>
                        </div>

                        <div class="form-field-producto">
                            <label>Precio de Venta *</label>
                            <input type="number" id="productoPrecioVenta" placeholder="0.00" step="0.01" min="0">
                        </div>

                        <div class="form-field-producto">
                            <label>Pertenece a la Línea</label>
                            <select id="productoLinea">
                                <option value="">Sin línea</option>
                                <option value="Línea A">Línea A</option>
                                <option value="Línea B">Línea B</option>
                                <option value="Línea C">Línea C</option>
                            </select>
                        </div>

                        <div class="form-field-producto">
                            <label>Identidad Relacionada</label>
                            <input type="text" id="productoIdentidad" placeholder="Para ingresos recibidos de terceros">
                        </div>

                        <div class="form-field-producto">
                            <label>Peso/Volumen del Producto</label>
                            <input type="number" id="productoPeso" placeholder="0.00" step="0.01" min="0">
                        </div>

                        <div class="form-field-producto">
                            <label>Unidad de Peso/Volumen</label>
                            <select id="productoUnidadPeso">
                                <option value="KG">Kilogramo (KG)</option>
                                <option value="G">Gramo (G)</option>
                                <option value="LB">Libra (LB)</option>
                                <option value="L">Litro (L)</option>
                                <option value="ML">Mililitro (ML)</option>
                                <option value="M3">Metro Cúbico (M³)</option>
                            </select>
                        </div>
                    </div>

                    <div id="mensajeError" class="mensaje-error" style="display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="cerrarModalProducto()">Cancelar</button>
                    <button class="btn-primary" onclick="guardarProducto()">
                        ${esEdicion ? 'Actualizar' : 'Guardar'} Producto
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
    
    // Generar código automático
    if (!esEdicion) {
        generarCodigoAutomatico();
    }
}

// ========== GENERAR CÓDIGO AUTOMÁTICO ==========
function generarCodigoAutomatico() {
    const siguienteNumero = productos.length + 1;
    const codigo = siguienteNumero.toString().padStart(3, '0');
    document.getElementById('productoCodigo').value = codigo;
}

// ========== TOGGLE CÓDIGO MANUAL ==========
function toggleCodigoManual() {
    const input = document.getElementById('productoCodigo');
    const boton = event.target;
    
    if (input.readOnly) {
        input.readOnly = false;
        input.value = '';
        input.placeholder = 'Ingrese código manualmente';
        input.focus();
        boton.textContent = 'Auto';
        boton.style.background = '#f57c00';
    } else {
        input.readOnly = true;
        generarCodigoAutomatico();
        boton.textContent = 'Manual';
        boton.style.background = '#7c3aed';
    }
}

// ========== GUARDAR PRODUCTO ==========
function guardarProducto() {
    const codigo = document.getElementById('productoCodigo').value.trim();
    const descripcion = document.getElementById('productoDescripcion').value.trim();
    const unidad = document.getElementById('productoUnidad').value;
    const comoCompra = document.getElementById('productoComoCompra').value;
    const comoVende = document.getElementById('productoComoVende').value;
    const retener = document.getElementById('productoRetener').value;
    const tarifaIva = document.getElementById('productoTarifaIva').value;
    const precioVenta = document.getElementById('productoPrecioVenta').value;
    const linea = document.getElementById('productoLinea').value;
    const identidad = document.getElementById('productoIdentidad').value.trim();
    const peso = document.getElementById('productoPeso').value;
    const unidadPeso = document.getElementById('productoUnidadPeso').value;

    // Validaciones
    if (!codigo || !descripcion || !precioVenta) {
        mostrarErrorModal('Complete los campos obligatorios');
        return;
    }

    if (parseFloat(precioVenta) <= 0) {
        mostrarErrorModal('El precio debe ser mayor a cero');
        return;
    }

    // Verificar código duplicado
    const codigoExiste = productos.some(p => 
        p.codigo === codigo && (!productoEditando || p.id !== productoEditando)
    );

    if (codigoExiste) {
        mostrarErrorModal('Ya existe un producto con este código');
        return;
    }

    const producto = {
        id: productoEditando || Date.now().toString(),
        codigo: codigo,
        descripcion: descripcion,
        unidadMedida: unidad,
        comoSeCompra: comoCompra,
        comoSeVende: comoVende,
        retenerPor: retener,
        tarifaIva: tarifaIva,
        precioVenta: parseFloat(precioVenta),
        linea: linea,
        identidadRelacionada: identidad,
        peso: peso ? parseFloat(peso) : null,
        unidadPeso: peso ? unidadPeso : null,
        fechaCreacion: productoEditando ? 
            productos.find(p => p.id === productoEditando)?.fechaCreacion : 
            new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
    };

    if (productoEditando) {
        const index = productos.findIndex(p => p.id === productoEditando);
        productos[index] = producto;
        mostrarNotificacion('Producto actualizado exitosamente', 'success');
    } else {
        productos.push(producto);
        mostrarNotificacion('Producto creado exitosamente', 'success');
    }

    guardarProductos();
    actualizarEstadisticas();
    renderizarProductos();
    cargarCategoriasEnFiltro();
    cerrarModalProducto();
}

// ========== EDITAR PRODUCTO ==========
function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    productoEditando = id;
    abrirModalProducto(true);

    // Llenar campos
    setTimeout(() => {
        document.getElementById('productoCodigo').value = producto.codigo;
        document.getElementById('productoDescripcion').value = producto.descripcion;
        document.getElementById('productoUnidad').value = producto.unidadMedida;
        document.getElementById('productoComoCompra').value = producto.comoSeCompra;
        document.getElementById('productoComoVende').value = producto.comoSeVende;
        document.getElementById('productoRetener').value = producto.retenerPor;
        document.getElementById('productoTarifaIva').value = producto.tarifaIva;
        document.getElementById('productoPrecioVenta').value = producto.precioVenta;
        document.getElementById('productoLinea').value = producto.linea || '';
        document.getElementById('productoIdentidad').value = producto.identidadRelacionada || '';
        document.getElementById('productoPeso').value = producto.peso || '';
        document.getElementById('productoUnidadPeso').value = producto.unidadPeso || 'KG';
    }, 100);
}

// ========== VER PRODUCTO ==========
function verProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    const detalles = `
CÓDIGO: ${producto.codigo}
DESCRIPCIÓN: ${producto.descripcion}
UNIDAD: ${producto.unidadMedida}
CÓMO SE COMPRA: ${producto.comoSeCompra}
CÓMO SE VENDE: ${producto.comoSeVende}
RETENER POR: ${producto.retenerPor}
TARIFA IVA: ${producto.tarifaIva}
PRECIO VENTA: ${formatearNumero(producto.precioVenta)}
LÍNEA: ${producto.linea || 'Sin línea'}
${producto.identidadRelacionada ? 'IDENTIDAD: ' + producto.identidadRelacionada : ''}
${producto.peso ? 'PESO/VOLUMEN: ' + producto.peso + ' ' + producto.unidadPeso : ''}
    `.trim();

    alert(detalles);
}

// ========== ELIMINAR PRODUCTO ==========
function eliminarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    if (confirm(`¿Eliminar producto "${producto.descripcion}"?\n\nEsta acción no se puede deshacer.`)) {
        productos = productos.filter(p => p.id !== id);
        guardarProductos();
        actualizarEstadisticas();
        renderizarProductos();
        cargarCategoriasEnFiltro();
        mostrarNotificacion('Producto eliminado', 'success');
    }
}

// ========== FILTRAR PRODUCTOS ==========
function filtrarProductos() {
    const searchTerm = document.getElementById('searchProducto').value.toLowerCase();
    const categoria = document.getElementById('filtroCategoria').value;
    const rows = document.querySelectorAll('#productosTableBody tr');

    rows.forEach(row => {
        const texto = row.textContent.toLowerCase();
        const coincideTexto = texto.includes(searchTerm);
        const coincideCategoria = !categoria || texto.includes(categoria.toLowerCase());

        if (coincideTexto && coincideCategoria) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ========== CARGAR CATEGORÍAS EN FILTRO ==========
function cargarCategoriasEnFiltro() {
    const select = document.getElementById('filtroCategoria');
    const categorias = new Set(productos.map(p => p.comoSeVende));
    
    select.innerHTML = '<option value="">Todas las categorías</option>';
    
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// ========== IMPORTAR PRODUCTOS DESDE EXCEL ==========
function importarProductos() {
    document.getElementById('fileImportExcel').click();
}

function procesarArchivoExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar que sea un archivo Excel
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
        alert('Por favor seleccione un archivo Excel válido (.xlsx o .xls)');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            // Aquí iría la lógica para procesar el Excel usando una librería como SheetJS
            // Por ahora, simularemos la importación
            
            mostrarNotificacion('Funcionalidad de importación en desarrollo. Use la librería SheetJS para implementar.', 'info');
            
            // Ejemplo de estructura esperada:
            // Código | Descripción | Unidad | Precio | IVA | ...
            
        } catch (error) {
            console.error('Error al procesar Excel:', error);
            alert('Error al procesar el archivo Excel');
        }
    };

    reader.readAsBinaryString(file);
    event.target.value = ''; // Limpiar input
}

// ========== CERRAR MODAL ==========
function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
    productoEditando = null;
}

function cerrarModalSiClickFuera(event) {
    if (event.target.className === 'modal-overlay') {
        cerrarModalProducto();
    }
}

// ========== UTILIDADES ==========
function formatearNumero(numero) {
    return new Intl.NumberFormat('es-CO').format(numero);
}

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

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.textContent = mensaje;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#2d7a4b' : tipo === 'info' ? '#1976d2' : '#c62828'};
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

// Cerrar modal con ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalProducto();
    }
});

console.log('Mis Productos - Módulo cargado correctamente ✨');