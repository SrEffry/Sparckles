// Funcionalidad de Nueva Empresa - Sparkles

let currentSection = 1;
let departamentosCiudades = {};

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosUsuario();
    cargarDepartamentosCiudades();
    setupLogout();
    crearEmpresaInicial();
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

// ========== CREAR EMPRESA INICIAL ==========
function crearEmpresaInicial() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) return;

    const usuario = JSON.parse(usuarioActual);
    
    // Solo crear si el usuario tiene datosCompletos === false
    // (esto significa que aún no ha pasado por el modal de completar datos)
    if (usuario.datosCompletos !== false) {
        console.log('Usuario ya tiene datos completos, no crear empresa inicial aquí');
        return;
    }

    const empresas = JSON.parse(localStorage.getItem('empresas')) || [];

    // Verificar si ya existe la empresa inicial del usuario
    const empresaExiste = empresas.some(e => e.esEmpresaInicial && e.usuarioId === usuario.email);

    if (!empresaExiste && usuario.razonSocial) {
        const empresaInicial = {
            id: 'inicial-' + Date.now(),
            esEmpresaInicial: true,
            usuarioId: usuario.email,
            nombre: usuario.razonSocial,
            nit: usuario.nit || '',
            dv: usuario.dv || '',
            razonSocial: usuario.razonSocial,
            pais: usuario.pais || 'Colombia',
            departamento: usuario.departamento || '',
            ciudad: usuario.ciudad || '',
            direccion: usuario.direccion || '',
            telefono: usuario.telefono || '',
            tipoPersona: 'Jurídica',
            estado: 'Activo',
            regimen: 'Común',
            datosCompletos: false,
            fechaCreacion: new Date().toISOString()
        };

        empresas.push(empresaInicial);
        localStorage.setItem('empresas', JSON.stringify(empresas));
        console.log('Empresa inicial creada desde datos de registro');
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
    
    // Marcar paso como completado
    const steps = document.querySelectorAll('.step');
    steps[currentSection - 1].classList.add('completed');
    
    // Mostrar nueva sección
    currentSection = section;
    document.getElementById(`section${section}`).classList.add('active');
    
    // Marcar paso como activo
    steps[currentSection - 1].classList.add('active');
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevSection(section) {
    // Ocultar sección actual
    document.getElementById(`section${currentSection}`).classList.remove('active');
    
    // Quitar active del paso actual
    const steps = document.querySelectorAll('.step');
    steps[currentSection - 1].classList.remove('active');
    
    // Mostrar sección anterior
    currentSection = section;
    document.getElementById(`section${section}`).classList.add('active');
    
    // Marcar paso como activo
    steps[currentSection - 1].classList.add('active');
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== VALIDACIÓN DE SECCIONES ==========
function validarSeccion(section) {
    let valido = true;
    let mensaje = '';

    if (section === 1) {
        const nombre = document.getElementById('nombreEmpresa').value.trim();
        const nit = document.getElementById('nit').value.trim();
        const dv = document.getElementById('dv').value.trim();
        const razonSocial = document.getElementById('razonSocial').value.trim();
        const telefono = document.getElementById('telefono').value.trim();

        if (!nombre) {
            mensaje = 'El nombre de la empresa es obligatorio';
            valido = false;
        } else if (!nit) {
            mensaje = 'El NIT es obligatorio';
            valido = false;
        } else if (!dv) {
            mensaje = 'El DV es obligatorio';
            valido = false;
        } else if (dv.length !== 1 || isNaN(dv)) {
            mensaje = 'El DV debe ser un solo dígito numérico';
            valido = false;
        } else if (!razonSocial) {
            mensaje = 'La razón social es obligatoria';
            valido = false;
        } else if (!telefono) {
            mensaje = 'El teléfono es obligatorio';
            valido = false;
        }
    } else if (section === 2) {
        const pais = document.getElementById('pais').value;
        const departamento = document.getElementById('departamento').value;
        const ciudad = document.getElementById('ciudad').value;
        const direccion = document.getElementById('direccion').value.trim();

        if (!pais) {
            mensaje = 'Debe seleccionar un país';
            valido = false;
        } else if (!departamento) {
            mensaje = 'Debe seleccionar un departamento';
            valido = false;
        } else if (!ciudad) {
            mensaje = 'Debe seleccionar una ciudad';
            valido = false;
        } else if (!direccion) {
            mensaje = 'La dirección es obligatoria';
            valido = false;
        }
    }

    if (!valido) {
        mostrarError(mensaje);
    }

    return valido;
}

// ========== TOGGLE IVA OPTIONS ==========
function toggleIvaOptions(mostrar) {
    const ivaOptions = document.getElementById('ivaOptions');
    if (mostrar) {
        ivaOptions.style.display = 'block';
    } else {
        ivaOptions.style.display = 'none';
        // Desmarcar todos los checkboxes
        const checkboxes = document.querySelectorAll('input[name="caracteristicasIva"]');
        checkboxes.forEach(cb => cb.checked = false);
    }
}

// ========== GUARDAR EMPRESA ==========
function guardarEmpresa() {
    if (!validarSeccion(3)) {
        return;
    }

    // Recopilar datos del formulario
    const tipoPersona = document.querySelector('input[name="tipoPersona"]:checked').value;
    const nombre = document.getElementById('nombreEmpresa').value.trim();
    const nit = document.getElementById('nit').value.trim();
    const dv = document.getElementById('dv').value.trim();
    const razonSocial = document.getElementById('razonSocial').value.trim();
    const matriculaMercantil = document.getElementById('matriculaMercantil').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    
    const pais = document.getElementById('pais').value;
    const departamento = document.getElementById('departamento').value;
    const ciudad = document.getElementById('ciudad').value;
    const direccion = document.getElementById('direccion').value.trim();
    const codigoPostal = document.getElementById('codigoPostal').value.trim();
    
    const tarifaIvaRetenido = document.getElementById('tarifaIvaRetenido').value;
    const aplicaIva = document.querySelector('input[name="aplicaIva"]:checked').value;
    
    // Obtener características de IVA seleccionadas
    const caracteristicasIva = [];
    if (aplicaIva === 'Si') {
        const checkboxes = document.querySelectorAll('input[name="caracteristicasIva"]:checked');
        checkboxes.forEach(cb => caracteristicasIva.push(cb.value));
    }

    // Validar tarifa IVA
    if (!tarifaIvaRetenido) {
        mostrarError('Debe seleccionar una tarifa de IVA retenido');
        return;
    }

    // Determinar régimen basado en características
    let regimen = 'Común';
    if (caracteristicasIva.includes('granContribuyente')) {
        regimen = 'Gran Contribuyente';
    } else if (!aplicaIva || aplicaIva === 'No') {
        regimen = 'Simplificado';
    }

    // Obtener usuario actual
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));

    // Crear objeto empresa
    const nuevaEmpresa = {
        id: Date.now().toString(),
        tipoPersona: tipoPersona,
        nombre: nombre,
        nit: nit,
        dv: dv,
        razonSocial: razonSocial,
        matriculaMercantil: matriculaMercantil,
        telefono: telefono,
        pais: pais,
        departamento: departamento,
        ciudad: ciudad,
        direccion: direccion,
        codigoPostal: codigoPostal,
        tarifaIvaRetenido: tarifaIvaRetenido,
        aplicaIva: aplicaIva,
        caracteristicasIva: caracteristicasIva,
        regimen: regimen,
        estado: 'Activo',
        datosCompletos: true,
        fechaCreacion: new Date().toISOString(),
        usuarioId: usuarioActual.email
    };

    // Obtener todas las empresas del localStorage
    const todasLasEmpresas = JSON.parse(localStorage.getItem('empresas')) || [];
    
    // Agregar nueva empresa
    todasLasEmpresas.push(nuevaEmpresa);
    
    // Guardar en localStorage
    localStorage.setItem('empresas', JSON.stringify(todasLasEmpresas));

    console.log('Empresa guardada:', nuevaEmpresa);
    console.log('Total empresas en localStorage:', todasLasEmpresas.length);

    // Mostrar mensaje de éxito
    mostrarExito('¡Empresa registrada exitosamente!');

    // Redirigir después de 2 segundos
    setTimeout(() => {
        window.location.href = 'empresas.html';
    }, 2000);
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

console.log('Nueva Empresa - Módulo cargado correctamente ✨');