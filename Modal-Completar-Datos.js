// Modal para completar datos de la empresa al primer login

let currentStepModal = 1;
let actividadesCIIU = [];
let ciiuCargado = false;

// Cargar CIIU al inicio - INMEDIATAMENTE
(async function() {
    await cargarActividadesCIIU();
    ciiuCargado = true;
    console.log('CIIU inicializado:', actividadesCIIU.length, 'actividades');
})();

// Verificar si necesita completar datos al cargar dashboard
async function verificarDatosCompletos() {
    const usuarioActual = sessionStorage.getItem('usuarioActual');
    if (!usuarioActual) return;

    const usuario = JSON.parse(usuarioActual);
    
    // Buscar usuario completo en localStorage
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const usuarioCompleto = usuarios.find(u => u.email === usuario.email);

    console.log('Verificando datos completos...');
    console.log('Usuario:', usuario.email);
    console.log('Datos completos:', usuarioCompleto?.datosCompletos);

    if (usuarioCompleto && usuarioCompleto.datosCompletos === false) {
        console.log('Mostrando modal para completar datos');
        
        // Esperar a que CIIU esté cargado si es persona natural
        if (usuarioCompleto.tipoEntidad === 'natural' && !ciiuCargado) {
            console.log('Esperando a que CIIU termine de cargar...');
            await new Promise(resolve => {
                const checkCIIU = setInterval(() => {
                    if (ciiuCargado) {
                        clearInterval(checkCIIU);
                        resolve();
                    }
                }, 100);
            });
        }
        
        // Mostrar modal según tipo de entidad
        if (usuarioCompleto.tipoEntidad === 'juridica') {
            mostrarModalCompletarJuridica(usuarioCompleto);
        } else {
            mostrarModalCompletarNatural(usuarioCompleto);
        }
    } else {
        console.log('Usuario ya tiene datos completos o no existe');
    }
}

