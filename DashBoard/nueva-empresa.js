// Funcionalidad de Nueva Empresa - Sparkles (CON REPRESENTANTE LEGAL)

let currentSection = 1;
let departamentosCiudades = {};
let tipoEntidadActual = 'juridica'; // Por defecto

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    cargarDepartamentosCiudades();
    setupLogout();
    // NO ejecutar crearEmpresaInicial - ya no es necesario
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

// ========== NUEVO: CAMBIAR TIPO DE ENTIDAD ==========
function cambiarTipoEntidad() {
    const tipoEntidad = document.querySelector('input[name="tipoEntidad"]:checked').value;
    tipoEntidadActual = tipoEntidad;
    
    const camposJuridica = document.getElementById('camposJuridica');
    const camposNatural = document.getElementById('camposNatural');
    const step2LabelTop = document.getElementById('step2Label');
    const section2Title = document.getElementById('section2Title');
    const camposRepresentante = document.getElementById('camposRepresentante');
    const mensajePersonaNatural = document.getElementById('mensajePersonaNatural');
    
    // Actualizar también el marker del paso 2
    const marker2 = document.getElementById('marker2');
    
    console.log('Cambiando a tipo de entidad:', tipoEntidad);
    
    if (tipoEntidad === 'juridica') {
        // Mostrar campos de empresa
        camposJuridica.style.display = 'grid';
        camposNatural.style.display = 'none';
        
        // En paso 2: Mostrar campos de representante legal
        camposRepresentante.style.display = 'grid';
        mensajePersonaNatural.style.display = 'none';
        
        // Cambiar etiqueta del paso 2 a "Representante Legal"
        step2LabelTop.textContent = 'Representante';
        section2Title.textContent = 'Datos del Representante Legal';
        if (marker2) {
            marker2.setAttribute('title', 'Representante Legal');
        }
        
        // Hacer campos de persona jurídica requeridos
        document.getElementById('razonSocial').required = true;
        document.getElementById('nit').required = true;
        document.getElementById('dv').required = true;
        document.getElementById('telefonoJuridica').required = true;
        document.getElementById('emailJuridica').required = true;
        
        // Quitar requerimiento de campos de persona natural
        document.getElementById('nombresNatural').required = false;
        document.getElementById('apellidosNatural').required = false;
        document.getElementById('tipoDocumentoNatural').required = false;
        document.getElementById('numeroDocumentoNatural').required = false;
        document.getElementById('telefonoNatural').required = false;
        document.getElementById('emailNatural').required = false;
        
    } else {
        // Mostrar campos de persona natural
        camposJuridica.style.display = 'none';
        camposNatural.style.display = 'grid';
        
        // En paso 2: Mostrar mensaje en lugar de campos
        camposRepresentante.style.display = 'none';
        mensajePersonaNatural.style.display = 'block';
        
        // Cambiar etiqueta del paso 2 a "Confirmación"
        step2LabelTop.textContent = 'Confirmación';
        section2Title.textContent = 'Confirmación de Datos';
        if (marker2) {
            marker2.setAttribute('title', 'Confirmación de Datos');
        }
        
        // Quitar requerimiento de campos de persona jurídica
        document.getElementById('razonSocial').required = false;
        document.getElementById('nit').required = false;
        document.getElementById('dv').required = false;
        document.getElementById('telefonoJuridica').required = false;
        document.getElementById('emailJuridica').required = false;
        
        // Hacer campos de persona natural requeridos
        document.getElementById('nombresNatural').required = true;
        document.getElementById('apellidosNatural').required = true;
        document.getElementById('tipoDocumentoNatural').required = true;
        document.getElementById('numeroDocumentoNatural').required = true;
        document.getElementById('telefonoNatural').required = true;
        document.getElementById('emailNatural').required = true;
    }
    
    // Actualizar el progress bar si estamos en el paso 2
    if (currentSection === 2) {
        actualizarProgressBar();
    }
}

