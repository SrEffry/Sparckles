// Historial de Facturas - Sparkles

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    setupLogout();
    cargarFacturas();
    actualizarEstadisticas();
});

function verificarSesion() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) {
        window.location.href = '../index.html';
        return;
    }
}

function cargarDatosUsuario() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (usuarioActual) {
        const usuario = JSON.parse(usuarioActual);
        document.querySelectorAll('.user-details strong').forEach(el => {
            el.textContent = `${usuario.nombre} ${usuario.apellido}`;
        });
        document.querySelectorAll('.user-details span').forEach(el => {
            el.textContent = usuario.email;
        });
        document.querySelectorAll('.user-info-header strong').forEach(el => {
            el.textContent = `${usuario.nombre} ${usuario.apellido}`;
        });
        const iniciales = usuario.nombre.charAt(0) + usuario.apellido.charAt(0);
        document.querySelectorAll('.user-avatar, .user-avatar-small').forEach(el => {
            el.textContent = iniciales.toUpperCase();
        });
    }
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

function cargarFacturas() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveFacturas = `facturas_${usuarioActual.email}`;
    let facturas = JSON.parse(localStorage.getItem(claveFacturas)) || [];
    
    facturas.sort((a, b) => new Date(b.id) - new Date(a.id));
    
    const tbody = document.getElementById('historialTableBody');
    const table = document.getElementById('historialTable');
    const emptyState = document.getElementById('emptyState');
    
    if (facturas.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    tbody.innerHTML = '';
    
    facturas.forEach(factura => {
        const numeroCompleto = `${factura.prefijo}-${String(factura.numero).padStart(5, '0')}`;
        const row = `
            <tr>
                <td><span class="factura-numero">${numeroCompleto}</span></td>
                <td>${factura.fecha}</td>
                <td>${factura.cliente.nombre}</td>
                <td>$${formatearNumero(factura.subtotal)}</td>
                <td>$${formatearNumero(factura.iva)}</td>
                <td><strong>$${formatearNumero(factura.total)}</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick='verFactura(${JSON.stringify(factura)})' title="Ver factura">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick='eliminarFactura("${factura.id}")' title="Eliminar">
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

function verFactura(factura) {
    let detalle = `FACTURA ${factura.prefijo}-${String(factura.numero).padStart(5, '0')}\n\n`;
    detalle += `Fecha: ${factura.fecha}\n`;
    detalle += `Cliente: ${factura.cliente.nombre}\n`;
    detalle += `${factura.cliente.tipoDocumento}: ${factura.cliente.numeroDocumento}\n\n`;
    detalle += `PRODUCTOS:\n`;
    factura.items.forEach((item, i) => {
        detalle += `${i+1}. ${item.descripcion}\n`;
        detalle += `   Cant: ${item.cantidad} × $${formatearNumero(item.precioUnitario)} = $${formatearNumero(item.subtotal)}\n`;
        detalle += `   IVA (${item.iva}%): $${formatearNumero(item.ivaValor)}\n`;
    });
    detalle += `\nSubtotal: $${formatearNumero(factura.subtotal)}\n`;
    detalle += `IVA Total: $${formatearNumero(factura.iva)}\n`;
    detalle += `TOTAL: $${formatearNumero(factura.total)}`;
    alert(detalle);
}

function eliminarFactura(facturaId) {
    if (!confirm('¿Está seguro de que desea eliminar esta factura?\nEsta acción no se puede deshacer.')) {
        return;
    }
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveFacturas = `facturas_${usuarioActual.email}`;
    let facturas = JSON.parse(localStorage.getItem(claveFacturas)) || [];
    facturas = facturas.filter(f => f.id !== facturaId);
    localStorage.setItem(claveFacturas, JSON.stringify(facturas));
    cargarFacturas();
    actualizarEstadisticas();
}

function filtrarFacturas() {
    const searchTerm = document.getElementById('searchFactura').value.toLowerCase();
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveFacturas = `facturas_${usuarioActual.email}`;
    let facturas = JSON.parse(localStorage.getItem(claveFacturas)) || [];
    
    if (searchTerm) {
        facturas = facturas.filter(f => {
            const numeroCompleto = `${f.prefijo}-${String(f.numero).padStart(5, '0')}`;
            const cliente = f.cliente.nombre.toLowerCase();
            return numeroCompleto.toLowerCase().includes(searchTerm) || cliente.includes(searchTerm);
        });
    }
    
    const tbody = document.getElementById('historialTableBody');
    const table = document.getElementById('historialTable');
    const emptyState = document.getElementById('emptyState');
    
    if (facturas.length === 0) {
        table.style.display = 'none';
        emptyState.querySelector('h3').textContent = 'No se encontraron facturas';
        emptyState.querySelector('p').textContent = 'Intenta con otros criterios de búsqueda';
        emptyState.querySelector('button').style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    tbody.innerHTML = '';
    
    facturas.forEach(factura => {
        const numeroCompleto = `${factura.prefijo}-${String(factura.numero).padStart(5, '0')}`;
        const row = `
            <tr>
                <td><span class="factura-numero">${numeroCompleto}</span></td>
                <td>${factura.fecha}</td>
                <td>${factura.cliente.nombre}</td>
                <td>$${formatearNumero(factura.subtotal)}</td>
                <td>$${formatearNumero(factura.iva)}</td>
                <td><strong>$${formatearNumero(factura.total)}</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick='verFactura(${JSON.stringify(factura)})' title="Ver factura">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick='eliminarFactura("${factura.id}")' title="Eliminar">
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

function actualizarEstadisticas() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const claveFacturas = `facturas_${usuarioActual.email}`;
    const facturas = JSON.parse(localStorage.getItem(claveFacturas)) || [];
    
    const totalFacturas = facturas.length;
    const totalVendido = facturas.reduce((sum, f) => sum + f.total, 0);
    
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    const facturasMes = facturas.filter(f => {
        const fecha = new Date(f.id);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
    });
    
    document.getElementById('totalFacturas').textContent = totalFacturas;
    document.getElementById('totalVendido').textContent = `$${formatearNumero(totalVendido)}`;
    document.getElementById('totalMes').textContent = facturasMes.length;
}

function formatearNumero(numero) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero);
}

console.log('Historial de Facturas - Módulo cargado correctamente ✨');