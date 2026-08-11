// Registro de import/export por módulo. Cada entrada define las columnas del Excel y las
// funciones exportar()/importar(). Los endpoints genéricos (/api/datos/[modulo]/…) despachan aquí.
import { prisma } from "@/lib/prisma";
import { VALORES_TARIFA } from "@/lib/data/tarifasIva";

// ---- helpers ----
const sn = (b) => (b ? "Sí" : "No");
const toBool = (v) => ["sí", "si", "true", "1", "x", "verdadero"].includes(String(v ?? "").trim().toLowerCase());
const num = (v) => {
  const n = Number(String(v ?? "").toString().replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const txt = (v) => String(v ?? "").trim();
function fechaISO(v) {
  if (v instanceof Date)
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  const s = txt(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

// ====================== PRODUCTOS ======================
const productos = {
  hoja: "Productos",
  soportaImport: true,
  columnas: [
    { key: "codigo", header: "Código", width: 16 },
    { key: "descripcion", header: "Descripción", width: 34 },
    { key: "unidad", header: "Unidad", width: 12 },
    { key: "tarifaIva", header: "Tarifa IVA", width: 12 },
    { key: "precioVenta", header: "Precio venta", width: 16 },
    { key: "linea", header: "Línea", width: 18 },
    { key: "comoCompra", header: "Cómo compra", width: 16 },
    { key: "comoVende", header: "Cómo vende", width: 16 },
    { key: "retiene", header: "Retiene", width: 10 },
    { key: "retConcepto", header: "Concepto retención", width: 20 },
  ],
  async exportar(uid) {
    const rows = await prisma.producto.findMany({ where: { usuarioId: uid }, orderBy: { codigo: "asc" } });
    return rows.map((p) => ({
      codigo: p.codigo,
      descripcion: p.descripcion,
      unidad: p.unidad || "",
      tarifaIva: p.tarifaIva || "",
      precioVenta: Number(p.precioVenta),
      linea: p.linea || "",
      comoCompra: p.comoCompra || "",
      comoVende: p.comoVende || "",
      retiene: sn(p.retAplica),
      retConcepto: p.retConcepto || "",
    }));
  },
  async importar(uid, filas) {
    let creados = 0;
    const errores = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      const fila = i + 2; // fila real en el Excel (1 = cabecera)
      const codigo = txt(f["Código"]);
      const descripcion = txt(f["Descripción"]);
      const precioVenta = num(f["Precio venta"]);
      if (!codigo) { errores.push({ fila, mensaje: "Falta el código." }); continue; }
      if (!descripcion) { errores.push({ fila, mensaje: "Falta la descripción." }); continue; }
      if (precioVenta < 0) { errores.push({ fila, mensaje: "Precio de venta inválido." }); continue; }
      // La tarifa debe existir en la tabla. Antes cualquier texto entraba, y "0%" era el
      // valor por defecto: un producto importado con una tarifa mal escrita se facturaba
      // silenciosamente sin IVA.
      const tarifaIva = txt(f["Tarifa IVA"]);
      if (!tarifaIva) {
        errores.push({ fila, mensaje: "Falta la tarifa de IVA." });
        continue;
      }
      if (!VALORES_TARIFA.includes(tarifaIva)) {
        errores.push({
          fila,
          mensaje: `Tarifa de IVA "${tarifaIva}" no válida. Opciones: ${VALORES_TARIFA.join(", ")}.`,
        });
        continue;
      }
      const data = {
        descripcion,
        unidad: txt(f["Unidad"]) || null,
        tarifaIva,
        precioVenta,
        linea: txt(f["Línea"]) || null,
        comoCompra: txt(f["Cómo compra"]) || null,
        comoVende: txt(f["Cómo vende"]) || null,
      };
      try {
        await prisma.producto.upsert({
          where: { usuarioId_codigo: { usuarioId: uid, codigo } },
          update: data,
          create: { usuarioId: uid, codigo, ...data },
        });
        creados++;
      } catch {
        errores.push({ fila, mensaje: `No se pudo guardar el producto ${codigo}.` });
      }
    }
    return { creados, errores };
  },
};

// ====================== CLIENTES ======================
const clientes = {
  hoja: "Clientes",
  soportaImport: true,
  columnas: [
    { key: "tipo", header: "Tipo", width: 12 },
    { key: "nombreCompleto", header: "Nombre completo", width: 30 },
    { key: "tipoDocumento", header: "Tipo documento", width: 14 },
    { key: "numeroDocumento", header: "Número documento", width: 18 },
    { key: "nit", header: "NIT", width: 14 },
    { key: "dv", header: "DV", width: 6 },
    { key: "telefono", header: "Teléfono", width: 14 },
    { key: "email", header: "Email", width: 26 },
    { key: "direccion", header: "Dirección", width: 26 },
    { key: "ciudad", header: "Ciudad", width: 16 },
    { key: "departamento", header: "Departamento", width: 16 },
    { key: "agenteRetenedor", header: "Agente retenedor", width: 16 },
    { key: "autorretenedor", header: "Autorretenedor", width: 16 },
  ],
  async exportar(uid) {
    const rows = await prisma.cliente.findMany({ where: { usuarioId: uid }, orderBy: { nombreCompleto: "asc" } });
    return rows.map((c) => ({
      tipo: c.tipo,
      nombreCompleto: c.nombreCompleto,
      tipoDocumento: c.tipoDocumento || "",
      numeroDocumento: c.numeroDocumento || "",
      nit: c.nit || "",
      dv: c.dv || "",
      telefono: c.telefono || "",
      email: c.email || "",
      direccion: c.direccion || "",
      ciudad: c.ciudad || "",
      departamento: c.departamento || "",
      agenteRetenedor: sn(c.esAgenteRetenedor),
      autorretenedor: sn(c.esAutorretenedor),
    }));
  },
  async importar(uid, filas) {
    let creados = 0;
    const errores = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      const fila = i + 2;
      const nombreCompleto = txt(f["Nombre completo"]);
      const nit = txt(f["NIT"]);
      let tipo = txt(f["Tipo"]).toLowerCase();
      if (tipo !== "natural" && tipo !== "empresa") tipo = nit ? "empresa" : "natural";
      if (!nombreCompleto) { errores.push({ fila, mensaje: "Falta el nombre completo." }); continue; }
      try {
        await prisma.cliente.create({
          data: {
            usuarioId: uid,
            tipo,
            nombreCompleto,
            razonSocial: tipo === "empresa" ? nombreCompleto : null,
            tipoDocumento: txt(f["Tipo documento"]) || null,
            numeroDocumento: txt(f["Número documento"]) || null,
            nit: nit || null,
            dv: txt(f["DV"]) || null,
            telefono: txt(f["Teléfono"]) || null,
            email: txt(f["Email"]) || null,
            direccion: txt(f["Dirección"]) || null,
            ciudad: txt(f["Ciudad"]) || null,
            departamento: txt(f["Departamento"]) || null,
            esAgenteRetenedor: toBool(f["Agente retenedor"]),
            esAutorretenedor: toBool(f["Autorretenedor"]),
          },
        });
        creados++;
      } catch {
        errores.push({ fila, mensaje: `No se pudo guardar el cliente "${nombreCompleto}".` });
      }
    }
    return { creados, errores };
  },
};

// ====================== COMPRAS ======================
const compras = {
  hoja: "Compras",
  soportaImport: true,
  columnas: [
    { key: "numFactura", header: "N° factura", width: 16 },
    { key: "fecha", header: "Fecha", width: 14 },
    { key: "proveedorNombre", header: "Proveedor", width: 30 },
    { key: "proveedorNit", header: "NIT proveedor", width: 16 },
    { key: "base", header: "Base gravable", width: 16 },
    { key: "tarifaIva", header: "Tarifa IVA %", width: 12 },
    { key: "iva", header: "IVA", width: 14 },
    { key: "reteFuente", header: "ReteFuente", width: 14 },
    { key: "reteIva", header: "ReteIVA", width: 14 },
    { key: "reteIca", header: "ReteICA", width: 14 },
    { key: "total", header: "Total a pagar", width: 16 },
  ],
  async exportar(uid) {
    const rows = await prisma.compra.findMany({ where: { usuarioId: uid }, orderBy: { fecha: "desc" } });
    return rows.map((c) => ({
      numFactura: c.numFactura,
      fecha: c.fecha,
      proveedorNombre: c.proveedorNombre,
      proveedorNit: c.proveedorNit || "",
      base: Number(c.subtotal),
      tarifaIva: "",
      iva: Number(c.totalIva),
      reteFuente: "",
      reteIva: "",
      reteIca: "",
      total: Number(c.totalAPagar),
    }));
  },
  async importar(uid, filas) {
    let creados = 0;
    const errores = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      const fila = i + 2;
      const numFactura = txt(f["N° factura"]);
      const fecha = fechaISO(f["Fecha"]);
      const proveedorNombre = txt(f["Proveedor"]);
      const base = num(f["Base gravable"]);
      const tarifaIva = num(f["Tarifa IVA %"]);
      if (!numFactura) { errores.push({ fila, mensaje: "Falta el N° de factura." }); continue; }
      if (!fecha) { errores.push({ fila, mensaje: "Fecha inválida (usa AAAA-MM-DD)." }); continue; }
      if (!proveedorNombre) { errores.push({ fila, mensaje: "Falta el proveedor." }); continue; }
      if (base <= 0) { errores.push({ fila, mensaje: "La base gravable debe ser mayor a cero." }); continue; }

      const totalIva = Math.round(base * (tarifaIva / 100) * 100) / 100;
      const rf = num(f["ReteFuente"]);
      const riva = num(f["ReteIVA"]);
      const rica = num(f["ReteICA"]);
      const totalRetenciones = rf + riva + rica;
      const totalBruto = base + totalIva;
      const totalAPagar = totalBruto - totalRetenciones;
      try {
        await prisma.compra.create({
          data: {
            usuarioId: uid,
            numFactura,
            fecha,
            proveedorNombre,
            proveedorNit: txt(f["NIT proveedor"]) || null,
            subtotal: base,
            totalDescuentos: 0,
            totalIva,
            totalRetenciones,
            totalBruto,
            totalAPagar,
            retenciones: {
              retefuente: { activa: rf > 0, valor: rf },
              reteiva: { activa: riva > 0, valor: riva },
              reteica: { activa: rica > 0, valor: rica },
            },
            observaciones: "Importada desde Excel",
            items: {
              create: [
                {
                  descripcion: "Carga masiva (Excel)",
                  cantidad: 1,
                  precioUnitario: base,
                  descuento: 0,
                  iva: tarifaIva,
                  base,
                  subtotalItem: totalBruto,
                },
              ],
            },
          },
        });
        creados++;
      } catch {
        errores.push({ fila, mensaje: `No se pudo guardar la compra ${numFactura}.` });
      }
    }
    return { creados, errores };
  },
};

// ====================== VENTAS (facturas) — solo exportar ======================
const ventas = {
  hoja: "Ventas",
  soportaImport: false,
  columnas: [
    { key: "numeroCompleto", header: "N°", width: 14 },
    { key: "fecha", header: "Fecha", width: 14 },
    { key: "cliente", header: "Cliente", width: 30 },
    { key: "documento", header: "NIT/Documento", width: 18 },
    { key: "estado", header: "Estado", width: 12 },
    { key: "subtotal", header: "Subtotal", width: 16 },
    { key: "descuentos", header: "Descuentos", width: 14 },
    { key: "iva", header: "IVA", width: 14 },
    { key: "reteFuente", header: "ReteFuente", width: 14 },
    { key: "total", header: "Total a cobrar", width: 16 },
    { key: "formaPago", header: "Forma de pago", width: 14 },
  ],
  async exportar(uid) {
    const rows = await prisma.factura.findMany({ where: { usuarioId: uid }, orderBy: { createdAt: "desc" } });
    return rows.map((f) => ({
      numeroCompleto: f.numeroCompleto,
      fecha: f.fecha,
      cliente: f.clienteNombre,
      documento: f.clienteNumeroDocumento || "",
      estado: f.estado === "anulada" ? "Anulada" : "Emitida",
      subtotal: Number(f.subtotal),
      descuentos: Number(f.totalDescuentos),
      iva: Number(f.iva),
      reteFuente: Number(f.retenciones),
      total: Number(f.totalACobrar),
      formaPago: f.formaPago || "",
    }));
  },
};

export const REGISTRO = { productos, clientes, compras, ventas };
export const MODULOS = Object.keys(REGISTRO);
