// ============================================================
// ASIENTOS CONTABLES - SPARKLES
// Sistema de Contabilidad por Partida Doble
// ============================================================

let asientoEditando = null;
let movimientos = [];
let contadorLineas = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Solo ejecutar inicialización si NO estamos en la página de Operaciones
    // (En Operaciones, se inicializa manualmente al cambiar de tab)
    if (!window.location.pathname.includes('Operaciones')) {
        verificarSesion();
        cargarDatosUsuario();
        setupLogout();
        cargarAsientos();
        actualizarEstadisticas();
        inicializarFechaHoy();
        
        console.log('✅ Módulo de asientos contables cargado');
    }
});

// ========== INICIALIZACIÓN MANUAL (Para uso en Operaciones) ==========
function iniciarAsientos() {
    cargarAsientos();
    actualizarEstadisticas();
    inicializarFechaHoy();
}

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
        logoutBtn.addEventListener('click', function() {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                sessionStorage.removeItem('usuarioActual');
                window.location.href = '../index.html';
            }
        });
    }
}

// ========== INICIALIZAR FECHA ==========
function inicializarFechaHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');
    
    if (fechaDesde) {
        const primerDiaMes = new Date();
        primerDiaMes.setDate(1);
        fechaDesde.value = primerDiaMes.toISOString().split('T')[0];
    }
    
    if (fechaHasta) {
        fechaHasta.value = hoy;
    }
}

// ========== MODAL ASIENTO ==========
function abrirModalAsiento(asiento = null) {
    const modal = document.getElementById('modalAsiento');
    const titulo = document.getElementById('modalTitle');
    
    asientoEditando = asiento;
    movimientos = [];
    contadorLineas = 0;
    
    if (asiento) {
        titulo.textContent = 'Editar Asiento Contable';
        cargarDatosAsiento(asiento);
    } else {
        titulo.textContent = 'Nuevo Asiento Contable';
        limpiarFormularioAsiento();
    }
    
    modal.style.display = 'flex';
    
    // Agregar 2 líneas iniciales
    if (!asiento) {
        agregarLineaMovimiento();
        agregarLineaMovimiento();
    }
}

function cerrarModalAsiento() {
    document.getElementById('modalAsiento').style.display = 'none';
    limpiarFormularioAsiento();
    asientoEditando = null;
}

function limpiarFormularioAsiento() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaAsiento').value = hoy;
    document.getElementById('descripcionAsiento').value = '';
    document.getElementById('movimientosContainer').innerHTML = '';
    document.getElementById('mensajeError').style.display = 'none';
    movimientos = [];
    contadorLineas = 0;
    actualizarTotales();
}

// ========== AGREGAR LÍNEA DE MOVIMIENTO ==========
function agregarLineaMovimiento() {
    const container = document.getElementById('movimientosContainer');
    const lineaId = `linea-${contadorLineas}`;
    
    const linea = document.createElement('div');
    linea.className = 'movimiento-linea';
    linea.id = lineaId;
    
    linea.innerHTML = `
        <div class="movimiento-numero">${contadorLineas + 1}</div>
        <div class="movimiento-campos">
            <div class="campo-cuenta">
                <label>Cuenta PUC</label>
                <input type="text" 
                       class="input-cuenta-codigo" 
                       placeholder="Código" 
                       list="listaCuentas-${contadorLineas}"
                       onchange="seleccionarCuentaPorCodigo(${contadorLineas}, this.value)">
                <datalist id="listaCuentas-${contadorLineas}">
                    ${generarOpcionesCuentas()}
                </datalist>
                <input type="text" 
                       class="input-cuenta-nombre" 
                       placeholder="Nombre de la cuenta" 
                       readonly>
            </div>
            <div class="campo-debito">
                <label>Débito</label>
                <input type="number" 
                       step="0.01" 
                       min="0" 
                       placeholder="0.00"
                       onchange="actualizarTotales()">
            </div>
            <div class="campo-credito">
                <label>Crédito</label>
                <input type="number" 
                       step="0.01" 
                       min="0" 
                       placeholder="0.00"
                       onchange="actualizarTotales()">
            </div>
            <div class="campo-tercero">
                <label>Tercero (Opcional)</label>
                <input type="text" 
                       placeholder="Ej: Juan Pérez - CC 123456">
            </div>
        </div>
        <button type="button" class="btn-eliminar-linea" onclick="eliminarLineaMovimiento('${lineaId}')" title="Eliminar línea">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
    `;
    
    container.appendChild(linea);
    contadorLineas++;
}