// ========== MODAL PARA PERSONA JURÍDICA ==========
function mostrarModalCompletarJuridica(usuario) {
    const modalHTML = `
        <div class="modal-completar-overlay" id="modalCompletarDatos">
            <div class="modal-completar-content">
                <div class="modal-completar-header">
                    <h2>¡Bienvenido! Complete la información de su empresa</h2>
                    <p>Para comenzar a usar todas las funciones, necesitamos algunos datos adicionales</p>
                </div>

                <!-- Progress Steps -->
                <div class="modal-steps">
                    <div class="modal-step active" id="modalStep1">
                        <div class="step-circle">1</div>
                        <span>Información Tributaria</span>
                    </div>
                    <div class="modal-step-line"></div>
                    <div class="modal-step" id="modalStep2">
                        <div class="step-circle">2</div>
                        <span>Representante Legal</span>
                    </div>
                </div>

                <!-- Paso 1: Información Tributaria -->
                <div class="modal-section active" id="modalSection1">
                    <h3>Información Tributaria</h3>
                    
                    <div class="modal-form-grid">
                        <div class="modal-field full-width">
                            <label>Tarifa de IVA Retenido *</label>
                            <select id="modalTarifaIva">
                                <option value="">Seleccione tarifa</option>
                                <option value="No aplica">No aplica</option>
                                <option value="15%">15%</option>
                                <option value="50%">50%</option>
                                <option value="100%">100%</option>
                            </select>
                        </div>

                        <div class="modal-field full-width">
                            <label>¿La empresa está sujeta a IVA? *</label>
                            <div class="modal-radio-group">
                                <label class="modal-radio">
                                    <input type="radio" name="modalAplicaIva" value="Si" onchange="toggleModalIvaOptions(true)">
                                    <span>Sí, aplica</span>
                                </label>
                                <label class="modal-radio">
                                    <input type="radio" name="modalAplicaIva" value="No" checked onchange="toggleModalIvaOptions(false)">
                                    <span>No aplica</span>
                                </label>
                            </div>
                        </div>

                        <div class="modal-field full-width modal-iva-options" id="modalIvaOptions" style="display: none;">
                            <label class="label-main">Características tributarias que aplican:</label>
                            <div class="modal-checkbox-grid">
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="autoretenedora">
                                    <span>La empresa es autoretenedora</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="exentoRetencion">
                                    <span>Exento a retención</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="agenteRetenedor">
                                    <span>La empresa es agente retenedor</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="industriaComercio">
                                    <span>Industria y comercio</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="entidadAnimoLucro">
                                    <span>Entidad ánimo de lucro</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="unionTemporal">
                                    <span>Unión temporal</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="granContribuyente">
                                    <span>La empresa es gran contribuyente</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="autorretenedorRenta">
                                    <span>Autorretenedor de renta</span>
                                </label>
                                <label class="modal-checkbox">
                                    <input type="checkbox" name="modalCaracteristicasIva" value="autorretenedorIca">
                                    <span>Autorretenedor de ICA</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-modal-next" onclick="nextModalSection(2)">
                            Siguiente
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Paso 2: Representante Legal -->
                <div class="modal-section" id="modalSection2">
                    <h3>Datos del Representante Legal</h3>
                    
                    <div class="modal-form-grid">
                        <div class="modal-field">
                            <label>Nombres *</label>
                            <input type="text" id="modalRepNombres" placeholder="Nombres del representante">
                        </div>
                        <div class="modal-field">
                            <label>Apellidos *</label>
                            <input type="text" id="modalRepApellidos" placeholder="Apellidos del representante">
                        </div>
                        <div class="modal-field">
                            <label>Tipo de Documento *</label>
                            <select id="modalRepTipoDoc">
                                <option value="">Seleccione tipo</option>
                                <option value="CC">Cédula de Ciudadanía</option>
                                <option value="CE">Cédula de Extranjería</option>
                                <option value="PA">Pasaporte</option>
                            </select>
                        </div>
                        <div class="modal-field">
                            <label>Número de Documento *</label>
                            <input type="text" id="modalRepNumDoc" placeholder="Número de documento">
                        </div>
                        <div class="modal-field full-width">
                            <label>Correo Electrónico *</label>
                            <input type="email" id="modalRepEmail" placeholder="correo@ejemplo.com">
                        </div>
                    </div>

                    <div id="modalMensajeError" class="modal-mensaje-error" style="display: none;"></div>

                    <div class="modal-actions">
                        <button class="btn-modal-prev" onclick="prevModalSection(1)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                            Anterior
                        </button>
                        <button class="btn-modal-submit" onclick="guardarDatosJuridica()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Finalizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========== MODAL PARA PERSONA NATURAL ==========
function mostrarModalCompletarNatural(usuario) {
    // Ya no necesita cargar aquí porque se carga al inicio
    const modalHTML = `
            <div class="modal-completar-overlay" id="modalCompletarDatos">
                <div class="modal-completar-content">
                    <div class="modal-completar-header">
                        <h2>¡Bienvenido! Complete su información tributaria</h2>
                        <p>Para comenzar a usar todas las funciones, necesitamos algunos datos adicionales</p>
                    </div>

                    <div class="modal-section active" id="modalSection1">
                        <h3>Información Tributaria</h3>
                        
                        <div class="modal-form-grid">
                            <div class="modal-field full-width">
                                <label>¿Está inscrito en el RUT? *</label>
                                <div class="modal-radio-group">
                                    <label class="modal-radio">
                                        <input type="radio" name="modalInscritoRut" value="Si" onchange="toggleModalNIT(true)">
                                        <span>Sí</span>
                                    </label>
                                    <label class="modal-radio">
                                        <input type="radio" name="modalInscritoRut" value="No" checked onchange="toggleModalNIT(false)">
                                        <span>No</span>
                                    </label>
                                </div>
                            </div>

                            <div class="modal-field full-width" id="modalCampoNIT" style="display: none;">
                                <label>NIT *</label>
                                <input type="text" id="modalNIT" placeholder="Ingrese su NIT">
                            </div>

                            <div class="modal-field full-width">
                                <label>Tipo de Régimen *</label>
                                <select id="modalTipoRegimen">
                                    <option value="">Seleccione régimen</option>
                                    <option value="Ordinario">Ordinario</option>
                                    <option value="Simple">Simple</option>
                                    <option value="No responsable de IVA">No responsable de IVA</option>
                                </select>
                            </div>

                            <div class="modal-field full-width">
                                <label>Actividad Económica (CIIU) *</label>
                                <input type="text" id="modalBuscarCIIU" placeholder="Buscar actividad económica..." 
                                       oninput="buscarActividadCIIU(this.value)">
                                <div id="modalResultadosCIIU" class="modal-resultados-ciiu"></div>
                                <input type="hidden" id="modalActividadSeleccionada">
                                <div id="modalActividadDisplay" class="modal-actividad-display"></div>
                            </div>
                        </div>

                        <div id="modalMensajeError" class="modal-mensaje-error" style="display: none;"></div>

                        <div class="modal-actions">
                            <button class="btn-modal-submit" onclick="guardarDatosNatural()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Finalizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };


// ========== NAVEGACIÓN DEL MODAL ==========
function nextModalSection(section) {
    // Validar sección actual
    if (!validarModalSeccion(currentStepModal)) {
        return;
    }

    document.getElementById(`modalSection${currentStepModal}`).classList.remove('active');
    document.getElementById(`modalStep${currentStepModal}`).classList.remove('active');
    document.getElementById(`modalStep${currentStepModal}`).classList.add('completed');

    currentStepModal = section;
    document.getElementById(`modalSection${section}`).classList.add('active');
    document.getElementById(`modalStep${section}`).classList.add('active');
}

function prevModalSection(section) {
    document.getElementById(`modalSection${currentStepModal}`).classList.remove('active');
    document.getElementById(`modalStep${currentStepModal}`).classList.remove('active');

    currentStepModal = section;
    document.getElementById(`modalSection${section}`).classList.add('active');
    document.getElementById(`modalStep${section}`).classList.add('active');
}

function validarModalSeccion(section) {
    if (section === 1) {
        const tarifaIva = document.getElementById('modalTarifaIva').value;
        if (!tarifaIva) {
            mostrarModalError('Debe seleccionar una tarifa de IVA retenido');
            return false;
        }
    }
    return true;
}

// ========== TOGGLES ==========
function toggleModalIvaOptions(mostrar) {
    const ivaOptions = document.getElementById('modalIvaOptions');
    if (mostrar) {
        ivaOptions.style.display = 'block';
    } else {
        ivaOptions.style.display = 'none';
        document.querySelectorAll('input[name="modalCaracteristicasIva"]').forEach(cb => cb.checked = false);
    }
}

function toggleModalNIT(mostrar) {
    const campoNIT = document.getElementById('modalCampoNIT');
    if (mostrar) {
        campoNIT.style.display = 'block';
    } else {
        campoNIT.style.display = 'none';
        const nitInput = document.getElementById('modalNIT');
        if (nitInput) nitInput.value = '';
    }
}

// ========== GUARDAR DATOS JURÍDICA ==========
function guardarDatosJuridica() {
    const nombres = document.getElementById('modalRepNombres').value.trim();
    const apellidos = document.getElementById('modalRepApellidos').value.trim();
    const tipoDoc = document.getElementById('modalRepTipoDoc').value;
    const numDoc = document.getElementById('modalRepNumDoc').value.trim();
    const email = document.getElementById('modalRepEmail').value.trim();

    if (!nombres || !apellidos || !tipoDoc || !numDoc || !email) {
        mostrarModalError('Todos los campos son obligatorios');
        return;
    }

    const tarifaIva = document.getElementById('modalTarifaIva').value;
    const aplicaIva = document.querySelector('input[name="modalAplicaIva"]:checked').value;
    
    const caracteristicasIva = [];
    if (aplicaIva === 'Si') {
        document.querySelectorAll('input[name="modalCaracteristicasIva"]:checked').forEach(cb => {
            caracteristicasIva.push(cb.value);
        });
    }

    // Actualizar usuario
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const index = usuarios.findIndex(u => u.email === usuarioActual.email);

    if (index !== -1) {
        usuarios[index].tarifaIvaRetenido = tarifaIva;
        usuarios[index].aplicaIva = aplicaIva;
        usuarios[index].caracteristicasIva = caracteristicasIva;
        usuarios[index].representanteLegal = {
            nombres: nombres,
            apellidos: apellidos,
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            email: email
        };
        usuarios[index].datosCompletos = true;

        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        
        // Actualizar sesión
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuarios[index]));

        // Crear empresa inicial con todos los datos
        crearEmpresaInicialCompleta(usuarios[index]);

        // Cerrar modal
        document.getElementById('modalCompletarDatos').remove();
        
        // Mostrar mensaje de éxito
        mostrarNotificacionGlobal('¡Datos completados exitosamente!', 'success');
        
        // Recargar página para reflejar cambios
        setTimeout(() => location.reload(), 1500);
    }
}

