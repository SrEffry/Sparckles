// Nueva Factura Electrónica - Sparkles

let configuracionFacturacion = null;
let itemsFactura = [];
let numeroFacturaActual = null;

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    cargarConfiguracionFacturacion();
    setupLogout();
    
    // Agregar primer item automáticamente
    agregarItem(true);
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

// ========== CARGAR CONFIGURACIÓN DE FACTURACIÓN ==========
function cargarConfiguracionFacturacion() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuarioActual) return;
    
    const claveConfig = `config_facturacion_${usuarioActual.email}`;
    const configGuardada = localStorage.getItem(claveConfig);
    
    if (!configGuardada) {
        mostrarError('No se ha configurado la facturación. Por favor, configure primero en Operaciones > Configurar Facturación.');
        setTimeout(() => {
            window.location.href = 'Configurar-facturacion.html';
        }, 3000);
        return;
    }
    
    try {
        configuracionFacturacion = JSON.parse(configGuardada);
        
        // Calcular próximo número de factura
        if (configuracionFacturacion.resolucion) {
            const numeracionActual = configuracionFacturacion.resolucion.numeracionActual || 
                                   configuracionFacturacion.resolucion.numeracionDesde;
            numeroFacturaActual = parseInt(numeracionActual);
        }
        
        console.log('Configuración cargada:', configuracionFacturacion);
        console.log('Próximo número de factura:', numeroFacturaActual);
        
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        mostrarError('Error al cargar la configuración de facturación');
    }
}

// ========== TOGGLE TIPO DOCUMENTO ==========
function toggleTipoDocumento() {
    const tipoCliente = document.getElementById('tipoCliente').value;
    const tipoDocumento = document.getElementById('tipoDocumento');
    
    if (tipoCliente === 'empresa') {
        tipoDocumento.value = 'NIT';
    } else {
        tipoDocumento.value = 'CC';
    }
}

// ========== CARGAR PRODUCTOS REGISTRADOS ==========
function cargarProductosRegistrados() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) return [];
    
    const usuario = JSON.parse(usuarioActual);
    const claveProductos = `productos_${usuario.email}`;
    
    return JSON.parse(localStorage.getItem(claveProductos)) || [];
}

