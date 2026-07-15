// Validación + normalización de Empleado (servidor). Espeja `nomina.js`.
const T = (v) => (v ?? "").toString().trim();

export function normalizarEmpleado(body) {
  const errors = [];
  const nombres = T(body.nombres);
  const apellidos = T(body.apellidos);
  const documento = T(body.documento);
  const cargo = T(body.cargo);
  const salarioBase = Number(body.salarioBase);

  if (!nombres) errors.push("Los nombres son obligatorios.");
  if (!apellidos) errors.push("Los apellidos son obligatorios.");
  if (!documento) errors.push("El documento es obligatorio.");
  if (!cargo) errors.push("El cargo es obligatorio.");
  if (Number.isNaN(salarioBase) || salarioBase <= 0)
    errors.push("El salario base debe ser mayor a cero.");

  const data = {
    nombres,
    apellidos,
    documento,
    cargo,
    tipoContrato: T(body.tipoContrato) || null,
    salarioBase: Number.isNaN(salarioBase) ? 0 : salarioBase,
    eps: T(body.eps) || null,
    afp: T(body.afp) || null,
    activo: body.activo !== undefined ? !!body.activo : true,
  };

  return { data, errors };
}