function eliminarLineaMovimiento(lineaId) {
    const linea = document.getElementById(lineaId);
    if (linea) {
        linea.remove();
        actualizarNumerosLineas();
        actualizarTotales();
    }
}

function actualizarNumerosLineas() {
    const lineas = document.querySelectorAll('.movimiento-linea');
    lineas.forEach((linea, index) => {
        const numero = linea.querySelector('.movimiento-numero');
        if (numero) {
            numero.textContent = index + 1;
        }
    });
}

// ========== GENERAR OPCIONES DE CUENTAS ==========
function generarOpcionesCuentas() {
    const cuentas = obtenerTodasLasCuentas();
    return cuentas.map(cuenta => 
        `<option value="${cuenta.codigo}">${cuenta.codigo} - ${cuenta.nombre}</option>`
    ).join('');
}

// ========== SELECCIONAR CUENTA ==========
function seleccionarCuentaPorCodigo(index, codigo) {
    const cuenta = obtenerCuentaPUC(codigo);
    const linea = document.querySelectorAll('.movimiento-linea')[index];
    
    if (!linea) return;
    
    const inputNombre = linea.querySelector('.input-cuenta-nombre');
    
    if (cuenta) {
        inputNombre.value = cuenta.nombre;
        inputNombre.style.borderColor = '#2d7a4b';
        
        // Resetear color después de 1 segundo
        setTimeout(() => {
            inputNombre.style.borderColor = '';
        }, 1000);
    } else {
        inputNombre.value = '';
        if (codigo) {
            mostrarError('Código de cuenta no encontrado en el PUC');
        }
    }
}

// ========== ACTUALIZAR TOTALES ==========
function actualizarTotales() {
    const lineas = document.querySelectorAll('.movimiento-linea');
    let totalDebitos = 0;
    let totalCreditos = 0;
    
    lineas.forEach(linea => {
        const debito = parseFloat(linea.querySelector('.campo-debito input').value) || 0;
        const credito = parseFloat(linea.querySelector('.campo-credito input').value) || 0;
        
        totalDebitos += debito;
        totalCreditos += credito;
    });
    
    document.getElementById('totalDebitos').textContent = `$${formatearNumero(totalDebitos)}`;
    document.getElementById('totalCreditos').textContent = `$${formatearNumero(totalCreditos)}`;
    
    const diferencia = totalDebitos - totalCreditos;
    const diferenciaAbs = Math.abs(diferencia);
    
    document.getElementById('diferencia').textContent = `$${formatearNumero(diferenciaAbs)}`;
    
    const diferenciaContainer = document.getElementById('diferenciaContainer');
    const validacionAsiento = document.getElementById('validacionAsiento');
    const btnRegistrar = document.getElementById('btnRegistrar');
    
    if (Math.abs(diferencia) < 0.01 && totalDebitos > 0) {
        // Asiento balanceado
        diferenciaContainer.classList.add('balanceado');
        diferenciaContainer.classList.remove('desbalanceado');
        validacionAsiento.style.display = 'flex';
        btnRegistrar.disabled = false;
    } else {
        // Asiento desbalanceado
        diferenciaContainer.classList.remove('balanceado');
        diferenciaContainer.classList.add('desbalanceado');
        validacionAsiento.style.display = 'none';
        btnRegistrar.disabled = true;
    }
}

