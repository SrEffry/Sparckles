// Validación + normalización de Empleado (servidor). Espeja `nomina.js`.
import { CLASES_RIESGO_ARL } from "@/lib/data/parametrosNomina";

const T = (v) => (v ?? "").toString().trim();
const CLASES = new Set(CLASES_RIESGO_ARL.map((c) => c.clase));

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
    arl: T(body.arl) || null,
    // La clase de riesgo decide la tarifa de la ARL (0,522% a 6,96%). Se valida contra la
    // tabla y se cae a la I si viene algo raro: es la más baja, así que nunca sobrestima el
    // costo sin que el usuario lo haya elegido.
    claseRiesgoArl: CLASES.has(T(body.claseRiesgoArl)) ? T(body.claseRiesgoArl) : "I",
    activo: body.activo !== undefined ? !!body.activo : true,
  };

  return { data, errors };
}