// ========== GUARDAR DATOS NATURAL ==========
function guardarDatosNatural() {
    const inscritoRut = document.querySelector('input[name="modalInscritoRut"]:checked').value;
    const nit = inscritoRut === 'Si' ? document.getElementById('modalNIT').value.trim() : '';
    const tipoRegimen = document.getElementById('modalTipoRegimen').value;
    const actividadSeleccionada = document.getElementById('modalActividadSeleccionada').value;

    if (!tipoRegimen) {
        mostrarModalError('Debe seleccionar un tipo de régimen');
        return;
    }

    if (!actividadSeleccionada) {
        mostrarModalError('Debe seleccionar una actividad económica');
        return;
    }

    if (inscritoRut === 'Si' && !nit) {
        mostrarModalError('Debe ingresar su NIT');
        return;
    }

    // Actualizar usuario
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const index = usuarios.findIndex(u => u.email === usuarioActual.email);

    if (index !== -1) {
        usuarios[index].inscritoRut = inscritoRut;
        usuarios[index].nit = nit;
        usuarios[index].tipoRegimen = tipoRegimen;
        usuarios[index].actividadEconomica = actividadSeleccionada;
        usuarios[index].datosCompletos = true;

        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        
        // Actualizar sesión
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuarios[index]));

        // Crear empresa inicial con todos los datos
        crearEmpresaInicialCompleta(usuarios[index]);

        // Cerrar modal
        document.getElementById('modalCompletarDatos').remove();
        
        // Mostrar mensaje de éxito
        mostrarNotificacionGlobal('¡Datos completados exitosamente!', 'success');
        
        // Recargar página para reflejar cambios
        setTimeout(() => location.reload(), 1500);
    }
}

