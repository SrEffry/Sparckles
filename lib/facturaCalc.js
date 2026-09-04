// Cálculo AUTORITATIVO de la factura (servidor).
// Nunca se confía en montos enviados por el cliente: se recalcula desde los productos en BD.
import { TABLA_RETEFUENTE_2026 } from "@/lib/data/tablaRetefuente";

// Las tarifas ya no se interpretan aquí: vienen del catálogo `Impuesto`, enlazado a cada
// producto. El cálculo solo las aplica.

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
export function calcularFactura({
  cliente,
  productosPorId,
  items,
  emisorResponsableIva,
  // Descuento comercial de cabecera (%), prorrateado a las líneas.
  descuentoGlobalPorcentaje = 0,
  // Retenciones fiscales MANUALES (dependen del adquirente y el municipio, no del producto):
  // ReteIVA = % sobre el IVA; ReteICA = por mil (‰) sobre la base gravable.
  reteIvaPorcentaje = 0,
  reteIcaPorMil = 0,
}) {
  if (typeof emisorResponsableIva !== "boolean") {
    throw new Error("calcularFactura: 'emisorResponsableIva' es obligatorio (true/false).");
  }
  const descGlobalPct = Math.min(100, Math.max(0, Number(descuentoGlobalPorcentaje) || 0));
  const esAgenteRetenedor = !!cliente.esAgenteRetenedor;
  const esAutorretenedor = !!cliente.esAutorretenedor;

  const lineas = [];
  // La retención se practica sobre el pago por CONCEPTO, no por renglón: se acumula por concepto
  // y la base mínima se evalúa contra ese acumulado.
  const grupos = new Map();

  let subtotal = 0;
  let totalIva = 0;
  let totalInc = 0;
  let totalOtros = 0;
  let totalDescuentos = 0;
  // Base acumulada por tratamiento de IVA; su suma debe cuadrar con `subtotal`.
  const basesPorTipo = {};

  for (const it of items) {
    const p = productosPorId[it.productoId];
    if (!p) continue;

    const cantidad = Number(it.cantidad) || 0;
    const descuentoPorcentaje = Number(it.descuentoPorcentaje) || 0;

    // PRECIO PACTADO. El del catálogo es el valor por defecto, pero el usuario puede cambiarlo
    // en la factura: un precio cambia entre que se creó el producto y que se factura, y obligar
    // a salir, editar el catálogo y volver rompía el trabajo a medias y además reescribía el
    // precio de TODAS las facturas futuras por una venta puntual.
    //
    // Esto NO afloja la regla de que el servidor manda. Lo que la norma fija —la tarifa de IVA,
    // el tratamiento, el concepto y la tarifa de retención— sigue saliendo del catálogo y del
    // producto, no del cliente HTTP. El precio es un dato COMERCIAL: lo pacta el vendedor.
    //
    // `null`/vacío = usar el del catálogo. Se distingue de `0` a propósito: cero es un precio
    // que alguien escribió, y `validarFactura` decide si lo admite.
    const precioPactado =
      it.precioUnitario === "" || it.precioUnitario == null ? null : Number(it.precioUnitario);
    const precioCatalogo = Number(p.precioVenta) || 0;
    const precioUnitario = precioPactado != null && Number.isFinite(precioPactado) && precioPactado >= 0
      ? precioPactado
      : precioCatalogo;

    const baseOriginal = cantidad * precioUnitario;
    const descuentoLinea = baseOriginal * (descuentoPorcentaje / 100);
    // El descuento de cabecera se prorratea sobre la base ya descontada de cada línea, para que
    // IVA y retención se liquiden sobre la base realmente facturada.
    const descuentoGlobalLinea = (baseOriginal - descuentoLinea) * (descGlobalPct / 100);
    const descuentoValor = descuentoLinea + descuentoGlobalLinea;
    const base = baseOriginal - descuentoValor;

    // ---- Impuestos del renglón ----
    // Cada impuesto se liquida por separado y se etiqueta con su tipo. IVA e Impuesto al
    // Consumo NO se suman en la misma bolsa: son tributos distintos, con formularios
    // distintos, y el INC no es descontable para el comprador.
    const tipoProducto = p.tratamientoIva || "gravado";
    const tipoIva = emisorResponsableIva ? tipoProducto : "no_responsable";

    // Un emisor no responsable de IVA no puede cobrarlo, sin importar lo que diga el
    // producto. El INC no depende de esa condición: es otro impuesto.
    const catalogo = (p.impuestos || [])
      .map((pi) => pi.impuesto)
      .filter(Boolean)
      .filter((imp) => (imp.tipo === "IVA" ? emisorResponsableIva : true));

    const impuestosLinea = catalogo.map((imp) => {
      const esNominal = !!imp.esNominal;
      const tarifa = esNominal ? null : Number(imp.tarifa) || 0;
      const valorUnitario = esNominal ? Number(imp.valorUnitario) || 0 : null;
      const valor = esNominal ? valorUnitario * cantidad : base * (tarifa / 100);
      return {
        impuestoId: imp.id,
        tipo: imp.tipo,
        codigoDian: imp.codigoDian,
        nombreDian: imp.nombreDian,
        base: r2(base),
        esNominal,
        tarifa,
        valorUnitario,
        cantidad: esNominal ? cantidad : null,
        valor: r2(valor),
      };
    });

    const ivaLinea = impuestosLinea
      .filter((i) => i.tipo === "IVA")
      .reduce((a, i) => a + i.valor, 0);
    const incLinea = impuestosLinea
      .filter((i) => i.tipo === "INC")
      .reduce((a, i) => a + i.valor, 0);
    const otrosLinea = impuestosLinea
      .filter((i) => i.tipo !== "IVA" && i.tipo !== "INC")
      .reduce((a, i) => a + i.valor, 0);

    // `tarifaIva` se conserva como la tarifa de IVA del renglón (0 si no hay), porque la
    // representación gráfica y los reportes por tarifa la usan.
    const tarifaIva = impuestosLinea.find((i) => i.tipo === "IVA")?.tarifa ?? 0;
    const valorIva = ivaLinea;
    const subtotalItem = base + ivaLinea + incLinea + otrosLinea;

    subtotal += base;
    totalIva += ivaLinea;
    totalInc += incLinea;
    totalOtros += otrosLinea;
    totalDescuentos += descuentoValor;
    basesPorTipo[tipoIva] = (basesPorTipo[tipoIva] || 0) + base;

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
      tipoIva,
      valorIva: r2(valorIva),
      subtotal: r2(subtotalItem),
      // Un `TaxSubtotal` de UBL por impuesto. Se persisten como filas hijas.
      impuestos: impuestosLinea,
      extra: {
        descuentoPorcentaje,
        // Tratamiento propio del producto, que se conserva aunque el emisor no sea responsable.
        tipoIvaProducto: tipoProducto,
        inc: r2(incLinea),
        otrosImpuestos: r2(otrosLinea),
        ivaOmitidoPorEmisorNoResponsable:
          !emisorResponsableIva && tipoProducto === "gravado" && (p.impuestos || []).length > 0,
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

  // El total del documento incluye TODOS los tributos que se le cobran al cliente, no solo
  // el IVA: el INC también se cobra, aunque se declare aparte.
  const total = subtotal + totalIva + totalInc + totalOtros;

  // ReteIVA sobre el IVA; ReteICA por mil sobre la base gravable (subtotal). Son manuales.
  // La base de ReteIVA es el IVA, NO el IVA más el INC: son impuestos distintos.
  const reteIvaPct = Math.max(0, Number(reteIvaPorcentaje) || 0);
  const reteIcaMil = Math.max(0, Number(reteIcaPorMil) || 0);
  const reteIva = r2(totalIva * (reteIvaPct / 100));
  const reteIca = r2(subtotal * (reteIcaMil / 1000));
  const totalRetencionesFiscales = r2(reteIva + reteIca);

  const retencionesFiscales =
    reteIva > 0 || reteIca > 0
      ? {
          reteIva: { porcentaje: reteIvaPct, base: r2(totalIva), valor: reteIva },
          reteIca: { porMil: reteIcaMil, base: r2(subtotal), valor: reteIca },
          total: totalRetencionesFiscales,
        }
      : null;

  const totalACobrar = total - totalRetenciones - totalRetencionesFiscales;

  // Bases por tratamiento de IVA. El remanente de centavos del redondeo se lleva a la
  // categoría mayor, para que las cuatro sumen exactamente `subtotal` y el pie de totales
  // del historial cuadre al peso contra la contabilidad.
  const bases = {
    baseGravada: r2(basesPorTipo.gravado || 0),
    baseExenta: r2(basesPorTipo.exento || 0),
    baseExcluida: r2(basesPorTipo.excluido || 0),
    baseNoResponsable: r2(basesPorTipo.no_responsable || 0),
    baseSinClasificar: r2(basesPorTipo.sin_clasificar || 0),
  };
  const sumaBases = Object.values(bases).reduce((a, b) => a + b, 0);
  const desfase = r2(r2(subtotal) - sumaBases);
  if (desfase !== 0) {
    const mayor = Object.keys(bases).reduce((a, b) => (bases[b] > bases[a] ? b : a));
    bases[mayor] = r2(bases[mayor] + desfase);
  }

  return {
    lineas,
    retencionesPorConcepto,
    retencionesFiscales,
    subtotal: r2(subtotal),
    ...bases,
    totalIva: r2(totalIva),
    totalInc: r2(totalInc),
    totalOtrosImpuestos: r2(totalOtros),
    totalDescuentos: r2(totalDescuentos),
    totalRetenciones: r2(totalRetenciones),
    reteIva,
    reteIca,
    totalRetencionesFiscales,
    total: r2(total),
    totalACobrar: r2(totalACobrar),
  };
}