// ========== CARGAR DEPARTAMENTOS Y CIUDADES ==========
async function cargarDepartamentosCiudades() {
    const depSelect = document.getElementById('departamento');
    const citySelect = document.getElementById('ciudad');

    try {
        const response = await fetch('../colombia.json');
        departamentosCiudades = await response.json();

        for (let dep in departamentosCiudades) {
            const option = document.createElement('option');
            option.value = dep;
            option.textContent = dep;
            depSelect.appendChild(option);
        }

        depSelect.addEventListener('change', () => {
            citySelect.innerHTML = '<option value="">Seleccione ciudad</option>';
            if (depSelect.value !== '') {
                citySelect.disabled = false;
                departamentosCiudades[depSelect.value].forEach(ciudad => {
                    const option = document.createElement('option');
                    option.value = ciudad;
                    option.textContent = ciudad;
                    citySelect.appendChild(option);
                });
            } else {
                citySelect.disabled = true;
            }
        });

    } catch (error) {
        console.error('Error cargando departamentos y ciudades:', error);
        mostrarError('Error al cargar ubicaciones. Verifique que el archivo colombia.json existe.');
    }
}

// ========== NAVEGACIÓN ENTRE SECCIONES ==========
function nextSection(section) {
    if (!validarSeccion(currentSection)) {
        return;
    }

    // Ocultar sección actual
    document.getElementById(`section${currentSection}`).classList.remove('active');

    // Mostrar nueva sección
    currentSection = section;
    document.getElementById(`section${currentSection}`).classList.add('active');

    // Actualizar progress bar
    actualizarProgressBar();

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevSection(section) {
    // Ocultar sección actual
    document.getElementById(`section${currentSection}`).classList.remove('active');

    // Mostrar sección anterior
    currentSection = section;
    document.getElementById(`section${currentSection}`).classList.add('active');

    // Actualizar progress bar
    actualizarProgressBar();

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== ACTUALIZAR PROGRESS BAR ==========
function actualizarProgressBar() {
    // Actualizar el texto del paso actual
    document.getElementById('currentStep').textContent = currentSection;
    
    // Actualizar la etiqueta del paso actual
    const labels = {
        1: 'Información Básica',
        2: tipoEntidadActual === 'juridica' ? 'Representante Legal' : 'Confirmación de Datos',
        3: 'Ubicación',
        4: 'Configuración Tributaria'
    };
    document.getElementById('currentStepLabel').textContent = labels[currentSection];
    
    // Actualizar el ancho de la barra de progreso
    const progressFill = document.getElementById('progressFill');
    const percentage = (currentSection / 4) * 100;
    progressFill.style.width = percentage + '%';
    
    // Actualizar markers
    const markers = document.querySelectorAll('.marker');
    const stepLabels = document.querySelectorAll('.step-label');
    
    markers.forEach((marker, index) => {
        const step = index + 1;
        marker.classList.remove('active', 'completed');
        if (stepLabels[index]) {
            stepLabels[index].classList.remove('active', 'completed');
        }
        
        if (step < currentSection) {
            marker.classList.add('completed');
            if (stepLabels[index]) {
                stepLabels[index].classList.add('completed');
            }
        } else if (step === currentSection) {
            marker.classList.add('active');
            if (stepLabels[index]) {
                stepLabels[index].classList.add('active');
            }
        }
    });
}

// ========== VALIDACIÓN POR SECCIÓN ==========
function validarSeccion(section) {
    switch(section) {
        case 1:
            return validarSeccion1();
        case 2:
            return validarSeccion2();
        case 3:
            return validarSeccion3();
        default:
            return true;
    }
}

function validarSeccion1() {
    const tipoEntidad = document.querySelector('input[name="tipoEntidad"]:checked').value;
    
    if (tipoEntidad === 'juridica') {
        const razonSocial = document.getElementById('razonSocial').value.trim();
        const nit = document.getElementById('nit').value.trim();
        const dv = document.getElementById('dv').value.trim();
        const telefono = document.getElementById('telefonoJuridica').value.trim();
        const email = document.getElementById('emailJuridica').value.trim();
        
        if (!razonSocial) {
            mostrarError('Por favor ingrese la razón social');
            return false;
        }
        if (!nit) {
            mostrarError('Por favor ingrese el NIT');
            return false;
        }
        if (!dv || dv.length !== 1) {
            mostrarError('Por favor ingrese el dígito de verificación (1 carácter)');
            return false;
        }
        if (!telefono) {
            mostrarError('Por favor ingrese el teléfono de la empresa');
            return false;
        }
        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            mostrarError('Por favor ingrese un correo electrónico válido');
            return false;
        }
    } else {
        const nombres = document.getElementById('nombresNatural').value.trim();
        const apellidos = document.getElementById('apellidosNatural').value.trim();
        const tipoDoc = document.getElementById('tipoDocumentoNatural').value;
        const numeroDoc = document.getElementById('numeroDocumentoNatural').value.trim();
        const telefono = document.getElementById('telefonoNatural').value.trim();
        const email = document.getElementById('emailNatural').value.trim();
        
        if (!nombres) {
            mostrarError('Por favor ingrese los nombres');
            return false;
        }
        if (!apellidos) {
            mostrarError('Por favor ingrese los apellidos');
            return false;
        }
        if (!tipoDoc) {
            mostrarError('Por favor seleccione el tipo de documento');
            return false;
        }
        if (!numeroDoc) {
            mostrarError('Por favor ingrese el número de documento');
            return false;
        }
        if (!telefono) {
            mostrarError('Por favor ingrese el teléfono');
            return false;
        }
        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            mostrarError('Por favor ingrese un correo electrónico válido');
            return false;
        }
    }
    
    return true;
}