// ========== CREAR EMPRESA INICIAL COMPLETA ==========
function crearEmpresaInicialCompleta(usuario) {
    const empresas = JSON.parse(localStorage.getItem('empresas')) || [];
    
    // Verificar si ya existe
    const existe = empresas.some(e => e.esEmpresaInicial && e.usuarioId === usuario.email);
    if (existe) {
        // Actualizar la existente
        const index = empresas.findIndex(e => e.esEmpresaInicial && e.usuarioId === usuario.email);
        empresas[index] = {
            ...empresas[index],
            ...crearObjetoEmpresa(usuario),
            datosCompletos: true
        };
    } else {
        // Crear nueva
        empresas.push(crearObjetoEmpresa(usuario));
    }

    localStorage.setItem('empresas', JSON.stringify(empresas));
}

function crearObjetoEmpresa(usuario) {
    const empresaBase = {
        id: 'inicial-' + Date.now(),
        esEmpresaInicial: true,
        usuarioId: usuario.email,
        tipoPersona: usuario.tipoEntidad === 'juridica' ? 'Jurídica' : 'Natural',
        estado: 'Activo',
        datosCompletos: true,
        fechaCreacion: new Date().toISOString()
    };

    if (usuario.tipoEntidad === 'juridica') {
        return {
            ...empresaBase,
            nombre: usuario.razonSocial,
            nit: usuario.nit,
            dv: usuario.dv,
            razonSocial: usuario.razonSocial,
            pais: usuario.pais || 'Colombia',
            departamento: usuario.departamento,
            ciudad: usuario.ciudad,
            direccion: usuario.direccion,
            telefono: usuario.telefono,
            tarifaIvaRetenido: usuario.tarifaIvaRetenido,
            aplicaIva: usuario.aplicaIva,
            caracteristicasIva: usuario.caracteristicasIva || [],
            representanteLegal: usuario.representanteLegal,
            regimen: determinarRegimen(usuario)
        };
    } else {
        return {
            ...empresaBase,
            nombre: `${usuario.nombresCompletos} ${usuario.apellidosCompletos}`,
            tipoDocumento: usuario.tipoDocumento,
            numeroDocumento: usuario.numeroDocumento,
            departamento: usuario.departamento,
            municipio: usuario.municipio,
            inscritoRut: usuario.inscritoRut,
            nit: usuario.nit || '',
            tipoRegimen: usuario.tipoRegimen,
            actividadEconomica: usuario.actividadEconomica,
            regimen: usuario.tipoRegimen || 'Simple'
        };
    }
}

function determinarRegimen(usuario) {
    if (usuario.caracteristicasIva?.includes('granContribuyente')) {
        return 'Gran Contribuyente';
    } else if (usuario.aplicaIva === 'Si') {
        return 'Común';
    } else {
        return 'Simplificado';
    }
}