// ========== GUARDAR ASIENTO ==========
function guardarAsiento(estado) {
    const fecha = document.getElementById('fechaAsiento').value;
    const descripcion = document.getElementById('descripcionAsiento').value.trim();
    const lineas = document.querySelectorAll('.movimiento-linea');
    
    // Validaciones
    if (!fecha) {
        mostrarError('Por favor ingrese la fecha del asiento');
        return;
    }
    
    if (!descripcion) {
        mostrarError('Por favor ingrese una descripción del asiento');
        return;
    }
    
    if (lineas.length < 2) {
        mostrarError('El asiento debe tener al menos 2 movimientos');
        return;
    }
    
    // Recopilar movimientos
    const movimientosData = [];
    let totalDebitos = 0;
    let totalCreditos = 0;
    let hayError = false;
    
    lineas.forEach((linea, index) => {
        const codigo = linea.querySelector('.input-cuenta-codigo').value.trim();
        const nombreCuenta = linea.querySelector('.input-cuenta-nombre').value.trim();
        const debito = parseFloat(linea.querySelector('.campo-debito input').value) || 0;
        const credito = parseFloat(linea.querySelector('.campo-credito input').value) || 0;
        const tercero = linea.querySelector('.campo-tercero input').value.trim();
        
        if (!codigo || !nombreCuenta) {
            mostrarError(`Línea ${index + 1}: Debe seleccionar una cuenta válida`);
            hayError = true;
            return;
        }
        
        if (debito === 0 && credito === 0) {
            mostrarError(`Línea ${index + 1}: Debe ingresar un valor en débito o crédito`);
            hayError = true;
            return;
        }
        
        if (debito > 0 && credito > 0) {
            mostrarError(`Línea ${index + 1}: No puede haber débito y crédito al mismo tiempo`);
            hayError = true;
            return;
        }
        
        totalDebitos += debito;
        totalCreditos += credito;
        
        movimientosData.push({
            cuenta: codigo,
            nombreCuenta: nombreCuenta,
            debito: debito,
            credito: credito,
            tercero: tercero
        });
    });
    
    if (hayError) return;
    
    // Validar balance (solo para registrados)
    const diferencia = Math.abs(totalDebitos - totalCreditos);
    if (estado === 'registrado' && diferencia > 0.01) {
        mostrarError(`El asiento no está balanceado. Diferencia: $${formatearNumero(diferencia)}`);
        return;
    }
    
    // Obtener usuario actual
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    
    // Crear objeto asiento
    const asiento = {
        id: asientoEditando ? asientoEditando.id : `ASI-${Date.now()}`,
        numero: asientoEditando ? asientoEditando.numero : generarNumeroAsiento(),
        tipo: 'manual',
        fecha: fecha,
        descripcion: descripcion,
        documentoRef: null,
        estado: estado,
        movimientos: movimientosData,
        totalDebitos: totalDebitos,
        totalCreditos: totalCreditos,
        diferencia: diferencia,
        creadoPor: usuarioActual.email,
        fechaCreacion: asientoEditando ? asientoEditando.fechaCreacion : new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        anulado: false,
        motivoAnulacion: null
    };
    
    // Guardar en localStorage
    const claveAsientos = `asientos_${usuarioActual.email}`;
    let asientos = JSON.parse(localStorage.getItem(claveAsientos)) || [];
    
    if (asientoEditando) {
        // Actualizar asiento existente
        const index = asientos.findIndex(a => a.id === asientoEditando.id);
        if (index !== -1) {
            asientos[index] = asiento;
        }
    } else {
        // Agregar nuevo asiento
        asientos.push(asiento);
    }
    
    localStorage.setItem(claveAsientos, JSON.stringify(asientos));
    
    console.log('✅ Asiento guardado:', asiento);
    
    // Cerrar modal y actualizar tabla
    cerrarModalAsiento();
    cargarAsientos();
    actualizarEstadisticas();
    
    // Mostrar notificación
    mostrarNotificacion(
        estado === 'borrador' 
            ? 'Asiento guardado como borrador' 
            : 'Asiento registrado exitosamente'
    );
}

// ========== GENERAR NÚMERO DE ASIENTO ==========
function generarNumeroAsiento() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveAsientos = `asientos_${usuarioActual.email}`;
    const asientos = JSON.parse(localStorage.getItem(claveAsientos)) || [];
    
    const numero = asientos.length + 1;
    return `ASI-${numero.toString().padStart(5, '0')}`;
}

