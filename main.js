function mostrarVista(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    document.querySelectorAll(".mensaje-error, .mensaje-exito").forEach(m => m.classList.add("hidden"));
}

function mostrarError(idContenedor, mensaje) {
    const errorBox = document.getElementById(idContenedor);
    errorBox.textContent = mensaje;
    errorBox.classList.remove("hidden");
    setTimeout(() => errorBox.classList.add("hidden"), 4000);
}

function mostrarExito(idContenedor, mensaje) {
    const exitoBox = document.getElementById(idContenedor);
    exitoBox.textContent = mensaje;
    exitoBox.classList.remove("hidden");
    setTimeout(() => exitoBox.classList.add("hidden"), 4000);
}

function validarRegistro1() {
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    if (!nombre || !apellido || !email || !pass || !confirmPass) {
        mostrarError("mensajeErrorRegistro1", "Por favor complete todos los campos.");
        return;
    }
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
        mostrarError("mensajeErrorRegistro1", "Ingrese un correo electrónico válido.");
        return;
    }
    if (pass.length < 6) {
        mostrarError("mensajeErrorRegistro1", "La contraseña debe tener al menos 6 caracteres.");
        return;
    }
    if (pass !== confirmPass) {
        mostrarError("mensajeErrorRegistro1", "Las contraseñas no coinciden.");
        return;
    }

    // Guardar datos temporalmente para el paso 2
    sessionStorage.setItem('registro_nombre', nombre);
    sessionStorage.setItem('registro_apellido', apellido);
    sessionStorage.setItem('registro_email', email);
    sessionStorage.setItem('registro_password', pass);

    mostrarVista("registro2");
}

// ========== CAMBIAR TIPO DE ENTIDAD ==========
function cambiarTipoEntidad() {
    const tipoEntidad = document.querySelector('input[name="tipoEntidad"]:checked').value;
    const camposJuridica = document.getElementById('camposJuridica');
    const camposNatural = document.getElementById('camposNatural');

    if (tipoEntidad === 'juridica') {
        camposJuridica.style.display = 'block';
        camposNatural.style.display = 'none';
    } else {
        camposJuridica.style.display = 'none';
        camposNatural.style.display = 'block';
    }
}

function finalizarRegistro() {
    const tipoEntidad = document.querySelector('input[name="tipoEntidad"]:checked').value;
    
    if (tipoEntidad === 'juridica') {
        finalizarRegistroJuridica();
    } else {
        finalizarRegistroNatural();
    }
}

function finalizarRegistroJuridica() {
    const nit = document.getElementById('nit').value.trim();
    const confirmNit = document.getElementById('confirmNit').value.trim();
    const dv = document.getElementById('dv').value.trim();
    const confirmDv = document.getElementById('confirmDv').value.trim();
    const razon = document.getElementById('razon').value.trim();
    const pais = document.getElementById('pais').value;
    const dep = document.getElementById('departamento').value;
    const ciudad = document.getElementById('ciudad').value;
    const direccion = document.getElementById('direccion').value.trim();
    const telefono = document.getElementById('telefono').value.trim();

    if (!nit || !confirmNit || !dv || !confirmDv || !razon || !pais || !dep || !ciudad || !direccion || !telefono) {
        mostrarError("mensajeErrorRegistro2", "Todos los campos son obligatorios.");
        return;
    }
    if (nit !== confirmNit) {
        mostrarError("mensajeErrorRegistro2", "El NIT no coincide.");
        return;
    }
    if (dv !== confirmDv) {
        mostrarError("mensajeErrorRegistro2", "El DV no coincide.");
        return;
    }

    // Obtener datos del paso 1
    const nombre = sessionStorage.getItem('registro_nombre');
    const apellido = sessionStorage.getItem('registro_apellido');
    const email = sessionStorage.getItem('registro_email');
    const password = sessionStorage.getItem('registro_password');

    // Crear objeto usuario completo
    const usuario = {
        nombre: nombre,
        apellido: apellido,
        email: email,
        password: password,
        tipoEntidad: 'juridica',
        nit: nit,
        dv: dv,
        razonSocial: razon,
        pais: pais,
        departamento: dep,
        ciudad: ciudad,
        direccion: direccion,
        telefono: telefono,
        datosCompletos: false, // IMPORTANTE: Explícitamente false
        fechaRegistro: new Date().toISOString()
    };

    console.log('Guardando usuario jurídica con datosCompletos:', usuario.datosCompletos);
    guardarUsuario(usuario);
}