// ========== BUSCAR ACTIVIDAD CIIU ==========
async function cargarActividadesCIIU() {
    const rutas = [
        '../ciiu.json',           // Primero intenta subir un nivel
        './Ciuu.json',            // Luego mismo nivel
        '/Ciuu.json',             // Luego desde raíz del servidor
        'Ciuu.json'               // Por último sin ruta
    ];
    
    for (const ruta of rutas) {
        try {
            console.log('Intentando cargar CIIU desde:', ruta);
            const response = await fetch(ruta);
            if (response.ok) {
                actividadesCIIU = await response.json();
                console.log('✅ Actividades CIIU cargadas desde', ruta, ':', actividadesCIIU.length);
                return;
            }
        } catch (error) {
            console.log('❌ No se pudo cargar desde:', ruta);
        }
    }
    
    console.error('❌ No se pudo cargar ciiu.json desde ninguna ruta');
    actividadesCIIU = [];
    
    // Fallback: cargar algunas actividades manualmente
    actividadesCIIU = [
        {codigo: "4711", descripcion: "Comercio al por menor en establecimientos no especializados"},
        {codigo: "5611", descripcion: "Expendio a la mesa de comidas preparadas (Restaurantes)"},
        {codigo: "6201", descripcion: "Desarrollo de sistemas informáticos"},
        {codigo: "7020", descripcion: "Actividades de consultoría de gestión"},
        {codigo: "8610", descripcion: "Actividades de hospitales y clínicas"},
        {codigo: "4772", descripcion: "Comercio al por menor de calzado"},
        {codigo: "9602", descripcion: "Peluquería y otros tratamientos de belleza"}
    ];
    console.log('⚠️ Usando actividades de respaldo:', actividadesCIIU.length);
}

function buscarActividadCIIU(termino) {
    const resultadosDiv = document.getElementById('modalResultadosCIIU');
    
    console.log('=== BUSCAR CIIU ===');
    console.log('Término:', termino);
    console.log('Actividades disponibles:', actividadesCIIU.length);
    
    if (actividadesCIIU.length === 0) {
        resultadosDiv.innerHTML = '<div class="ciiu-no-result">⚠️ No se cargaron las actividades económicas</div>';
        resultadosDiv.style.display = 'block';
        return;
    }
    
    if (termino.length < 3) {
        console.log('Término muy corto');
        resultadosDiv.innerHTML = '';
        resultadosDiv.style.display = 'none';
        return;
    }

    const terminoLower = termino.toLowerCase();
    const resultados = actividadesCIIU.filter(act => {
        const match = act.descripcion.toLowerCase().includes(terminoLower) ||
                     act.codigo.includes(termino);
        if (match) {
            console.log('Match encontrado:', act.codigo, act.descripcion);
        }
        return match;
    }).slice(0, 10);

    console.log('Resultados encontrados:', resultados.length);

    if (resultados.length === 0) {
        resultadosDiv.innerHTML = '<div class="ciiu-no-result">No se encontraron resultados para "' + termino + '"</div>';
        resultadosDiv.style.display = 'block';
        return;
    }

    resultadosDiv.innerHTML = resultados.map(act => `
        <div class="ciiu-item" onclick="seleccionarActividadCIIU('${act.codigo}', '${act.descripcion.replace(/'/g, "\\'")}')">
            <span class="ciiu-codigo">${act.codigo}</span>
            <span class="ciiu-desc">${act.descripcion}</span>
        </div>
    `).join('');
    
    resultadosDiv.style.display = 'block';
    console.log('HTML generado:', resultadosDiv.innerHTML.substring(0, 200));
}

function seleccionarActividadCIIU(codigo, descripcion) {
    document.getElementById('modalActividadSeleccionada').value = JSON.stringify({codigo, descripcion});
    document.getElementById('modalBuscarCIIU').value = '';
    document.getElementById('modalResultadosCIIU').innerHTML = '';
    document.getElementById('modalResultadosCIIU').style.display = 'none';
    
    document.getElementById('modalActividadDisplay').innerHTML = `
        <div class="actividad-seleccionada">
            <span class="act-codigo">${codigo}</span>
            <span class="act-desc">${descripcion}</span>
            <button class="act-remove" onclick="removerActividadCIIU()">×</button>
        </div>
    `;
}

function removerActividadCIIU() {
    document.getElementById('modalActividadSeleccionada').value = '';
    document.getElementById('modalActividadDisplay').innerHTML = '';
}

// ========== UTILIDADES ==========
function mostrarModalError(mensaje) {
    const errorDiv = document.getElementById('modalMensajeError');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function mostrarNotificacionGlobal(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.className = `notificacion-global ${tipo}`;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

console.log('Modal completar datos - Cargado ✨');