// ========== AGREGAR ITEM ==========
function agregarItem(esPrimero = false) {
    const itemId = Date.now();
    const productosRegistrados = cargarProductosRegistrados();
    
    // Crear opciones del select de productos
    const opcionesProductos = productosRegistrados.map(producto => 
        `<option value="${producto.id}" data-precio="${producto.precioVenta}" data-iva="${producto.tarifaIva}">${producto.descripcion}</option>`
    ).join('');
    
    const itemHTML = `
        <div class="item-row ${esPrimero ? 'first-item' : ''}" id="item-${itemId}">
            <div class="item-field modo-selector">
                <label>Modo de Selección *</label>
                <select id="modo-${itemId}" onchange="cambiarModoItem(${itemId})">
                    <option value="catalogo">Seleccionar del catálogo</option>
                    <option value="manual">Escribir manualmente</option>
                </select>
            </div>
            
            <div class="item-field producto-selector" id="selector-${itemId}">
                <label>Producto/Servicio *</label>
                <select id="producto-${itemId}" onchange="seleccionarProducto(${itemId})">
                    <option value="">-- Seleccione un producto --</option>
                    ${opcionesProductos}
                </select>
            </div>
            
            <div class="item-field producto-manual" id="manual-${itemId}" style="display: none;">
                <label>Descripción *</label>
                <input type="text" id="desc-${itemId}" placeholder="Producto o servicio" onchange="actualizarPreview()">
            </div>
            
            <div class="item-field">
                <label>Cantidad *</label>
                <input type="number" id="cant-${itemId}" value="1" min="1" step="1" onchange="calcularItem(${itemId})">
            </div>
            <div class="item-field">
                <label>Precio Unit. *</label>
                <input type="number" id="precio-${itemId}" value="0" min="0" step="0.01" onchange="calcularItem(${itemId})">
            </div>
            <div class="item-field">
                <label>IVA %</label>
                <select id="iva-${itemId}" onchange="calcularItem(${itemId})">
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="19" selected>19%</option>
                </select>
            </div>
            <div class="item-field">
                <label>Subtotal</label>
                <input type="text" id="subtotal-${itemId}" value="$0.00" readonly>
            </div>
            <button type="button" class="btn-remove-item" onclick="removerItem(${itemId})" ${esPrimero ? 'style="visibility: hidden;"' : ''}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', itemHTML);
    
    // Agregar al array de items
    itemsFactura.push({
        id: itemId,
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        iva: 19,
        subtotal: 0,
        modo: 'catalogo'
    });
}

// ========== CAMBIAR MODO DE ITEM ==========
function cambiarModoItem(itemId) {
    const modo = document.getElementById(`modo-${itemId}`).value;
    const selectorDiv = document.getElementById(`selector-${itemId}`);
    const manualDiv = document.getElementById(`manual-${itemId}`);
    
    if (modo === 'catalogo') {
        selectorDiv.style.display = 'flex';
        manualDiv.style.display = 'none';
        
        // Limpiar campo manual
        if (document.getElementById(`desc-${itemId}`)) {
            document.getElementById(`desc-${itemId}`).value = '';
        }
    } else {
        selectorDiv.style.display = 'none';
        manualDiv.style.display = 'flex';
        
        // Limpiar selector
        document.getElementById(`producto-${itemId}`).value = '';
    }
    
    // Actualizar modo en el array
    const item = itemsFactura.find(i => i.id === itemId);
    if (item) {
        item.modo = modo;
        item.descripcion = '';
    }
    
    // Resetear precio e IVA
    document.getElementById(`precio-${itemId}`).value = 0;
    document.getElementById(`iva-${itemId}`).value = 19;
    calcularItem(itemId);
}

// ========== SELECCIONAR PRODUCTO DEL CATÁLOGO ==========
function seleccionarProducto(itemId) {
    const selectProducto = document.getElementById(`producto-${itemId}`);
    const productoId = selectProducto.value;
    
    if (!productoId) {
        // Si se deselecciona, resetear valores
        document.getElementById(`precio-${itemId}`).value = 0;
        document.getElementById(`iva-${itemId}`).value = 19;
        calcularItem(itemId);
        return;
    }
    
    // Buscar el producto seleccionado
    const productosRegistrados = cargarProductosRegistrados();
    const producto = productosRegistrados.find(p => p.id === productoId);
    
    if (producto) {
        // Autocompletar precio
        document.getElementById(`precio-${itemId}`).value = producto.precioVenta;
        
        // Autocompletar IVA (convertir tarifas a porcentajes)
        let ivaValor = 19; // Por defecto
        if (producto.tarifaIva === '0%' || producto.tarifaIva === 'Exento' || producto.tarifaIva === 'Excluido') {
            ivaValor = 0;
        } else if (producto.tarifaIva === '5%') {
            ivaValor = 5;
        } else if (producto.tarifaIva === '19%') {
            ivaValor = 19;
        }
        document.getElementById(`iva-${itemId}`).value = ivaValor;
        
        // Actualizar descripción en el array
        const item = itemsFactura.find(i => i.id === itemId);
        if (item) {
            item.descripcion = producto.descripcion;
        }
        
        // Calcular totales
        calcularItem(itemId);
    }
}

// ========== REMOVER ITEM ==========
function removerItem(itemId) {
    document.getElementById(`item-${itemId}`).remove();
    itemsFactura = itemsFactura.filter(item => item.id !== itemId);
    actualizarPreview();
}

// ========== CALCULAR ITEM ==========
function calcularItem(itemId) {
    const cantidad = parseFloat(document.getElementById(`cant-${itemId}`).value) || 0;
    const precio = parseFloat(document.getElementById(`precio-${itemId}`).value) || 0;
    const subtotal = cantidad * precio;
    
    document.getElementById(`subtotal-${itemId}`).value = `$${formatearNumero(subtotal)}`;
    
    // Actualizar en el array
    const item = itemsFactura.find(i => i.id === itemId);
    if (item) {
        item.cantidad = cantidad;
        item.precioUnitario = precio;
        item.iva = parseFloat(document.getElementById(`iva-${itemId}`).value);
        item.subtotal = subtotal;
    }
    
    actualizarPreview();
}

// ========== ACTUALIZAR PREVIEW ==========
function actualizarPreview() {
    let subtotalTotal = 0;
    let ivaTotal = 0;
    
    itemsFactura.forEach(item => {
        const cantidad = parseFloat(document.getElementById(`cant-${item.id}`).value) || 0;
        const precio = parseFloat(document.getElementById(`precio-${item.id}`).value) || 0;
        const iva = parseFloat(document.getElementById(`iva-${item.id}`).value) || 0;
        
        const subtotal = cantidad * precio;
        const ivaItem = subtotal * (iva / 100);
        
        subtotalTotal += subtotal;
        ivaTotal += ivaItem;
    });
    
    const total = subtotalTotal + ivaTotal;
    
    document.getElementById('previewSubtotal').textContent = `$${formatearNumero(subtotalTotal)}`;
    document.getElementById('previewIva').textContent = `$${formatearNumero(ivaTotal)}`;
    document.getElementById('previewTotal').textContent = `$${formatearNumero(total)}`;
}

// ========== GENERAR FACTURA ==========
function generarFactura() {
    // Validar datos del cliente
    const tipoCliente = document.getElementById('tipoCliente').value;
    const tipoDocumento = document.getElementById('tipoDocumento').value;
    const numeroDocumento = document.getElementById('numeroDocumento').value.trim();
    const nombreCliente = document.getElementById('nombreCliente').value.trim();
    
    if (!numeroDocumento || !nombreCliente) {
        mostrarError('Por favor complete los datos del cliente (Documento y Nombre)');
        return;
    }
    
    // Validar items
    let itemsValidos = true;
    itemsFactura.forEach(item => {
        const modo = document.getElementById(`modo-${item.id}`).value;
        let desc = '';
        
        if (modo === 'catalogo') {
            const selectProducto = document.getElementById(`producto-${item.id}`);
            if (!selectProducto.value) {
                itemsValidos = false;
                return;
            }
            desc = selectProducto.options[selectProducto.selectedIndex].text;
        } else {
            desc = document.getElementById(`desc-${item.id}`).value.trim();
            if (!desc) {
                itemsValidos = false;
                return;
            }
        }
        
        const cant = parseFloat(document.getElementById(`cant-${item.id}`).value);
        const precio = parseFloat(document.getElementById(`precio-${item.id}`).value);
        
        if (cant <= 0 || precio <= 0) {
            itemsValidos = false;
        }
    });
    
    if (!itemsValidos || itemsFactura.length === 0) {
        mostrarError('Por favor complete todos los items: seleccione un producto del catálogo o escriba una descripción, y asegúrese de que cantidad y precio sean válidos');
        return;
    }
    
    // Recopilar datos completos
    const datosCliente = {
        tipo: tipoCliente,
        tipoDocumento: tipoDocumento,
        numeroDocumento: numeroDocumento,
        nombre: nombreCliente,
        telefono: document.getElementById('telefonoCliente').value.trim(),
        email: document.getElementById('emailCliente').value.trim(),
        direccion: document.getElementById('direccionCliente').value.trim()
    };
    
    const observaciones = document.getElementById('observaciones').value.trim();
    
    // Calcular totales
    let subtotalTotal = 0;
    let ivaTotal = 0;
    const itemsCompletos = [];
    
    itemsFactura.forEach(item => {
        const modo = document.getElementById(`modo-${item.id}`).value;
        let desc = '';
        
        if (modo === 'catalogo') {
            const selectProducto = document.getElementById(`producto-${item.id}`);
            desc = selectProducto.options[selectProducto.selectedIndex].text;
        } else {
            desc = document.getElementById(`desc-${item.id}`).value.trim();
        }
        
        const cant = parseFloat(document.getElementById(`cant-${item.id}`).value);
        const precio = parseFloat(document.getElementById(`precio-${item.id}`).value);
        const iva = parseFloat(document.getElementById(`iva-${item.id}`).value);
        
        const subtotal = cant * precio;
        const ivaItem = subtotal * (iva / 100);
        const total = subtotal + ivaItem;
        
        subtotalTotal += subtotal;
        ivaTotal += ivaItem;
        
        itemsCompletos.push({
            descripcion: desc,
            cantidad: cant,
            precioUnitario: precio,
            iva: iva,
            subtotal: subtotal,
            ivaValor: ivaItem,
            total: total
        });
    });
    
    const totalFinal = subtotalTotal + ivaTotal;
    
    // Crear objeto factura
    const factura = {
        numero: numeroFacturaActual,
        prefijo: configuracionFacturacion.resolucion?.prefijo || 'SETT',
        fecha: new Date().toLocaleDateString('es-CO'),
        hora: new Date().toLocaleTimeString('es-CO'),
        cliente: datosCliente,
        items: itemsCompletos,
        subtotal: subtotalTotal,
        iva: ivaTotal,
        total: totalFinal,
        observaciones: observaciones,
        configuracion: configuracionFacturacion
    };
    
    // Guardar factura en localStorage
    guardarFactura(factura);
    
    // Actualizar numeración
    actualizarNumeracion();
    
    // Mostrar factura generada
    mostrarFacturaGenerada(factura);
}

// ========== GUARDAR FACTURA ==========
function guardarFactura(factura) {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveFacturas = `facturas_${usuarioActual.email}`;
    
    let facturas = JSON.parse(localStorage.getItem(claveFacturas)) || [];
    
    factura.id = Date.now().toString();
    factura.usuarioId = usuarioActual.email;
    
    facturas.push(factura);
    localStorage.setItem(claveFacturas, JSON.stringify(facturas));
    
    console.log('Factura guardada:', factura);
}

// ========== ACTUALIZAR NUMERACIÓN ==========
function actualizarNumeracion() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveConfig = `config_facturacion_${usuarioActual.email}`;
    
    if (configuracionFacturacion && configuracionFacturacion.resolucion) {
        configuracionFacturacion.resolucion.numeracionActual = numeroFacturaActual + 1;
        localStorage.setItem(claveConfig, JSON.stringify(configuracionFacturacion));
    }
}

// ========== MOSTRAR FACTURA GENERADA ==========
function mostrarFacturaGenerada(factura) {
    const numeroCompleto = `${factura.prefijo}-${String(factura.numero).padStart(5, '0')}`;
    
    const facturaHTML = `
        <div class="factura-generada">
            <div class="factura-generada-header">
                <div class="factura-generada-logo">
                    ${factura.configuracion.logo ? 
                        `<img src="${factura.configuracion.logo}" alt="Logo">` : 
                        '<span>LOGO</span>'}
                </div>
                <div class="factura-generada-empresa">
                    <strong>${factura.configuracion.razonSocial}</strong>
                    <p>NIT: ${factura.configuracion.nit}</p>
                    <p>${factura.configuracion.direccion}, ${factura.configuracion.ciudad}</p>
                    <p>Tel: ${factura.configuracion.telefono} | ${factura.configuracion.email}</p>
                    <p>${factura.configuracion.regimen}</p>
                </div>
            </div>
            
            <div class="factura-generada-title">
                <h2>FACTURA ELECTRÓNICA DE VENTA</h2>
                <p>Resolución DIAN No. ${factura.configuracion.resolucion?.numero || 'N/A'}</p>
                <p>Del ${factura.configuracion.resolucion?.numeracionDesde || 'N/A'} al ${factura.configuracion.resolucion?.numeracionHasta || 'N/A'}</p>
            </div>
            
            <div class="factura-generada-info">
                <div><strong>Factura No.:</strong> ${numeroCompleto}</div>
                <div><strong>Fecha:</strong> ${factura.fecha}</div>
                <div><strong>Hora:</strong> ${factura.hora}</div>
            </div>
            
            <div class="factura-generada-cliente">
                <h4>CLIENTE</h4>
                <p><strong>Nombre:</strong> ${factura.cliente.nombre}</p>
                <p><strong>${factura.cliente.tipoDocumento}:</strong> ${factura.cliente.numeroDocumento}</p>
                ${factura.cliente.direccion ? `<p><strong>Dirección:</strong> ${factura.cliente.direccion}</p>` : ''}
                ${factura.cliente.telefono ? `<p><strong>Teléfono:</strong> ${factura.cliente.telefono}</p>` : ''}
                ${factura.cliente.email ? `<p><strong>Email:</strong> ${factura.cliente.email}</p>` : ''}
            </div>
            
            <div class="factura-generada-items">
                <table>
                    <thead>
                        <tr>
                            <th>DESCRIPCIÓN</th>
                            <th>CANT.</th>
                            <th>PRECIO UNIT.</th>
                            <th>IVA</th>
                            <th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${factura.items.map(item => `
                            <tr>
                                <td>${item.descripcion}</td>
                                <td>${item.cantidad}</td>
                                <td>$${formatearNumero(item.precioUnitario)}</td>
                                <td>${item.iva}%</td>
                                <td>$${formatearNumero(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="factura-generada-totales">
                <div><strong>Subtotal:</strong> $${formatearNumero(factura.subtotal)}</div>
                <div><strong>IVA (19%):</strong> $${formatearNumero(factura.iva)}</div>
                <div class="total-final"><strong>TOTAL:</strong> $${formatearNumero(factura.total)}</div>
            </div>
            
            ${factura.observaciones ? `
                <div class="factura-generada-footer">
                    <p><strong>Observaciones:</strong></p>
                    <p>${factura.observaciones}</p>
                </div>
            ` : ''}
            
            ${factura.configuracion.pieFact ? `
                <div class="factura-generada-footer" style="margin-top: 20px;">
                    <p>${factura.configuracion.pieFact}</p>
                </div>
            ` : ''}
            
            <div class="factura-generada-acciones">
                <button class="btn-accion btn-descargar" onclick="descargarFactura()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Descargar PDF
                </button>
                <button class="btn-accion btn-imprimir" onclick="imprimirFactura()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Imprimir
                </button>
                <button class="btn-accion btn-nueva" onclick="nuevaFactura()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Nueva Factura
                </button>
            </div>
        </div>
    `;
    
    // Ocultar formulario y mostrar factura
    document.querySelector('.factura-form').style.display = 'none';
    document.querySelector('.factura-preview').innerHTML = `
        <h3>Factura Generada Exitosamente ✅</h3>
        ${facturaHTML}
    `;
}

// ========== DESCARGAR FACTURA ==========
function descargarFactura() {
    alert('Funcionalidad de descarga PDF en desarrollo.\n\nSe requiere una librería como jsPDF o html2pdf para implementar esta función.');
}

// ========== IMPRIMIR FACTURA ==========
function imprimirFactura() {
    window.print();
}

// ========== NUEVA FACTURA ==========
function nuevaFactura() {
    location.reload();
}

// ========== UTILIDADES ==========
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
        
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

console.log('Nueva Factura Electrónica - Módulo cargado correctamente ✨');