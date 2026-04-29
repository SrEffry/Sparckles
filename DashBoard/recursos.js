document.addEventListener('DOMContentLoaded', function() {
    actualizarHubRecursos();
});

function actualizarHubRecursos() {
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'));
    if (!usuarioActual) return;

    // Leer la base de datos
    const claveEmpleados = `empleados_${usuarioActual.email}`;
    const empleados = JSON.parse(localStorage.getItem(claveEmpleados)) || [];
    
    // Calcular sumatorias
    const totalEmpleadosActivos = empleados.filter(emp => emp.activo).length;
    
    let nominaMensual = 0;
    empleados.forEach(emp => {
        if (emp.activo) {
            nominaMensual += parseFloat(emp.salarioBase);
        }
    });

    // Cálculos estimados (basado en ley aproximada)
    // Seguridad social empresa ~22%
    const seguridadSocial = nominaMensual * 0.22; 
    // Prestaciones (Cesantías, Prima, Vacaciones) ~21.8%
    const prestaciones = nominaMensual * 0.2183; 

    // Formatear: Abreviar a millones si es muy alto para que se vea como "$18.5M"
    const formatearAbreviado = (valor) => {
        if (valor === 0) return "$ 0";
        if (valor >= 1000000) {
            return "$" + (valor / 1000000).toFixed(1) + "M";
        }
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
    };
    
    // Inyectar en el HTML
    document.getElementById('hubTotalEmpleados').textContent = totalEmpleadosActivos;
    document.getElementById('hubNominaTotal').textContent = formatearAbreviado(nominaMensual);
    document.getElementById('hubSeguridadSocial').textContent = formatearAbreviado(seguridadSocial);
    document.getElementById('hubPrestaciones').textContent = formatearAbreviado(prestaciones);
}