// ========== CARGAR ASIENTOS ==========
function cargarAsientos() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveAsientos = `asientos_${usuarioActual.email}`;
    const asientos = JSON.parse(localStorage.getItem(claveAsientos)) || [];
    
    const tbody = document.getElementById('asientosTableBody');
    const table = document.getElementById('asientosTable');
    const emptyState = document.getElementById('emptyState');
    
    if (asientos.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    tbody.innerHTML = '';
    
    // Ordenar por fecha descendente
    asientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    asientos.forEach(asiento => {
        const row = `
            <tr>
                <td><span class="asiento-numero">${asiento.numero}</span></td>
                <td>${formatearFecha(asiento.fecha)}</td>
                <td><span class="badge-tipo-asiento ${asiento.tipo}">${obtenerNombreTipo(asiento.tipo)}</span></td>
                <td>${asiento.descripcion}</td>
                <td class="texto-derecha">$${formatearNumero(asiento.totalDebitos)}</td>
                <td class="texto-derecha">$${formatearNumero(asiento.totalCreditos)}</td>
                <td><span class="badge-estado ${asiento.estado}">${asiento.estado === 'registrado' ? 'Registrado' : 'Borrador'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick='verAsiento(${JSON.stringify(asiento)})' title="Ver detalles">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${asiento.estado === 'borrador' ? `
                        <button class="action-btn edit" onclick='editarAsiento(${JSON.stringify(asiento)})' title="Editar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick='eliminarAsiento("${asiento.id}")' title="Eliminar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
}

function obtenerNombreTipo(tipo) {
    const nombres = {
        'manual': 'Manual',
        'factura_venta': 'Factura Venta',
        'compra': 'Compra',
        'pago': 'Pago',
        'cobro': 'Cobro'
    };
    return nombres[tipo] || tipo;
}

// ========== VER ASIENTO ==========
function verAsiento(asiento) {
    let detalles = `
ASIENTO CONTABLE
════════════════════════════════════════

Número: ${asiento.numero}
Fecha: ${formatearFecha(asiento.fecha)}
Tipo: ${obtenerNombreTipo(asiento.tipo)}
Estado: ${asiento.estado === 'registrado' ? 'Registrado' : 'Borrador'}

Descripción: ${asiento.descripcion}

MOVIMIENTOS:
────────────────────────────────────────
`;
    
    asiento.movimientos.forEach((mov, index) => {
        detalles += `\n${index + 1}. ${mov.cuenta} - ${mov.nombreCuenta}`;
        if (mov.tercero) detalles += `\n   Tercero: ${mov.tercero}`;
        detalles += `\n   Débito: $${formatearNumero(mov.debito)}`;
        detalles += `\n   Crédito: $${formatearNumero(mov.credito)}\n`;
    });
    
    detalles += `
────────────────────────────────────────
TOTALES:
Débitos: $${formatearNumero(asiento.totalDebitos)}
Créditos: $${formatearNumero(asiento.totalCreditos)}
Diferencia: $${formatearNumero(asiento.diferencia)}

Creado: ${new Date(asiento.fechaCreacion).toLocaleString('es-CO')}
Por: ${asiento.creadoPor}
    `;
    
    alert(detalles);
}

// ========== EDITAR ASIENTO ==========
function editarAsiento(asiento) {
    abrirModalAsiento(asiento);
}

function cargarDatosAsiento(asiento) {
    document.getElementById('fechaAsiento').value = asiento.fecha;
    document.getElementById('descripcionAsiento').value = asiento.descripcion;
    
    // Agregar movimientos
    asiento.movimientos.forEach((mov, index) => {
        agregarLineaMovimiento();
        
        const linea = document.querySelectorAll('.movimiento-linea')[index];
        linea.querySelector('.input-cuenta-codigo').value = mov.cuenta;
        linea.querySelector('.input-cuenta-nombre').value = mov.nombreCuenta;
        linea.querySelector('.campo-debito input').value = mov.debito || '';
        linea.querySelector('.campo-credito input').value = mov.credito || '';
        linea.querySelector('.campo-tercero input').value = mov.tercero || '';
    });
    
    actualizarTotales();
}

// ========== ELIMINAR ASIENTO ==========
function eliminarAsiento(asientoId) {
    if (!confirm('¿Está seguro de eliminar este asiento? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveAsientos = `asientos_${usuarioActual.email}`;
    let asientos = JSON.parse(localStorage.getItem(claveAsientos)) || [];
    
    asientos = asientos.filter(a => a.id !== asientoId);
    localStorage.setItem(claveAsientos, JSON.stringify(asientos));
    
    cargarAsientos();
    actualizarEstadisticas();
    mostrarNotificacion('Asiento eliminado');
}

// ========== FILTRAR ASIENTOS ==========
function filtrarAsientos() {
    // TODO: Implementar filtros
    console.log('Filtrar asientos');
}

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function actualizarEstadisticas() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveAsientos = `asientos_${usuarioActual.email}`;
    const asientos = JSON.parse(localStorage.getItem(claveAsientos)) || [];
    
    const total = asientos.length;
    const registrados = asientos.filter(a => a.estado === 'registrado').length;
    const borradores = asientos.filter(a => a.estado === 'borrador').length;
    
    document.getElementById('totalAsientos').textContent = total;
    document.getElementById('asientosRegistrados').textContent = registrados;
    document.getElementById('asientosBorradores').textContent = borradores;
}

// ========== UTILIDADES ==========
function formatearNumero(numero) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero);
}

function formatearFecha(fecha) {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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

function mostrarNotificacion(mensaje) {
    const notif = document.createElement('div');
    notif.className = 'notificacion-exito';
    notif.textContent = mensaje;
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2d7a4b;
        color: white;
        padding: 16px 24px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

console.log('✅ Asientos Contables - Módulo cargado correctamente');