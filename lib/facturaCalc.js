// Cálculo AUTORITATIVO de la factura (servidor).
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

function conceptoDeTabla(conceptoId) {
  return TABLA_RETEFUENTE_2026.conceptos.find((x) => x.id === conceptoId) || null;
}

// Un concepto desconocido NO puede asumirse con base mínima 0 ("siempre retiene"): eso
// practicaría retención sin fundamento. Falla cerrado, y nombrando al producto culpable.
function baseMinimaDelProducto(p) {
  const c = conceptoDeTabla(p.retConcepto);
  if (!c) {
    const e = new Error(
      `El producto "${p.codigo} — ${p.descripcion}" tiene un concepto de retención que no existe en la tabla vigente (${p.retConcepto}).`
    );
    e.code = "CONCEPTO_RETENCION_INVALIDO";
    e.producto = p.codigo;
    throw e;
  }
  return c.baseMinimaP || 0;
}

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * cliente: registro de Cliente
 * productosPorId: { [id]: Producto }
 * items: [{ productoId, cantidad, descuentoPorcentaje }]
 * emisorResponsableIva: si es false, el emisor NO puede cobrar IVA → se liquida en 0.
 *   Es OBLIGATORIO: sin default, para que una omisión falle en vez de liquidar IVA indebido
 *   (y para que la vista previa no muestre un total distinto al que se emite).
 */
export function calcularFactura({ cliente, productosPorId, items, emisorResponsableIva }) {
  if (typeof emisorResponsableIva !== "boolean") {
    throw new Error("calcularFactura: 'emisorResponsableIva' es obligatorio (true/false).");
  }
  const esAgenteRetenedor = !!cliente.esAgenteRetenedor;
  const esAutorretenedor = !!cliente.esAutorretenedor;

  const lineas = [];
  // La retención se practica sobre el pago por CONCEPTO, no por renglón: se acumula por concepto
  // y la base mínima se evalúa contra ese acumulado.
  const grupos = new Map();

  let subtotal = 0;
  let totalIva = 0;
  let totalDescuentos = 0;

  for (const it of items) {
    const p = productosPorId[it.productoId];
    if (!p) continue;

    const cantidad = Number(it.cantidad) || 0;
    const descuentoPorcentaje = Number(it.descuentoPorcentaje) || 0;
    const precioUnitario = Number(p.precioVenta) || 0;

    const baseOriginal = cantidad * precioUnitario;
    const descuentoValor = baseOriginal * (descuentoPorcentaje / 100);
    const base = baseOriginal - descuentoValor;

    // Un emisor no responsable de IVA no puede cobrarlo, sin importar la tarifa del producto.
    const tarifaProducto = parseTarifaIva(p.tarifaIva);
    const tarifaIva = emisorResponsableIva ? tarifaProducto : 0;
    const valorIva = base * (tarifaIva / 100);
    const subtotalItem = base + valorIva;

    subtotal += base;
    totalIva += valorIva;
    totalDescuentos += descuentoValor;

    // Retención automática: producto con retención + cliente agente retenedor + NO autorretenedor
    const productoTieneRetencion = !!p.retAplica;
    const aplicaRetencion = productoTieneRetencion && esAgenteRetenedor && !esAutorretenedor;
    const tarifaRetencion = Number(p.retTarifa) || 0;

    const idx = lineas.length;
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
        ivaOmitidoPorEmisorNoResponsable: !emisorResponsableIva && tarifaProducto > 0,
        retencion: {
          aplica: false,
          productoTieneRetencion,
          concepto: p.retConcepto || null,
          nombre: p.retNombre || null,
          tarifa: tarifaRetencion,
          base: r2(base),
          valor: 0,
          motivoOmision: null,
        },
      },
    });

    if (aplicaRetencion && tarifaRetencion > 0) {
      const clave = p.retConcepto;
      if (!grupos.has(clave)) {
        grupos.set(clave, {
          baseAcumulada: 0,
          nombre: p.retNombre || null,
          baseMinima: baseMinimaDelProducto(p),
          // Dentro del concepto, cada tarifa se liquida por separado (no se puede aplicar la
          // tarifa de un producto a la base de otro).
          subgrupos: new Map(),
        });
      }
      const g = grupos.get(clave);
      g.baseAcumulada += base;
      if (!g.subgrupos.has(tarifaRetencion)) {
        g.subgrupos.set(tarifaRetencion, { base: 0, indices: [] });
      }
      const sg = g.subgrupos.get(tarifaRetencion);
      sg.base += base;
      sg.indices.push(idx);
    } else if (productoTieneRetencion) {
      lineas[idx].extra.retencion.motivoOmision = esAutorretenedor
        ? "cliente autorretenedor"
        : !esAgenteRetenedor
        ? "cliente no es agente retenedor"
        : "el producto no tiene tarifa de retención";
    }
  }

  // Base mínima evaluada contra el TOTAL del concepto en el documento; luego se prorratea.
  let totalRetenciones = 0;
  const retencionesPorConcepto = [];

  for (const [clave, g] of grupos) {
    // La base mínima se mide contra el TOTAL del concepto en el documento...
    const supera = g.baseMinima === 0 || g.baseAcumulada >= g.baseMinima;

    // ...pero cada tarifa se liquida sobre su propia base.
    for (const [tarifa, sg] of g.subgrupos) {
      const valorSubgrupo = supera ? r2(sg.base * (tarifa / 100)) : 0;
      totalRetenciones += valorSubgrupo;

      // Prorrateo proporcional a la base de cada línea; los centavos sobrantes van a la última.
      let repartido = 0;
      sg.indices.forEach((idx, i) => {
        const linea = lineas[idx];
        const esUltima = i === sg.indices.length - 1;
        const proporcional =
          sg.base > 0
            ? esUltima
              ? r2(valorSubgrupo - repartido)
              : r2(valorSubgrupo * (linea.base / sg.base))
            : 0;
        repartido = r2(repartido + proporcional);

        linea.extra.retencion.aplica = valorSubgrupo > 0;
        linea.extra.retencion.valor = proporcional;
        linea.extra.retencion.baseConcepto = r2(g.baseAcumulada);
        linea.extra.retencion.baseMinimaConcepto = r2(g.baseMinima);
        linea.extra.retencion.motivoOmision = supera
          ? null
          : "el total del concepto no supera la base mínima";
      });

      if (valorSubgrupo > 0) {
        retencionesPorConcepto.push({
          concepto: clave,
          nombre: g.nombre,
          tarifa,
          base: r2(sg.base),
          baseConcepto: r2(g.baseAcumulada),
          valor: valorSubgrupo,
        });
      }
    }
  }

  const total = subtotal + totalIva;
  const totalACobrar = total - totalRetenciones;

  return {
    lineas,
    retencionesPorConcepto,
    subtotal: r2(subtotal),
    totalIva: r2(totalIva),
    totalDescuentos: r2(totalDescuentos),
    totalRetenciones: r2(totalRetenciones),
    total: r2(total),
    totalACobrar: r2(totalACobrar),
  };
}
