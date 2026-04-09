// ============================================================
// PARCHE DE INTEGRACIÓN — añadir al FINAL de notas.js
// ============================================================

// Exponer exportarNotaPDF para que historial-facturas.js pueda
// llamarla directamente cuando notas.js está cargado en la misma página
window.exportarNotaPDFExterno = exportarNotaPDF;

// FASE 2: Validación de límite en Nota Crédito
// Sobreescribe guardarNota para añadir la validación antes de guardar
(function patchGuardarNota() {
    const _guardarNotaOriginal = window.guardarNota || guardarNota;

    window.guardarNotaConValidacion = function(facturaId, tipo) {
        // Solo validar para notas crédito
        if (tipo === 'credito') {
            const facturas = getFacturas();
            const factura  = facturas.find(f => f.id === facturaId);

            if (factura) {
                // Calcular total de la nota actual en el formulario
                let totalNuevaNota = 0;
                _notaItemsTemp.forEach(item => {
                    const base = item.cantidad * item.precioUnitario;
                    const dto  = base * (item.descuento / 100);
                    const neto = base - dto;
                    totalNuevaNota += neto + neto * (item.iva / 100);
                });

                const saldoYaAplicado = factura.saldoAplicadoNC || 0;
                const disponible      = factura.total - saldoYaAplicado;

                if (totalNuevaNota > disponible + 0.01) { // +0.01 para tolerancia de redondeo
                    mostrarErrorNota(
                        `La Nota Crédito ($${fmt(totalNuevaNota)}) supera el saldo disponible ` +
                        `de la factura ($${fmt(disponible)}). ` +
                        `Total factura: $${fmt(factura.total)} | NC ya aplicadas: $${fmt(saldoYaAplicado)}.`
                    );
                    return;
                }
            }
        }

        // Si pasa validación, llamar al guardarNota original
        guardarNota(facturaId, tipo);

        // FASE 1: refrescar historial de facturas si está en la misma página
        if (typeof window.refrescarHistorialFacturas === 'function') {
            setTimeout(window.refrescarHistorialFacturas, 100);
        }
    };
})();

// Reemplazar el onclick del botón "Generar" del modal para usar la versión con validación.
// Se sobreescribe la función que construye el modal para inyectar la nueva llamada.
(function patchModal() {
    const _abrirOriginal = window.abrirModalCrearNota;

    window.abrirModalCrearNota = function(facturaId, tipoNota) {
        _abrirOriginal(facturaId, tipoNota);

        // Esperar a que el modal esté en el DOM y reemplazar el onclick del botón guardar
        setTimeout(() => {
            const modal = document.getElementById('modalCrearNota');
            if (!modal) return;

            // Buscar el botón "Generar" y redirigirlo a la versión con validación
            const btnGuardar = modal.querySelector('.btn-nota-primary');
            if (btnGuardar) {
                btnGuardar.setAttribute('onclick', `guardarNotaConValidacion('${facturaId}','${tipoNota}')`);
            }
        }, 50);
    };
})();

console.log('🔗 Parche de integración Notas aplicado');