function validarSeccion2() {
    // Si es persona natural, no hay nada que validar (solo pasa automáticamente)
    if (tipoEntidadActual === 'natural') {
        console.log('Persona natural: paso 2 omitido automáticamente');
        return true;
    }
    
    // Solo validar si es persona jurídica (representante legal)
    const nombres = document.getElementById('nombresRepresentante').value.trim();
    const apellidos = document.getElementById('apellidosRepresentante').value.trim();
    const tipoDoc = document.getElementById('tipoDocumentoRepresentante').value;
    const numeroDoc = document.getElementById('numeroDocumentoRepresentante').value.trim();
    
    if (!nombres) {
        mostrarError('Por favor ingrese los nombres del representante legal');
        return false;
    }
    if (!apellidos) {
        mostrarError('Por favor ingrese los apellidos del representante legal');
        return false;
    }
    if (!tipoDoc) {
        mostrarError('Por favor seleccione el tipo de documento del representante legal');
        return false;
    }
    if (!numeroDoc) {
        mostrarError('Por favor ingrese el número de documento del representante legal');
        return false;
    }
    
    return true;
}

function validarSeccion3() {
    const pais = document.getElementById('pais').value;
    const departamento = document.getElementById('departamento').value;
    const ciudad = document.getElementById('ciudad').value;
    const direccion = document.getElementById('direccion').value.trim();
    
    if (!pais) {
        mostrarError('Por favor seleccione el país');
        return false;
    }
    if (!departamento) {
        mostrarError('Por favor seleccione el departamento');
        return false;
    }
    if (!ciudad) {
        mostrarError('Por favor seleccione la ciudad');
        return false;
    }
    if (!direccion) {
        mostrarError('Por favor ingrese la dirección');
        return false;
    }
    
    return true;
}

// ========== TOGGLE IVA OPTIONS ==========
function toggleIvaOptions(show) {
    const ivaOptions = document.getElementById('ivaOptions');
    ivaOptions.style.display = show ? 'block' : 'none';
}

