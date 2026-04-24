// Operaciones - Sparkles

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
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

// ========== CAMBIAR TAB ==========
function cambiarTab(tabName) {
    // Remover active de todos los botones
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Remover active de todos los contenidos
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Activar el botón clickeado
    event.target.closest('.tab-btn').classList.add('active');
    
    // Activar el contenido correspondiente
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Si es el tab de contabilidad, inicializar los asientos
    if (tabName === 'contabilidad') {
        // Esperar un tick para asegurar que el DOM está actualizado
        setTimeout(() => {
            if (typeof iniciarAsientos === 'function') {
                iniciarAsientos();
            }
        }, 100);
    }
    
    console.log('Tab cambiado a:', tabName);
}

console.log('Operaciones - Módulo cargado correctamente ✨');