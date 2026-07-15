// Validación + cálculo AUTORITATIVO de Nota débito/crédito (servidor). Espeja `Notas.js`.
import { motivosDe } from "@/lib/motivosNota";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function normalizarNota(body) {
  const errors = [];
  const tipo = body.tipo === "debito" ? "debito" : "credito";

  const motivo = motivosDe(tipo).find((m) => m.codigo === String(body.motivoCodigo));
  if (!motivo) errors.push("Selecciona el motivo DIAN de la nota.");

  const fecha = (body.fecha || "").toString().trim();
  if (!fecha) errors.push("La fecha de elaboración es obligatoria.");

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const itemsValidos = rawItems.filter(
    (i) => (i.descripcion || "").toString().trim() || Number(i.precioUnitario) > 0
  );
  if (itemsValidos.length === 0)
    errors.push("Agrega al menos un ítem con descripción o valor.");

  let subtotal = 0;
  let totalDescuentos = 0;
  let totalIva = 0;
  const items = itemsValidos.map((i) => {
    const cantidad = Number(i.cantidad) || 0;
    const precioUnitario = Number(i.precioUnitario) || 0;
    const descuento = Number(i.descuento) || 0;
    const iva = Number(i.iva) || 0;

    const base = cantidad * precioUnitario;
    const dto = base * (descuento / 100);
    const neto = base - dto;
    const ivaValor = neto * (iva / 100);
    const subtotalItem = neto + ivaValor;

    subtotal += neto;
    totalDescuentos += dto;
    totalIva += ivaValor;

    return {
      descripcion: (i.descripcion || "").toString().trim() || "—",
      cantidad,
      precioUnitario: r2(precioUnitario),
      descuento,
      iva,
      base: r2(neto),
      subtotalItem: r2(subtotalItem),
    };
  });

  const totalNota = subtotal + totalIva;

  return {
    errors,
    tipo,
    motivo,
    fecha,
    items,
    subtotal: r2(subtotal),
    totalDescuentos: r2(totalDescuentos),
    totalIva: r2(totalIva),
    totalNota: r2(totalNota),
    observaciones: (body.observaciones || "").toString().trim() || null,
  };
}