// ========== GUARDAR EMPRESA ==========
function guardarEmpresa() {
    console.log('🚀 Iniciando guardado de empresa...');
    
    // Validar todas las secciones
    if (!validarSeccion(1) || !validarSeccion(2) || !validarSeccion(3)) {
        console.error('❌ Validación fallida');
        return;
    }
    
    // Validar sección 4 (tributaria)
    const tarifaIvaRetenido = document.getElementById('tarifaIvaRetenido').value;
    const aplicaIva = document.querySelector('input[name="aplicaIva"]:checked');
    
    if (!tarifaIvaRetenido) {
        mostrarError('Por favor seleccione la tarifa de IVA retenido');
        return;
    }
    if (!aplicaIva) {
        mostrarError('Por favor indique si la empresa está sujeta a IVA');
        return;
    }
    
    console.log('✅ Validaciones completadas');
    
    // Obtener características tributarias seleccionadas
    const caracteristicasIva = [];
    document.querySelectorAll('input[name="caracteristicasIva"]:checked').forEach(checkbox => {
        caracteristicasIva.push(checkbox.value);
    });
    
    // Obtener usuario actual
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    
    // Construir objeto empresa según tipo
    const tipoEntidad = document.querySelector('input[name="tipoEntidad"]:checked').value;
    let empresa = {
        id: Date.now().toString(),
        usuarioId: usuarioActual.email,
        tipoEntidad: tipoEntidad,
        fechaCreacion: new Date().toISOString(),
        estado: 'Activo'
    };
    
    if (tipoEntidad === 'juridica') {
        // Datos de Persona Jurídica
        empresa.razonSocial = document.getElementById('razonSocial').value.trim();
        empresa.nit = document.getElementById('nit').value.trim();
        empresa.dv = document.getElementById('dv').value.trim();
        empresa.telefono = document.getElementById('telefonoJuridica').value.trim();
        empresa.email = document.getElementById('emailJuridica').value.trim();
        
        // Datos del Representante Legal
        empresa.representanteLegal = {
            nombres: document.getElementById('nombresRepresentante').value.trim(),
            apellidos: document.getElementById('apellidosRepresentante').value.trim(),
            tipoDocumento: document.getElementById('tipoDocumentoRepresentante').value,
            numeroDocumento: document.getElementById('numeroDocumentoRepresentante').value.trim(),
            telefono: document.getElementById('telefonoRepresentante').value.trim() || '',
            email: document.getElementById('emailRepresentante').value.trim() || ''
        };
        
    } else {
        // Datos de Persona Natural
        empresa.nombres = document.getElementById('nombresNatural').value.trim();
        empresa.apellidos = document.getElementById('apellidosNatural').value.trim();
        empresa.nombreCompleto = `${empresa.nombres} ${empresa.apellidos}`;
        empresa.tipoDocumento = document.getElementById('tipoDocumentoNatural').value;
        empresa.numeroDocumento = document.getElementById('numeroDocumentoNatural').value.trim();
        empresa.telefono = document.getElementById('telefonoNatural').value.trim();
        empresa.email = document.getElementById('emailNatural').value.trim();
    }
    
    // Datos de ubicación (comunes)
    empresa.pais = document.getElementById('pais').value;
    empresa.departamento = document.getElementById('departamento').value;
    empresa.ciudad = document.getElementById('ciudad').value;
    empresa.direccion = document.getElementById('direccion').value.trim();
    empresa.codigoPostal = document.getElementById('codigoPostal').value.trim() || '';
    
    // Datos tributarios (comunes)
    empresa.tarifaIvaRetenido = tarifaIvaRetenido;
    empresa.aplicaIva = aplicaIva.value === 'Si';
    empresa.caracteristicasTributarias = caracteristicasIva;
    
    console.log('📄 Empresa creada:', empresa);
    
    // Guardar en localStorage
    let empresas = JSON.parse(localStorage.getItem('empresas')) || [];
    empresas.push(empresa);
    localStorage.setItem('empresas', JSON.stringify(empresas));
    
    console.log('✅ Empresa guardada en localStorage');
    console.log(`📊 Total de empresas: ${empresas.length}`);
    
    // Mostrar mensaje de éxito
    mostrarExito('✅ Empresa guardada exitosamente');
    
    // Redirigir después de 2 segundos
    setTimeout(() => {
        window.location.href = 'empresas.html';
    }, 2000);
}

// ========== MENSAJES ==========
function mostrarError(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
    
    // Scroll al mensaje
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function mostrarExito(mensaje) {
    const exitoDiv = document.getElementById('mensajeExito');
    exitoDiv.textContent = mensaje;
    exitoDiv.style.display = 'block';
    
    setTimeout(() => {
        exitoDiv.style.display = 'none';
    }, 5000);
}

console.log('✨ Nueva Empresa - Módulo cargado correctamente');