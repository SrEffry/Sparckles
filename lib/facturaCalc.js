// Cálculo AUTORITATIVO de la factura (servidor). Replica la lógica de `Nueva-factura.js`.
// Nunca se confía en montos enviados por el cliente: se recalcula desde los productos en BD.
import { TABLA_RETEFUENTE_2026 } from "@/lib/data/tablaRetefuente";

export function parseTarifaIva(tarifaIva) {
  if (typeof tarifaIva === "number") return tarifaIva;
  const s = String(tarifaIva || "").toLowerCase();
  if (["0%", "exento", "excluido", "0"].includes(s)) return 0;
  if (s === "5%") return 5;
  if (s === "19%") return 19;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function baseMinimaDeConcepto(conceptoId) {
  if (!conceptoId) return 0;
  const c = TABLA_RETEFUENTE_2026.conceptos.find((x) => x.id === conceptoId);
  return c ? c.baseMinimaP || 0 : 0;
}

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// cliente: registro de Cliente; productosPorId: Map/obj id->Producto; items: [{productoId, cantidad, descuentoPorcentaje}]
export function calcularFactura({ cliente, productosPorId, items }) {
  const esAgenteRetenedor = !!cliente.esAgenteRetenedor;
  const esAutorretenedor = !!cliente.esAutorretenedor;

  const lineas = [];
  let subtotal = 0;
  let totalIva = 0;
  let totalDescuentos = 0;
  let totalRetenciones = 0;

  for (const it of items) {
    const p = productosPorId[it.productoId];
    if (!p) continue;

    const cantidad = Number(it.cantidad) || 0;
    const descuentoPorcentaje = Number(it.descuentoPorcentaje) || 0;
    const precioUnitario = Number(p.precioVenta) || 0;

    const baseOriginal = cantidad * precioUnitario;
    const descuentoValor = baseOriginal * (descuentoPorcentaje / 100);
    const base = baseOriginal - descuentoValor;
    const tarifaIva = parseTarifaIva(p.tarifaIva);
    const valorIva = base * (tarifaIva / 100);
    const subtotalItem = base + valorIva;

    // Retención automática: producto con retención + cliente agente retenedor + NO autorretenedor
    const productoTieneRetencion = !!p.retAplica;
    const aplicaRetencion =
      productoTieneRetencion && esAgenteRetenedor && !esAutorretenedor;
    const tarifaRetencion = Number(p.retTarifa) || 0;
    const baseMinima = baseMinimaDeConcepto(p.retConcepto);

    let valorRetencion = 0;
    if (aplicaRetencion && (baseMinima === 0 || base >= baseMinima)) {
      valorRetencion = base * (tarifaRetencion / 100);
    }

    subtotal += base;
    totalIva += valorIva;
    totalDescuentos += descuentoValor;
    totalRetenciones += valorRetencion;

    lineas.push({
      productoCodigo: p.codigo,
      descripcion: p.descripcion,
      cantidad,
      precioUnitario: r2(precioUnitario),
      descuento: r2(descuentoValor),
      base: r2(base),
      tarifaIva,
      valorIva: r2(valorIva),
      subtotal: r2(subtotalItem),
      extra: {
        descuentoPorcentaje,
        retencion: {
          aplica: valorRetencion > 0,
          productoTieneRetencion,
          concepto: p.retConcepto || null,
          nombre: p.retNombre || null,
          tarifa: tarifaRetencion,
          base: r2(base),
          valor: r2(valorRetencion),
          motivoOmision:
            productoTieneRetencion && !aplicaRetencion
              ? esAutorretenedor
                ? "cliente autorretenedor"
                : "cliente no es agente retenedor"
              : baseMinima > 0 && base < baseMinima
              ? "no supera base mínima"
              : null,
        },
      },
    });
  }

  const total = subtotal + totalIva;
  const totalACobrar = total - totalRetenciones;

  return {
    lineas,
    subtotal: r2(subtotal),
    totalIva: r2(totalIva),
    totalDescuentos: r2(totalDescuentos),
    totalRetenciones: r2(totalRetenciones),
    total: r2(total),
    totalACobrar: r2(totalACobrar),
  };
}
