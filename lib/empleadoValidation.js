// Validación + normalización de Empleado (servidor). Espeja `nomina.js`.
import { CLASES_RIESGO_ARL, parametrosDe } from "@/lib/data/parametrosNomina";

const T = (v) => (v ?? "").toString().trim();
const CLASES = new Set(CLASES_RIESGO_ARL.map((c) => c.clase));

/**
 * Contratos que este módulo NO liquida.
 *
 * La PRESTACIÓN DE SERVICIOS no es una relación laboral: el contratista emite cuenta de cobro o
 * factura, asume su propia seguridad social como independiente y se le practica retención por
 * honorarios o servicios (art. 392 E.T.). Liquidarlo por nómina —con prestaciones, parafiscales y
 * ARL a cargo de la empresa— es exactamente la prueba documental de un contrato realidad
 * (art. 23 CST), y le regala a la UGPP el caso servido.
 */
export const CONTRATOS_SIN_NOMINA = new Set(["Prestación de servicios"]);

export function normalizarEmpleado(body) {
  const errors = [];
  const avisos = [];
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

  // Ningún trabajador de jornada completa puede ganar menos del mínimo (arts. 145 y 147 CST). No
  // se bloquea, porque la jornada parcial sí admite un salario proporcional y este módulo no
  // modela la jornada; pero se avisa, porque lo normal es que sea un error de digitación y
  // arrastraría mal todas las bases.
  const { smlmv, anio } = parametrosDe(new Date().getFullYear());
  if (salarioBase > 0 && salarioBase < smlmv) {
    avisos.push(
      `El salario está por debajo del mínimo legal de ${anio} (${smlmv.toLocaleString("es-CO")}). Solo es válido si la jornada es parcial (arts. 145-147 CST). Ojo: la jornada parcial se cotiza POR SEMANAS según el Decreto 2616 de 2013, y este módulo no lo modela — cotizará sobre el mínimo pleno, que es cotizar de más.`
    );
  }

  const tipoContrato = T(body.tipoContrato) || null;
  if (tipoContrato && CONTRATOS_SIN_NOMINA.has(tipoContrato)) {
    avisos.push(
      "Prestación de servicios no es una relación laboral: no se liquida por nómina. El contratista emite cuenta de cobro o factura y se le practica retención por honorarios o servicios."
    );
  }
  if (tipoContrato === "Aprendizaje") {
    avisos.push(
      "El contrato de aprendizaje tiene reglas propias (Ley 789/2002): apoyo de sostenimiento en vez de salario, sin prestaciones ni parafiscales, y solo cotiza a riesgos laborales en la etapa práctica. Este módulo liquida una nómina ordinaria."
    );
  }

  const data = {
    nombres,
    apellidos,
    documento,
    cargo,
    tipoContrato,
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

  return { data, errors, avisos };
}
