// Validación de asiento contable (partida doble).
const T = (v) => (v ?? "").toString().trim();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Valida los movimientos contra el catálogo PUC y devuelve los nombres CANÓNICOS.
 *
 * Sin esto el cliente podía mandar cualquier par código/nombre y quedaba registrado: una cuenta
 * inexistente entraba igual, y un código válido podía guardarse con un nombre que no le
 * corresponde. Ese nombre se imprime después en los comprobantes, así que el error queda por
 * escrito en un documento contable.
 *
 * Se exige `imputable`: las cuentas de agrupación (clase, grupo, cuenta) no reciben movimientos;
 * solo las de detalle. Cargar contra una cuenta mayor descuadra los auxiliares.
 *
 * Es asíncrona a propósito (consulta la BD), por eso vive fuera de `normalizarAsiento`, que es
 * pura. Debe llamarse dentro de la misma transacción que crea el asiento.
 */
export async function validarCuentasPUC(db, sector, movimientos) {
  const codigos = [...new Set(movimientos.map((m) => m.cuenta))];
  if (codigos.length === 0) return { errors: [], movimientos };

  const cuentas = await db.cuentaPUC.findMany({
    where: { sector, codigo: { in: codigos } },
    select: { codigo: true, nombre: true, imputable: true },
  });
  const porCodigo = new Map(cuentas.map((c) => [c.codigo, c]));

  const errors = [];
  const normalizados = movimientos.map((m) => {
    const c = porCodigo.get(m.cuenta);
    if (!c) {
      errors.push(
        `La cuenta ${m.cuenta} no existe en el catálogo PUC (${sector}). Verifica el código.`
      );
      return m;
    }
    if (!c.imputable) {
      errors.push(
        `La cuenta ${m.cuenta} (${c.nombre}) es de agrupación y no admite movimientos. Usa una cuenta de detalle.`
      );
      return m;
    }
    // El nombre lo manda el catálogo, no el cliente.
    return { ...m, nombreCuenta: c.nombre };
  });

  return { errors, movimientos: normalizados };
}

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
