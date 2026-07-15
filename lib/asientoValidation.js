// Validación de asiento contable (partida doble). Espeja `asientos-contables.js`.
const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function normalizarAsiento(body) {
  const errors = [];
  const fecha = T(body.fecha);
  const descripcion = T(body.descripcion);
  const estado = body.estado === "borrador" ? "borrador" : "registrado";
  const sector = body.sector === "esal" ? "esal" : "comercial";

  if (!fecha) errors.push("La fecha del asiento es obligatoria.");
  if (!descripcion) errors.push("La descripción es obligatoria.");

  const raw = Array.isArray(body.movimientos) ? body.movimientos : [];
  const movimientos = [];
  let totalDebitos = 0;
  let totalCreditos = 0;

  raw.forEach((m, i) => {
    const cuenta = T(m.cuenta);
    const nombreCuenta = T(m.nombreCuenta);
    const debito = Number(m.debito) || 0;
    const credito = Number(m.credito) || 0;
    if (!cuenta || !nombreCuenta) return; // ignorar líneas vacías

    if (debito < 0 || credito < 0) errors.push(`Línea ${i + 1}: los valores no pueden ser negativos.`);
    if (debito > 0 && credito > 0) errors.push(`Línea ${i + 1}: no puede tener débito y crédito a la vez.`);
    if (debito === 0 && credito === 0) errors.push(`Línea ${i + 1}: ingrese un valor en débito o crédito.`);

    totalDebitos += debito;
    totalCreditos += credito;
    movimientos.push({
      cuenta,
      nombreCuenta,
      debito: r2(debito),
      credito: r2(credito),
      tercero: T(m.tercero) || null,
    });
  });

  if (movimientos.length < 2) errors.push("El asiento debe tener al menos 2 movimientos.");

  const diferencia = Math.abs(totalDebitos - totalCreditos);
  if (estado === "registrado" && diferencia > 0.01) {
    errors.push(`El asiento no está balanceado. Diferencia: ${r2(diferencia)}.`);
  }

  const data = {
    sector,
    fecha,
    descripcion,
    estado,
    tipo: "manual",
    totalDebitos: r2(totalDebitos),
    totalCreditos: r2(totalCreditos),
    diferencia: r2(diferencia),
  };

  return { data, movimientos, errors };
}
