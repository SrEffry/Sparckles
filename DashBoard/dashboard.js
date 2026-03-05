// Funcionalidad del Dashboard de Sparkles

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    initializeDashboard();
});

// ========== VERIFICAR SESIÓN ==========
function verificarSesion() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) {
        // Si no hay sesión, redirigir al login
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
            el.textContent = usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`;
        });
        
        const userEmailElements = document.querySelectorAll('.user-details span');
        userEmailElements.forEach(el => {
            el.textContent = usuario.email;
        });
        
        // Actualizar nombre en el header
        const headerNameElements = document.querySelectorAll('.user-info-header strong');
        headerNameElements.forEach(el => {
            el.textContent = usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`;
        });
        
        // Actualizar iniciales en avatares
        const iniciales = obtenerIniciales(usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`);
        const avatarElements = document.querySelectorAll('.user-avatar, .user-avatar-small');
        avatarElements.forEach(el => {
            el.textContent = iniciales;
        });
        
        // Actualizar mensaje de bienvenida
        const welcomeTitle = document.querySelector('.welcome-content h1');
        if (welcomeTitle) {
            updateWelcomeMessage(usuario.nombre);
        }
    }
}

// ========== OBTENER INICIALES ==========
function obtenerIniciales(nombreCompleto) {
    const partes = nombreCompleto.trim().split(' ');
    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

function initializeDashboard() {
    setupNavigation();
    setupMobileMenu();
    setupNotifications();
    setupQuickActions();
    animateStats();
}

// ========== NAVEGACIÓN ==========
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        // Solo prevenir default para items sin href o con #
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Si tiene href válido (no # ni vacío), dejar que navegue normalmente
            if (href && href !== '#' && href !== '') {
                // Permitir navegación normal
                return;
            }
            
            // Solo prevenir para elementos sin destino
            e.preventDefault();
            
            // Remover active de todos
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Agregar active al clickeado
            this.classList.add('active');
            
            console.log('Navegando a:', this.textContent.trim());
        });
    });
}

// ========== MENÚ MÓVIL ==========
function setupMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Crear botón de menú móvil si no existe
    if (window.innerWidth <= 768) {
        createMobileMenuButton();
    }
    
    // Listener para resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            createMobileMenuButton();
        } else {
            removeMobileMenuButton();
        }
    });
    
    // Cerrar sidebar al hacer click fuera
    mainContent.addEventListener('click', function() {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
}

function createMobileMenuButton() {
    if (document.querySelector('.mobile-menu-btn')) return;
    
    const header = document.querySelector('.header');
    const menuBtn = document.createElement('button');
    menuBtn.className = 'mobile-menu-btn';
    menuBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    `;
    
    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelector('.sidebar').classList.toggle('open');
    });
    
    header.insertBefore(menuBtn, header.firstChild);
}

function removeMobileMenuButton() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (menuBtn) {
        menuBtn.remove();
    }
}

// ========== NOTIFICACIONES ==========
function setupNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    
    notificationBtn.addEventListener('click', function() {
        showNotificationPanel();
    });
}

function showNotificationPanel() {
    // Aquí puedes implementar un panel de notificaciones
    alert('Panel de notificaciones - 3 notificaciones nuevas');
}

// ========== ACCIONES RÁPIDAS ==========
function setupQuickActions() {
    const quickButtons = document.querySelectorAll('.quick-btn');
    
    quickButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent.trim();
            console.log('Acción rápida:', action);
            
            // Animación de click
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
            
            // Aquí puedes redirigir o abrir modales según la acción
            handleQuickAction(action);
        });
    });
}

function handleQuickAction(action) {
    switch(action) {
        case 'Nueva Factura':
            console.log('Abrir formulario de nueva factura');
            // window.location.href = 'nueva-factura.html';
            break;
        case 'Registrar Compra':
            console.log('Abrir formulario de compra');
            break;
        case 'Registrar Pago':
            console.log('Abrir formulario de pago');
            break;
    }
}

