// Cálculo de liquidación de nómina. Replica `nomina.js` (salud/pensión 4% sobre base
// salarial: salario proporcional + extras + comisiones; el transporte NO cotiza).
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function calcularLiquidacion({
  salarioBase,
  diasTrabajados,
  transporte,
  extras,
  comisiones,
  prestamos,
  otrasDeducciones,
}) {
  const sb = Number(salarioBase) || 0;
  const dias = Number(diasTrabajados) || 0;
  const tr = Number(transporte) || 0;
  const ex = Number(extras) || 0;
  const co = Number(comisiones) || 0;
  const pr = Number(prestamos) || 0;
  const od = Number(otrasDeducciones) || 0;

  const salarioProporcional = (sb / 30) * dias;
  const totalDevengos = salarioProporcional + tr + ex + co;

  const baseSeguridadSocial = salarioProporcional + ex + co;
  const salud = baseSeguridadSocial * 0.04;
  const pension = baseSeguridadSocial * 0.04;

  const totalDeducciones = salud + pension + pr + od;
  const neto = totalDevengos - totalDeducciones;

  return {
    diasTrabajados: dias,
    salarioProporcional: r2(salarioProporcional),
    transporte: r2(tr),
    extras: r2(ex),
    comisiones: r2(co),
    salud: r2(salud),
    pension: r2(pension),
    prestamos: r2(pr),
    otrasDeducciones: r2(od),
    totalDevengos: r2(totalDevengos),
    totalDeducciones: r2(totalDeducciones),
    neto: r2(neto),
  };
}
