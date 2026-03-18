// Gestión de Productos - Sparkles CON RETENCIONES

let productos = [];
let productoEditando = null;
let conceptoRetefuenteSeleccionado = null; // NUEVO: Para retenciones

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    cargarProductos();
    actualizarEstadisticas();
    renderizarProductos();
    cargarCategoriasEnFiltro();
    setupLogout();
    
    console.log('✅ Sistema de productos con retenciones cargado');
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
function guardarProductosEnStorage() {
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
    const activos = productos.length;
    const conIva = productos.filter(p => p.tarifaIva !== '0%' && p.tarifaIva !== 'Exento').length;

    document.getElementById('totalProductos').textContent = total;
    document.getElementById('productosActivos').textContent = activos;
    document.getElementById('productosConIva').textContent = conIva;
}

// ========== RENDERIZAR PRODUCTOS ==========
function renderizarProductos() {
    const tbody = document.getElementById('productosTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('productosTable');
    
    if (productos.length === 0) {
        emptyState.style.display = 'flex';
        table.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    table.style.display = 'table';
    
    tbody.innerHTML = productos.map(producto => `
        <tr>
            <td><strong>${producto.codigo}</strong></td>
            <td>${producto.descripcion}</td>
            <td>
                <span class="badge-categoria">${producto.comoVende || 'Sin categoría'}</span>
            </td>
            <td class="precio-cell">$${formatearPrecio(producto.precioVenta)}</td>
            <td>
                <span class="badge-iva ${getIvaBadgeClass(producto.tarifaIva)}">${producto.tarifaIva}</span>
            </td>
            <td>
                <div class="acciones-cell">
                    <button class="btn-icon" onclick="editarProducto('${producto.codigo}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="eliminarProducto('${producto.codigo}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ========== ABRIR MODAL PRODUCTO CON RETENCIONES ==========
function abrirModalProducto(esEdicion = false) {
    productoEditando = null;
    conceptoRetefuenteSeleccionado = null;
    
    const modalHTML = `
        <div class="modal-overlay" id="modalProducto" onclick="cerrarModalSiClickFuera(event)">
            <div class="modal-content modal-producto-grande" onclick="event.stopPropagation()">
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
                    <!-- SECCIÓN 1: INFORMACIÓN BÁSICA -->
                    <div class="modal-section">
                        <h3 class="modal-section-title">Información Básica</h3>
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
                                    <option value="Litro">Litro (L)</option>
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
                        </div>
                    </div>

                    <!-- SECCIÓN 2: RETENCIONES EN LA FUENTE -->
                    <div class="modal-section">
                        <h3 class="modal-section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                            Retención en la Fuente
                        </h3>

                        <!-- Checkbox Retención -->
                        <div class="form-field-producto full-width">
                            <label class="checkbox-label-retencion">
                                <input type="checkbox" id="aplicaRetefuente" onchange="toggleRetefuenteModal()">
                                <span>Este producto aplica Retención en la Fuente automática</span>
                            </label>
                            <small class="help-text">Al activar, se aplicará retención automáticamente al facturar este producto</small>
                        </div>

                        <!-- Campos de Retención -->
                        <div id="camposRetefuenteModal" style="display: none;">
                            <div class="form-grid-producto">
                                <div class="form-field-producto">
                                    <label>Categoría de Retención *</label>
                                    <select id="categoriaRetefuente" onchange="cargarConceptosModalRetencion()">
                                        <option value="">-- Seleccione --</option>
                                        <option value="Servicios">Servicios</option>
                                        <option value="Honorarios">Honorarios</option>
                                        <option value="Comisiones">Comisiones</option>
                                        <option value="Compras">Compras</option>
                                        <option value="Arrendamientos">Arrendamientos</option>
                                        <option value="Transportes">Transportes</option>
                                        <option value="Rendimientos Financieros">Rendimientos Financieros</option>
                                        <option value="Venta de Activos">Venta de Activos</option>
                                        <option value="Construcción">Construcción</option>
                                        <option value="Dividendos">Dividendos</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>

                                <div class="form-field-producto">
                                    <label>Concepto de Retención *</label>
                                    <select id="conceptoRetefuente" onchange="mostrarDetallesConceptoModal()" disabled>
                                        <option value="">-- Primero seleccione categoría --</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Detalles del Concepto -->
                            <div id="detallesConceptoModal" class="detalles-concepto-modal" style="display: none;">
                                <div class="detalle-card-modal">
                                    <div class="detalle-info">
                                        <span class="detalle-label">Tarifa:</span>
                                        <span class="detalle-valor-tarifa" id="detalleTarifaModal">0%</span>
                                    </div>
                                    <div class="detalle-info">
                                        <span class="detalle-label">Base mínima:</span>
                                        <span class="detalle-valor" id="detalleBaseMinimaModal">-</span>
                                    </div>
                                    <div class="detalle-info full">
                                        <span class="detalle-label">Aplica a:</span>
                                        <span class="detalle-valor" id="detalleAplicaAModal">-</span>
                                    </div>
                                </div>
                                <div class="info-uvt-modal">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                    UVT 2026: $52,374
                                </div>
                            </div>
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
    
    if (!esEdicion) {
        generarCodigoAutomatico();
    }
}

// ========== TOGGLE RETENCIÓN EN MODAL ==========
function toggleRetefuenteModal() {
    const checkbox = document.getElementById('aplicaRetefuente');
    const campos = document.getElementById('camposRetefuenteModal');
    
    if (checkbox.checked) {
        campos.style.display = 'block';
    } else {
        campos.style.display = 'none';
        limpiarCamposRetencionModal();
    }
}

// ========== CARGAR CONCEPTOS POR CATEGORÍA EN MODAL ==========
function cargarConceptosModalRetencion() {
    const categoria = document.getElementById('categoriaRetefuente').value;
    const selectConcepto = document.getElementById('conceptoRetefuente');
    const detalles = document.getElementById('detallesConceptoModal');
    
    selectConcepto.innerHTML = '<option value="">-- Seleccione un concepto --</option>';
    detalles.style.display = 'none';
    conceptoRetefuenteSeleccionado = null;
    
    if (!categoria) {
        selectConcepto.disabled = true;
        return;
    }
    
    const conceptos = TABLA_RETEFUENTE_COMPLETA_2026.conceptos.filter(c => c.categoria === categoria);
    
    if (conceptos.length === 0) {
        selectConcepto.disabled = true;
        return;
    }
    
    conceptos.forEach(concepto => {
        const option = document.createElement('option');
        option.value = concepto.id;
        const tarifaTexto = typeof concepto.tarifa === 'number' ? `${concepto.tarifa}%` : concepto.tarifa;
        option.textContent = `${concepto.nombre} (${tarifaTexto})`;
        selectConcepto.appendChild(option);
    });
    
    selectConcepto.disabled = false;
}

// ========== MOSTRAR DETALLES DEL CONCEPTO EN MODAL ==========
function mostrarDetallesConceptoModal() {
    const conceptoId = document.getElementById('conceptoRetefuente').value;
    const detalles = document.getElementById('detallesConceptoModal');
    
    if (!conceptoId) {
        detalles.style.display = 'none';
        conceptoRetefuenteSeleccionado = null;
        return;
    }
    
    const concepto = TABLA_RETEFUENTE_COMPLETA_2026.conceptos.find(c => c.id === conceptoId);
    
    if (!concepto) return;
    
    conceptoRetefuenteSeleccionado = concepto;
    
    const tarifaTexto = typeof concepto.tarifa === 'number' ? `${concepto.tarifa}%` : concepto.tarifa;
    document.getElementById('detalleTarifaModal').textContent = tarifaTexto;
    
    const baseMinimaTexto = concepto.baseMinima > 0 
        ? `${concepto.baseMinima} UVT ($${formatearNumero(concepto.baseMinimaP)})`
        : 'Desde cualquier valor';
    
    document.getElementById('detalleBaseMinimaModal').textContent = baseMinimaTexto;
    document.getElementById('detalleAplicaAModal').textContent = concepto.aplicaA;
    
    detalles.style.display = 'block';
}

// ========== LIMPIAR CAMPOS DE RETENCIÓN ==========
function limpiarCamposRetencionModal() {
    document.getElementById('categoriaRetefuente').value = '';
    document.getElementById('conceptoRetefuente').innerHTML = '<option value="">-- Primero seleccione categoría --</option>';
    document.getElementById('conceptoRetefuente').disabled = true;
    document.getElementById('detallesConceptoModal').style.display = 'none';
    conceptoRetefuenteSeleccionado = null;
}

// ========== OBTENER DATOS DE RETENCIÓN ==========
function obtenerDatosRetencion() {
    const aplicaRetefuente = document.getElementById('aplicaRetefuente')?.checked;
    
    if (!aplicaRetefuente || !conceptoRetefuenteSeleccionado) {
        return { aplica: false };
    }
    
    return {
        aplica: true,
        conceptoId: conceptoRetefuenteSeleccionado.id,
        nombre: conceptoRetefuenteSeleccionado.nombre,
        categoria: conceptoRetefuenteSeleccionado.categoria,
        tarifa: conceptoRetefuenteSeleccionado.tarifa,
        baseMinima: conceptoRetefuenteSeleccionado.baseMinima,
        baseMinimaP: conceptoRetefuenteSeleccionado.baseMinimaP,
        baseCalculo: conceptoRetefuenteSeleccionado.baseCalculo,
        aplicaA: conceptoRetefuenteSeleccionado.aplicaA
    };
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
    const tarifaIva = document.getElementById('productoTarifaIva').value;
    const precioVenta = document.getElementById('productoPrecioVenta').value;
    const linea = document.getElementById('productoLinea').value;

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
    const codigoDuplicado = productos.find(p => 
        p.codigo === codigo && (!productoEditando || p.codigo !== productoEditando.codigo)
    );
    
    if (codigoDuplicado) {
        mostrarErrorModal('Ya existe un producto con ese código');
        return;
    }

    // Validar retenciones si están activas
    const aplicaRetefuente = document.getElementById('aplicaRetefuente')?.checked;
    if (aplicaRetefuente) {
        const categoria = document.getElementById('categoriaRetefuente').value;
        const concepto = document.getElementById('conceptoRetefuente').value;
        
        if (!categoria || !concepto) {
            mostrarErrorModal('Complete la configuración de retención');
            return;
        }
    }

    const nuevoProducto = {
        codigo: codigo,
        descripcion: descripcion,
        unidad: unidad,
        comoCompra: comoCompra,
        comoVende: comoVende,
        tarifaIva: tarifaIva,
        precioVenta: precioVenta,
        linea: linea,
        
        // NUEVO: Retención
        retencion: obtenerDatosRetencion(),
        
        fechaCreacion: new Date().toISOString()
    };

    if (productoEditando) {
        const index = productos.findIndex(p => p.codigo === productoEditando.codigo);
        productos[index] = nuevoProducto;
        console.log('✅ Producto actualizado');
    } else {
        productos.push(nuevoProducto);
        console.log('✅ Producto creado');
    }

    if (nuevoProducto.retencion.aplica) {
        console.log(`   💰 Con retención: ${nuevoProducto.retencion.nombre} (${nuevoProducto.retencion.tarifa}%)`);
    }

    guardarProductosEnStorage();
    cerrarModalProducto();
    renderizarProductos();
    actualizarEstadisticas();
}

// ========== CERRAR MODAL ==========
function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        productoEditando = null;
        conceptoRetefuenteSeleccionado = null;
    }
}

function cerrarModalSiClickFuera(event) {
    if (event.target.id === 'modalProducto') {
        cerrarModalProducto();
    }
}

// ========== EDITAR PRODUCTO ==========
function editarProducto(codigo) {
    const producto = productos.find(p => p.codigo === codigo);
    if (!producto) return;
    
    productoEditando = producto;
    abrirModalProducto(true);
    
    setTimeout(() => {
        document.getElementById('productoCodigo').value = producto.codigo;
        document.getElementById('productoDescripcion').value = producto.descripcion;
        document.getElementById('productoUnidad').value = producto.unidad;
        document.getElementById('productoComoCompra').value = producto.comoCompra;
        document.getElementById('productoComoVende').value = producto.comoVende;
        document.getElementById('productoTarifaIva').value = producto.tarifaIva;
        document.getElementById('productoPrecioVenta').value = producto.precioVenta;
        document.getElementById('productoLinea').value = producto.linea || '';
        
        // Cargar retención si existe
        if (producto.retencion && producto.retencion.aplica) {
            document.getElementById('aplicaRetefuente').checked = true;
            toggleRetefuenteModal();
            
            const concepto = TABLA_RETEFUENTE_COMPLETA_2026.conceptos.find(c => c.id === producto.retencion.conceptoId);
            if (concepto) {
                document.getElementById('categoriaRetefuente').value = concepto.categoria;
                cargarConceptosModalRetencion();
                
                setTimeout(() => {
                    document.getElementById('conceptoRetefuente').value = concepto.id;
                    mostrarDetallesConceptoModal();
                }, 100);
            }
        }
    }, 100);
}

// ========== ELIMINAR PRODUCTO ==========
function eliminarProducto(codigo) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    
    productos = productos.filter(p => p.codigo !== codigo);
    guardarProductosEnStorage();
    renderizarProductos();
    actualizarEstadisticas();
    console.log('✅ Producto eliminado');
}

// ========== FILTRAR PRODUCTOS ==========
function filtrarProductos() {
    // Implementar filtrado...
    renderizarProductos();
}

function cargarCategoriasEnFiltro() {
    // Implementar...
}

// ========== UTILIDADES ==========
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(precio);
}

function formatearNumero(numero) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numero);
}

function getIvaBadgeClass(iva) {
    if (iva === '0%' || iva === 'Exento' || iva === 'Excluido') return 'badge-iva-cero';
    if (iva === '5%') return 'badge-iva-cinco';
    if (iva === '19%') return 'badge-iva-diecinueve';
    return '';
}

function mostrarErrorModal(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function importarProductos() {
    alert('Funcionalidad de importar Excel en desarrollo');
}

console.log('✅ Sistema de productos con retenciones completo cargado');