function finalizarRegistroNatural() {
    const nombresNat = document.getElementById('nombresNatural').value.trim();
    const apellidosNat = document.getElementById('apellidosNatural').value.trim();
    const tipoDoc = document.getElementById('tipoDocumento').value;
    const numeroDoc = document.getElementById('numeroDocumento').value.trim();
    const dep = document.getElementById('departamentoNatural').value;
    const municipio = document.getElementById('municipioNatural').value;

    if (!nombresNat || !apellidosNat || !tipoDoc || !numeroDoc || !dep || !municipio) {
        mostrarError("mensajeErrorRegistro2", "Todos los campos son obligatorios.");
        return;
    }

    // Obtener datos del paso 1
    const nombre = sessionStorage.getItem('registro_nombre');
    const apellido = sessionStorage.getItem('registro_apellido');
    const email = sessionStorage.getItem('registro_email');
    const password = sessionStorage.getItem('registro_password');

    // Crear objeto usuario completo
    const usuario = {
        nombre: nombre,
        apellido: apellido,
        email: email,
        password: password,
        tipoEntidad: 'natural',
        nombresCompletos: nombresNat,
        apellidosCompletos: apellidosNat,
        tipoDocumento: tipoDoc,
        numeroDocumento: numeroDoc,
        departamento: dep,
        municipio: municipio,
        datosCompletos: false, // IMPORTANTE: Explícitamente false
        fechaRegistro: new Date().toISOString()
    };

    console.log('Guardando usuario natural con datosCompletos:', usuario.datosCompletos);
    guardarUsuario(usuario);
}

function guardarUsuario(usuario) {
    // Guardar en localStorage
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    usuarios.push(usuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    // Limpiar datos temporales
    sessionStorage.removeItem('registro_nombre');
    sessionStorage.removeItem('registro_apellido');
    sessionStorage.removeItem('registro_email');
    sessionStorage.removeItem('registro_password');

    mostrarExito("mensajeExitoRegistro2", "🎉 Registro completado con éxito. Redirigiendo...");
    
    // Limpiar formularios
    setTimeout(() => {
        document.querySelectorAll('input').forEach(input => input.value = '');
        document.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
        mostrarVista("home");
    }, 2000);
}

// ========== FUNCIÓN DE LOGIN ==========
function iniciarSesion() {
    const usuario = document.getElementById("usuario_login").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!usuario || !password) {
        mostrarError("mensajeErrorLogin", "Por favor complete todos los campos.");
        return;
    }

    // Obtener usuarios registrados
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    // Buscar usuario (puede ser email o nombre)
    const usuarioEncontrado = usuarios.find(u => 
        (u.email === usuario || u.nombre === usuario) && u.password === password
    );

    if (usuarioEncontrado) {
        // Guardar sesión actual
        sessionStorage.setItem('usuarioActual', JSON.stringify({
            nombre: usuarioEncontrado.nombre,
            apellido: usuarioEncontrado.apellido,
            email: usuarioEncontrado.email,
            razonSocial: usuarioEncontrado.razonSocial
        }));

        mostrarExito("mensajeErrorLogin", "✅ Inicio de sesión exitoso. Redirigiendo al dashboard...");
        
        // Redirigir al dashboard después de 1.5 segundos
        setTimeout(() => {
            window.location.href = "./dashboard/dashboard.html";
        }, 1500);
    } else {
        mostrarError("mensajeErrorLogin", "Usuario o contraseña incorrectos.");
    }
}

// Agregar evento al botón de login
window.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.querySelector("#login .btn-primary");
    if (loginBtn) {
        loginBtn.addEventListener("click", iniciarSesion);
    }

    // Permitir login con Enter
    const loginInputs = document.querySelectorAll("#login input");
    loginInputs.forEach(input => {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                iniciarSesion();
            }
        });
    });
});

// ======= Departamentos y ciudades =======
let departamentosCiudades = {};

window.addEventListener("DOMContentLoaded", async () => {
    const depSelect = document.getElementById("departamento");
    const citySelect = document.getElementById("ciudad");
    const depNaturalSelect = document.getElementById("departamentoNatural");
    const munNaturalSelect = document.getElementById("municipioNatural");

    try {
        const response = await fetch("colombia.json");
        departamentosCiudades = await response.json();

        // Cargar departamentos para Jurídica
        for (let dep in departamentosCiudades) {
            const option = document.createElement("option");
            option.value = dep;
            option.textContent = dep;
            depSelect.appendChild(option);
            
            // También para Natural
            const optionNat = document.createElement("option");
            optionNat.value = dep;
            optionNat.textContent = dep;
            depNaturalSelect.appendChild(optionNat);
        }

        // Event listener para Jurídica
        depSelect.addEventListener("change", () => {
            citySelect.innerHTML = "<option value=''>Seleccione ciudad</option>";
            if (depSelect.value !== "") {
                citySelect.disabled = false;
                departamentosCiudades[depSelect.value].forEach(ciudad => {
                    const option = document.createElement("option");
                    option.value = ciudad;
                    option.textContent = ciudad;
                    citySelect.appendChild(option);
                });
            } else {
                citySelect.disabled = true;
            }
        });

        // Event listener para Natural
        depNaturalSelect.addEventListener("change", () => {
            munNaturalSelect.innerHTML = "<option value=''>Seleccione municipio</option>";
            if (depNaturalSelect.value !== "") {
                munNaturalSelect.disabled = false;
                departamentosCiudades[depNaturalSelect.value].forEach(ciudad => {
                    const option = document.createElement("option");
                    option.value = ciudad;
                    option.textContent = ciudad;
                    munNaturalSelect.appendChild(option);
                });
            } else {
                munNaturalSelect.disabled = true;
            }
        });

    } catch (error) {
        console.error("Error cargando departamentos y ciudades:", error);
    }
});