// ========== ANIMACIÓN DE ESTADÍSTICAS ==========
function animateStats() {
    const statValues = document.querySelectorAll('.stat-value');
    
    statValues.forEach(stat => {
        const finalValue = stat.textContent;
        const numericValue = parseFloat(finalValue.replace(/[^0-9.]/g, ''));
        const prefix = finalValue.includes('$') ? '$' : '';
        const suffix = finalValue.includes('M') ? 'M' : '';
        
        animateValue(stat, 0, numericValue, 1000, prefix, suffix);
    });
}

function animateValue(element, start, end, duration, prefix = '', suffix = '') {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = prefix + current.toFixed(1) + suffix;
    }, 16);
}

// ========== ALERTAS ==========
document.querySelectorAll('.alert-action').forEach(btn => {
    btn.addEventListener('click', function() {
        const alertItem = this.closest('.alert-item');
        const alertTitle = alertItem.querySelector('h3').textContent;
        
        console.log('Ver detalles de:', alertTitle);
        // Aquí puedes abrir un modal con más detalles
        showAlertDetails(alertTitle);
    });
});

function showAlertDetails(title) {
    alert(`Detalles de: ${title}\n\nAquí se mostraría información detallada sobre esta alerta.`);
}

// ========== BOTÓN SALIR ==========
const logoutBtn = document.querySelector('.footer-btn:last-child');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            // Limpiar sesión
            sessionStorage.removeItem('usuarioActual');
            console.log('Cerrando sesión...');
            // Redirigir al login
            window.location.href = '../index.html';
        }
    });
}

// ========== MENÚ DE USUARIO ==========
const userMenu = document.querySelector('.user-menu');
if (userMenu) {
    userMenu.addEventListener('click', function() {
        console.log('Menú de usuario clickeado');
        // Aquí puedes mostrar un dropdown con opciones
    });
}

// ========== ACTUALIZACIÓN DE HORA ==========
function updateWelcomeMessage(nombre) {
    const hour = new Date().getHours();
    const welcomeText = document.querySelector('.welcome-content h1');
    
    let greeting = `¡Bienvenido de nuevo, ${nombre}!`;
    
    if (hour < 12) {
        greeting = `¡Buenos días, ${nombre}!`;
    } else if (hour < 18) {
        greeting = `¡Buenas tardes, ${nombre}!`;
    } else {
        greeting = `¡Buenas noches, ${nombre}!`;
    }
    
    if (welcomeText) {
        welcomeText.textContent = greeting + ' 👋';
    }
}

// ========== EFECTOS HOVER PARA TARJETAS ==========
const statCards = document.querySelectorAll('.stat-card');
statCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s ease';
    });
});

// ========== REFRESH DE DATOS (simulado) ==========
function refreshDashboardData() {
    console.log('Actualizando datos del dashboard...');
    
    // Aquí puedes hacer llamadas a tu API
    // fetch('/api/dashboard-stats')
    //     .then(response => response.json())
    //     .then(data => updateDashboard(data));
    
    // Simulación de actualización
    const badge = document.querySelector('.badge');
    if (badge) {
        const currentValue = parseInt(badge.textContent);
        badge.textContent = currentValue + 1;
    }
}

// Actualizar cada 5 minutos (opcional)
// setInterval(refreshDashboardData, 300000);

// ========== BÚSQUEDA ==========
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.trim();
            if (searchTerm.length > 2) {
                console.log('Buscando:', searchTerm);
                performSearch(searchTerm);
            }
        }, 500);
    });
}

function performSearch(term) {
    // Aquí implementarías la lógica de búsqueda
    console.log('Realizando búsqueda para:', term);
}

// ========== INICIALIZACIÓN DE TOOLTIPS (opcional) ==========
function initTooltips() {
    const elementsWithTooltip = document.querySelectorAll('[title]');
    
    elementsWithTooltip.forEach(element => {
        element.addEventListener('mouseenter', function() {
            // Lógica para mostrar tooltip personalizado
        });
    });
}

// Llamar funciones de inicialización adicionales
initTooltips();

console.log('Dashboard de Sparkles inicializado correctamente ✨');