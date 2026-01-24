// Configuración de Facturación - Sparkles

let logoBase64 = null;

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    cargarConfiguracionGuardada();
    setupLogout();
    setupPreviewListeners();
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

// ========== CARGAR LOGO ==========
function cargarLogo(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.match('image.*')) {
        mostrarError('Por favor seleccione un archivo de imagen válido');
        return;
    }
    
    // Validar tamaño (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
        mostrarError('El archivo debe ser menor a 2MB');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        logoBase64 = e.target.result;
        
        // Mostrar preview
        const logoPreview = document.getElementById('logoPreview');
        logoPreview.innerHTML = `<img src="${logoBase64}" alt="Logo">`;
        logoPreview.classList.add('has-logo');
        
        // Mostrar botón de remover
        document.getElementById('btnRemoveLogo').style.display = 'inline-flex';
        
        // Actualizar preview de factura
        const previewLogo = document.getElementById('previewLogo');
        previewLogo.innerHTML = `<img src="${logoBase64}" alt="Logo">`;
        
        mostrarExito('Logo cargado exitosamente');
    };
    
    reader.onerror = function() {
        mostrarError('Error al cargar el logo');
    };
    
    reader.readAsDataURL(file);
}

// ========== REMOVER LOGO ==========
function removerLogo() {
    if (!confirm('¿Está seguro de remover el logo?')) return;
    
    logoBase64 = null;
    
    // Resetear preview
    const logoPreview = document.getElementById('logoPreview');
    logoPreview.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p>Sin logo</p>
    `;
    logoPreview.classList.remove('has-logo');
    
    // Ocultar botón de remover
    document.getElementById('btnRemoveLogo').style.display = 'none';
    
    // Limpiar input
    document.getElementById('logoInput').value = '';
    
    // Actualizar preview de factura
    const previewLogo = document.getElementById('previewLogo');
    previewLogo.innerHTML = '<span>LOGO</span>';
    
    mostrarExito('Logo removido');
}

// ========== SETUP PREVIEW LISTENERS ==========
function setupPreviewListeners() {
    // Actualizar preview en tiempo real
    document.getElementById('razonSocial').addEventListener('input', function() {
        document.getElementById('previewRazonSocial').textContent = this.value || 'Nombre de la Empresa';
    });
    
    document.getElementById('nit').addEventListener('input', function() {
        document.getElementById('previewNit').textContent = 'NIT: ' + (this.value || '000000000-0');
    });
    
    document.getElementById('direccion').addEventListener('input', function() {
        document.getElementById('previewDireccion').textContent = this.value || 'Dirección';
    });
    
    document.getElementById('telefono').addEventListener('input', function() {
        const email = document.getElementById('email').value;
        const contacto = `Tel: ${this.value || '000-0000'} | ${email || 'email@empresa.com'}`;
        document.getElementById('previewContacto').textContent = contacto;
    });
    
    document.getElementById('email').addEventListener('input', function() {
        const telefono = document.getElementById('telefono').value;
        const contacto = `Tel: ${telefono || '000-0000'} | ${this.value || 'email@empresa.com'}`;
        document.getElementById('previewContacto').textContent = contacto;
    });
    
    document.getElementById('resolucionNumero').addEventListener('input', function() {
        document.getElementById('previewResolucion').textContent = 
            'Resolución DIAN No. ' + (this.value || '000000');
    });
    
    document.getElementById('prefijo').addEventListener('input', function() {
        document.getElementById('previewPrefijo').textContent = this.value || 'SETT';
    });
    
    document.getElementById('pieFact').addEventListener('input', function() {
        document.getElementById('previewPie').innerHTML = 
            `<p>${this.value || 'Texto pie de factura aparecerá aquí'}</p>`;
    });
}

// ========== GUARDAR CONFIGURACIÓN ==========
function guardarConfiguracion() {
    // Obtener datos del formulario
    const razonSocial = document.getElementById('razonSocial').value.trim();
    const nit = document.getElementById('nit').value.trim();
    const regimen = document.getElementById('regimen').value;
    const direccion = document.getElementById('direccion').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();
    
    const resolucionNumero = document.getElementById('resolucionNumero').value.trim();
    const resolucionFecha = document.getElementById('resolucionFecha').value;
    const prefijo = document.getElementById('prefijo').value.trim();
    const numeracionDesde = document.getElementById('numeracionDesde').value;
    const numeracionHasta = document.getElementById('numeracionHasta').value;
    const resolucionVencimiento = document.getElementById('resolucionVencimiento').value;
    
    const actividadEconomica = document.getElementById('actividadEconomica').value.trim();
    const pieFact = document.getElementById('pieFact').value.trim();
    const observaciones = document.getElementById('observaciones').value.trim();
    
    // Validaciones
    if (!razonSocial || !nit || !regimen || !direccion || !ciudad || !telefono || !email) {
        mostrarError('Por favor complete todos los campos obligatorios');
        return;
    }
    
    if (!resolucionNumero || !resolucionFecha || !numeracionDesde || !numeracionHasta) {
        mostrarError('Por favor complete la información de la resolución DIAN');
        return;
    }
    
    // Validar numeración
    const desde = parseInt(numeracionDesde);
    const hasta = parseInt(numeracionHasta);
    
    if (desde >= hasta) {
        mostrarError('La numeración "Hasta" debe ser mayor que "Desde"');
        return;
    }
    
    // Crear objeto de configuración
    const configuracion = {
        logo: logoBase64,
        razonSocial: razonSocial,
        nit: nit,
        regimen: regimen,
        direccion: direccion,
        ciudad: ciudad,
        telefono: telefono,
        email: email,
        resolucion: {
            numero: resolucionNumero,
            fecha: resolucionFecha,
            prefijo: prefijo,
            numeracionDesde: desde,
            numeracionHasta: hasta,
            numeracionActual: desde,
            vencimiento: resolucionVencimiento
        },
        actividadEconomica: actividadEconomica,
        pieFact: pieFact,
        observaciones: observaciones,
        fechaConfiguracion: new Date().toISOString()
    };
    
    // Obtener usuario actual
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    
    // Guardar en localStorage con clave específica del usuario
    const claveConfig = `config_facturacion_${usuarioActual.email}`;
    localStorage.setItem(claveConfig, JSON.stringify(configuracion));
    
    console.log('Configuración guardada:', configuracion);
    
    // Mostrar mensaje de éxito
    mostrarExito('¡Configuración guardada exitosamente!');
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
        window.location.href = 'operaciones.html';
    }, 2000);
}

// ========== CARGAR CONFIGURACIÓN GUARDADA ==========
function cargarConfiguracionGuardada() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuarioActual) return;
    
    const claveConfig = `config_facturacion_${usuarioActual.email}`;
    const configGuardada = localStorage.getItem(claveConfig);
    
    if (!configGuardada) {
        console.log('No hay configuración previa guardada');
        return;
    }
    
    try {
        const config = JSON.parse(configGuardada);
        
        // Cargar datos básicos
        if (config.razonSocial) document.getElementById('razonSocial').value = config.razonSocial;
        if (config.nit) document.getElementById('nit').value = config.nit;
        if (config.regimen) document.getElementById('regimen').value = config.regimen;
        if (config.direccion) document.getElementById('direccion').value = config.direccion;
        if (config.ciudad) document.getElementById('ciudad').value = config.ciudad;
        if (config.telefono) document.getElementById('telefono').value = config.telefono;
        if (config.email) document.getElementById('email').value = config.email;
        
        // Cargar resolución
        if (config.resolucion) {
            if (config.resolucion.numero) document.getElementById('resolucionNumero').value = config.resolucion.numero;
            if (config.resolucion.fecha) document.getElementById('resolucionFecha').value = config.resolucion.fecha;
            if (config.resolucion.prefijo) document.getElementById('prefijo').value = config.resolucion.prefijo;
            if (config.resolucion.numeracionDesde) document.getElementById('numeracionDesde').value = config.resolucion.numeracionDesde;
            if (config.resolucion.numeracionHasta) document.getElementById('numeracionHasta').value = config.resolucion.numeracionHasta;
            if (config.resolucion.vencimiento) document.getElementById('resolucionVencimiento').value = config.resolucion.vencimiento;
        }
        
        // Cargar información adicional
        if (config.actividadEconomica) document.getElementById('actividadEconomica').value = config.actividadEconomica;
        if (config.pieFact) document.getElementById('pieFact').value = config.pieFact;
        if (config.observaciones) document.getElementById('observaciones').value = config.observaciones;
        
        // Cargar logo
        if (config.logo) {
            logoBase64 = config.logo;
            const logoPreview = document.getElementById('logoPreview');
            logoPreview.innerHTML = `<img src="${config.logo}" alt="Logo">`;
            logoPreview.classList.add('has-logo');
            document.getElementById('btnRemoveLogo').style.display = 'inline-flex';
            
            // Actualizar preview
            const previewLogo = document.getElementById('previewLogo');
            previewLogo.innerHTML = `<img src="${config.logo}" alt="Logo">`;
        }
        
        // Actualizar previews
        document.getElementById('previewRazonSocial').textContent = config.razonSocial || 'Nombre de la Empresa';
        document.getElementById('previewNit').textContent = 'NIT: ' + (config.nit || '000000000-0');
        document.getElementById('previewDireccion').textContent = config.direccion || 'Dirección';
        document.getElementById('previewContacto').textContent = 
            `Tel: ${config.telefono || '000-0000'} | ${config.email || 'email@empresa.com'}`;
        
        if (config.resolucion && config.resolucion.numero) {
            document.getElementById('previewResolucion').textContent = 
                'Resolución DIAN No. ' + config.resolucion.numero;
        }
        
        if (config.resolucion && config.resolucion.prefijo) {
            document.getElementById('previewPrefijo').textContent = config.resolucion.prefijo;
        }
        
        if (config.pieFact) {
            document.getElementById('previewPie').innerHTML = `<p>${config.pieFact}</p>`;
        }
        
        console.log('Configuración cargada exitosamente');
        
    } catch (error) {
        console.error('Error al cargar configuración guardada:', error);
    }
}

// ========== MOSTRAR ERROR ==========
function mostrarError(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    const exitoDiv = document.getElementById('mensajeExito');
    
    if (exitoDiv) exitoDiv.style.display = 'none';
    
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
        
        // Scroll al mensaje
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// ========== MOSTRAR ÉXITO ==========
function mostrarExito(mensaje) {
    const exitoDiv = document.getElementById('mensajeExito');
    const errorDiv = document.getElementById('mensajeError');
    
    if (errorDiv) errorDiv.style.display = 'none';
    
    if (exitoDiv) {
        exitoDiv.textContent = mensaje;
        exitoDiv.style.display = 'block';
        
        // Scroll al mensaje
        exitoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

console.log('Configuración de Facturación - Módulo cargado correctamente ✨');