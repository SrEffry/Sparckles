// Monto en letras para los comprobantes. Es lo que el beneficiario firma haber recibido, así
// que debe corresponder al NETO entregado, no al bruto.
//
// Convenciones colombianas: "M/CTE." al final, y los centavos como fracción sobre 100
// ("… PESOS CON 50/100 M/CTE."), que es como se escribe en cheques y comprobantes.

const UNIDADES = [
  "", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE",
  "DIECIOCHO", "DIECINUEVE", "VEINTE",
];

const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];

const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
];

/**
 * `apocopar` convierte el "UNO" final en "UN" / "VEINTIÚN". Hace falta dentro de cada grupo,
 * no solo al final del número: "VEINTIUNO MIL" está mal, es "VEINTIÚN MIL". Igual con
 * "TREINTA Y UN MIL" o "CIENTO VEINTIÚN MILLONES".
 */
function hastaCien(n, apocopar = false) {
  if (n === 1) return apocopar ? "UN" : "UNO";
  if (n === 21) return apocopar ? "VEINTIÚN" : "VEINTIUNO";
  if (n <= 20) return UNIDADES[n];
  if (n < 30) return "VEINTI" + UNIDADES[n - 20];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return DECENAS[d];
  return `${DECENAS[d]} Y ${hastaCien(u, apocopar)}`;
}

function hastaMil(n, apocopar = false) {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const centena = CENTENAS[c];
  const resto = r === 0 ? "" : hastaCien(r, apocopar);
  return [centena, resto].filter(Boolean).join(" ");
}

/**
 * `apocopar` se propaga a los grupos que van seguidos de MIL, MILLONES o del sustantivo:
 * "VEINTIÚN MIL", "TREINTA Y UN MILLONES", "CIENTO UN PESOS".
 */
function porGrupos(n, apocopar = false) {
  if (n === 0) return "CERO";
  if (n < 1000) return hastaMil(n, apocopar);

  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    // El grupo de los miles SIEMPRE apocopa: no existe "veintiuno mil".
    const prefijo = miles === 1 ? "MIL" : `${hastaMil(miles, true)} MIL`;
    return resto === 0 ? prefijo : `${prefijo} ${hastaMil(resto, apocopar)}`;
  }

  if (n < 1_000_000_000_000) {
    const millones = Math.floor(n / 1_000_000);
    const resto = n % 1_000_000;
    const prefijo = millones === 1 ? "UN MILLÓN" : `${porGrupos(millones, true)} MILLONES`;
    return resto === 0 ? prefijo : `${prefijo} ${porGrupos(resto, apocopar)}`;
  }

  const billones = Math.floor(n / 1_000_000_000_000);
  const resto = n % 1_000_000_000_000;
  const prefijo = billones === 1 ? "UN BILLÓN" : `${porGrupos(billones, true)} BILLONES`;
  return resto === 0 ? prefijo : `${prefijo} ${porGrupos(resto, apocopar)}`;
}

/**
 * "1234567.5" → "UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL QUINIENTOS SESENTA Y SIETE PESOS
 * CON 50/100 M/CTE."
 */
export function numeroALetras(valor, moneda = "PESOS") {
  const n = Number(valor) || 0;
  const negativo = n < 0;
  const abs = Math.abs(n);

  const entero = Math.floor(abs);
  // Se redondea el residuo, no se trunca: 0.999 son 100 centavos, no 99.
  let centavos = Math.round((abs - entero) * 100);
  let enteroFinal = entero;
  if (centavos === 100) {
    enteroFinal += 1;
    centavos = 0;
  }

  // Se apocopa desde la raíz: el "UNO" final de cada grupo se convierte donde toca, no solo
  // al final de la cadena. Así "21.000" da "VEINTIÚN MIL" y no "VEINTIUNO MIL".
  const texto = porGrupos(enteroFinal, true);

  // Singular del sustantivo: "UN PESO", no "UN PESOS".
  const unidad = enteroFinal === 1 ? moneda.replace(/S$/, "") : moneda;

  // Millones y billones EXACTOS llevan "DE": "DOS MILLONES DE PESOS". Con remanente no:
  // "TRES MILLONES QUINIENTOS MIL PESOS".
  const exactoEnMillones = enteroFinal >= 1_000_000 && enteroFinal % 1_000_000 === 0;

  const partes = [texto, exactoEnMillones ? `DE ${unidad}` : unidad];
  if (centavos > 0) partes.push(`CON ${String(centavos).padStart(2, "0")}/100`);
  partes.push("M/CTE.");

  return (negativo ? "MENOS " : "") + partes.join(" ");
}
