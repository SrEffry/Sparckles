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

function hastaCien(n) {
  if (n <= 20) return UNIDADES[n];
  if (n < 30) return "VEINTI" + UNIDADES[n - 20].toLowerCase().toUpperCase();
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`;
}

function hastaMil(n) {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const centena = CENTENAS[c];
  const resto = hastaCien(r);
  return [centena, resto].filter(Boolean).join(" ");
}

function porGrupos(n) {
  if (n === 0) return "CERO";
  if (n < 1000) return hastaMil(n);

  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    const prefijo = miles === 1 ? "MIL" : `${hastaMil(miles)} MIL`;
    return resto === 0 ? prefijo : `${prefijo} ${hastaMil(resto)}`;
  }

  if (n < 1_000_000_000_000) {
    const millones = Math.floor(n / 1_000_000);
    const resto = n % 1_000_000;
    const prefijo = millones === 1 ? "UN MILLÓN" : `${porGrupos(millones)} MILLONES`;
    return resto === 0 ? prefijo : `${prefijo} ${porGrupos(resto)}`;
  }

  const billones = Math.floor(n / 1_000_000_000_000);
  const resto = n % 1_000_000_000_000;
  const prefijo = billones === 1 ? "UN BILLÓN" : `${porGrupos(billones)} BILLONES`;
  return resto === 0 ? prefijo : `${prefijo} ${porGrupos(resto)}`;
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

  let texto = porGrupos(enteroFinal);
  // Apócope: "UNO PESOS" no, "UN PESO" sí. Igual con VEINTIUNO → VEINTIÚN, CIENTO UNO → CIENTO UN.
  if (enteroFinal === 1) texto = "UN";
  else if (texto.endsWith("VEINTIUNO")) texto = texto.replace(/VEINTIUNO$/, "VEINTIÚN");
  else if (texto.endsWith("UNO")) texto = texto.slice(0, -1);

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
