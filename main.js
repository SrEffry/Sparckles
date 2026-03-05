// Sparkles - Sistema de Autenticación Simplificado

// ========== MOSTRAR VISTAS ==========
function mostrarVista(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    document.querySelectorAll(".mensaje-error, .mensaje-exito").forEach(m => m.classList.add("hidden"));
}

// ========== MOSTRAR ERROR ==========
function mostrarError(idContenedor, mensaje) {
    const errorBox = document.getElementById(idContenedor);
    errorBox.textContent = mensaje;
    errorBox.classList.remove("hidden");
    setTimeout(() => errorBox.classList.add("hidden"), 5000);
}

// ========== MOSTRAR ÉXITO ==========
function mostrarExito(idContenedor, mensaje) {
    const exitoBox = document.getElementById(idContenedor);
    exitoBox.textContent = mensaje;
    exitoBox.classList.remove("hidden");
    setTimeout(() => exitoBox.classList.add("hidden"), 4000);
}

// ========== REGISTRAR USUARIO ==========
function registrarUsuario() {
    const nombreCompleto = document.getElementById("nombreCompleto").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const aceptarTerminos = document.getElementById("aceptarTerminos").checked;

    // Validaciones
    if (!nombreCompleto || !email || !password || !confirmPassword) {
        mostrarError("mensajeErrorRegistro", "Por favor complete todos los campos.");
        return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        mostrarError("mensajeErrorRegistro", "Ingrese un correo electrónico válido.");
        return;
    }

    if (password.length < 6) {
        mostrarError("mensajeErrorRegistro", "La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    if (password !== confirmPassword) {
        mostrarError("mensajeErrorRegistro", "Las contraseñas no coinciden.");
        return;
    }

    if (!aceptarTerminos) {
        mostrarError("mensajeErrorRegistro", "Debes aceptar los términos y condiciones.");
        return;
    }

    // Verificar si el email ya existe
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const emailExiste = usuarios.some(u => u.email === email);

    if (emailExiste) {
        mostrarError("mensajeErrorRegistro", "Este correo electrónico ya está registrado.");
        return;
    }

    // Dividir nombre completo en nombre y apellido
    const partesNombre = nombreCompleto.split(' ');
    const nombre = partesNombre[0];
    const apellido = partesNombre.slice(1).join(' ') || partesNombre[0];

    // Crear objeto usuario simplificado
    const usuario = {
        id: Date.now().toString(),
        nombre: nombre,
        apellido: apellido,
        nombreCompleto: nombreCompleto,
        email: email,
        password: password,
        fechaRegistro: new Date().toISOString(),
        activo: true
    };

    // Guardar usuario
    usuarios.push(usuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    console.log('✅ Usuario registrado:', usuario);

    // Mostrar mensaje de éxito
    mostrarExito("mensajeErrorRegistro", "🎉 ¡Cuenta creada exitosamente! Redirigiendo al login...");

    // Limpiar formulario
    document.getElementById('nombreCompleto').value = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('aceptarTerminos').checked = false;

    // Redirigir al login después de 2 segundos
    setTimeout(() => {
        mostrarVista('login');
        // Pre-llenar el email en el login
        document.getElementById('usuario_login').value = email;
    }, 2000);
}

// ========== INICIAR SESIÓN ==========
function iniciarSesion() {
    const email = document.getElementById("usuario_login").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        mostrarError("mensajeErrorLogin", "Por favor complete todos los campos.");
        return;
    }

    // Obtener usuarios registrados
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    // Buscar usuario por email y contraseña
    const usuarioEncontrado = usuarios.find(u => 
        u.email === email && u.password === password && u.activo
    );

    if (usuarioEncontrado) {
        // Guardar sesión actual
        sessionStorage.setItem('usuarioActual', JSON.stringify({
            id: usuarioEncontrado.id,
            nombre: usuarioEncontrado.nombre,
            apellido: usuarioEncontrado.apellido,
            nombreCompleto: usuarioEncontrado.nombreCompleto,
            email: usuarioEncontrado.email
        }));

        console.log('✅ Sesión iniciada:', usuarioEncontrado.email);

        // Mostrar mensaje de éxito
        const mensajeBox = document.getElementById("mensajeErrorLogin");
        mensajeBox.className = "mensaje-exito";
        mensajeBox.textContent = "✅ Inicio de sesión exitoso. Redirigiendo al dashboard...";
        mensajeBox.classList.remove("hidden");
        
        // Redirigir al dashboard después de 1 segundo
        setTimeout(() => {
            window.location.href = "./dashboard/dashboard.html";
        }, 1000);
    } else {
        mostrarError("mensajeErrorLogin", "Correo electrónico o contraseña incorrectos.");
    }
}

// ========== PERMITIR LOGIN CON ENTER ==========
window.addEventListener("DOMContentLoaded", () => {
    // Login con Enter
    const loginInputs = document.querySelectorAll("#login input");
    loginInputs.forEach(input => {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                iniciarSesion();
            }
        });
    });

    // Registro con Enter
    const registroInputs = document.querySelectorAll("#registro input");
    registroInputs.forEach(input => {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && input.type !== "checkbox") {
                registrarUsuario();
            }
        });
    });
});

console.log('✨ Sistema de autenticación Sparkles cargado');