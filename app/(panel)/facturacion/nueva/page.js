"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listarClientes } from "@/lib/clientesApi";
import { listarProductos } from "@/lib/productosApi";
import { emitirFactura } from "@/lib/facturasApi";
import { obtenerConfig } from "@/lib/configFacturacionApi";
import { calcularFactura } from "@/lib/facturaCalc";
import { hoyBogota } from "@/lib/fechas";
import styles from "./nueva.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

let lineId = 0;

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  // undefined = cargando · null = no hay configuración · objeto = configurada
  const [config, setConfig] = useState(undefined);
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState([]); // {lineId, productoId, cantidad, descuentoPorcentaje}
  const [addProd, setAddProd] = useState("");
  const [fecha, setFecha] = useState(hoyBogota());
  const [formaPago, setFormaPago] = useState("Contado");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [emitiendo, setEmitiendo] = useState(false);

  useEffect(() => {
    listarClientes().then(setClientes);
    listarProductos().then(setProductos);
    // La configuración define si el emisor cobra IVA: sin esto la vista previa mostraría un
    // total distinto al que el servidor va a emitir.
    obtenerConfig().then(setConfig);
  }, []);

  const productosPorId = useMemo(
    () => Object.fromEntries(productos.map((p) => [p.id, p])),
    [productos]
  );
  const cliente = clientes.find((c) => c.id === clienteId) || null;

  const calc = useMemo(() => {
    if (!cliente || lineas.length === 0 || !config) return null;
    try {
      return calcularFactura({
        cliente,
        productosPorId,
        items: lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          descuentoPorcentaje: l.descuentoPorcentaje,
        })),
        emisorResponsableIva: !!config.responsableIva,
      });
    } catch {
      // p. ej. concepto de retención inválido: el servidor lo rechaza con un mensaje claro
      return null;
    }
  }, [cliente, productosPorId, lineas, config]);

  function agregarProducto(id) {
    if (!id) return;
    setLineas((ls) => [
      ...ls,
      { lineId: ++lineId, productoId: id, cantidad: 1, descuentoPorcentaje: 0 },
    ]);
    setAddProd("");
  }
  function actualizarLinea(lid, campo, valor) {
    setLineas((ls) => ls.map((l) => (l.lineId === lid ? { ...l, [campo]: valor } : l)));
  }
  function quitarLinea(lid) {
    setLineas((ls) => ls.filter((l) => l.lineId !== lid));
  }

  async function emitir() {
    setError("");
    if (!clienteId) return setError("Seleccione un cliente.");
    if (lineas.length === 0) return setError("Agregue al menos un producto.");
    setEmitiendo(true);
    const res = await emitirFactura({
      clienteId,
      items: lineas.map((l) => ({
        productoId: l.productoId,
        cantidad: Number(l.cantidad) || 0,
        descuentoPorcentaje: Number(l.descuentoPorcentaje) || 0,
      })),
      fecha,
      formaPago,
      observaciones,
    });
    setEmitiendo(false);
    if (res.error) return setError(res.error);
    router.push("/facturacion");
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <button className={styles.back} onClick={() => router.push("/facturacion")}>←</button>
        <div>
          <h1>Nueva Factura</h1>
          <p>Emite una factura de venta</p>
        </div>
      </header>

      {error && <div className="mensaje-error">{error}</div>}
      {config === null && (
        <div className="mensaje-error">
          Aún no has configurado la facturación (resolución DIAN). Ve a Configuración → Config.
          Facturación antes de emitir.
        </div>
      )}
      {config && !config.responsableIva && (
        <div className={styles.aviso}>
          No eres <strong>responsable de IVA</strong>: esta factura se emitirá <strong>sin IVA</strong>,
          aunque los productos tengan tarifa.
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.left}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Cliente</h2>
            <select
              className={styles.select}
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Seleccione un cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreCompleto} — {c.tipo === "natural" ? c.numeroDocumento : `NIT ${c.nit}`}
                </option>
              ))}
            </select>
            {cliente && (
              <div className={styles.clienteInfo}>
                {cliente.esAgenteRetenedor && <span className="badge-estado activo">Agente retenedor</span>}
                {cliente.esAutorretenedor && <span className={styles.autorret}>Autorretenedor</span>}
                {!cliente.esAgenteRetenedor && (
                  <span className={styles.muted}>No aplica retención en la factura</span>
                )}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Productos</h2>
            <select
              className={styles.select}
              value={addProd}
              onChange={(e) => agregarProducto(e.target.value)}
            >
              <option value="">+ Agregar producto...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descripcion} ({fmt(p.precioVenta)})
                </option>
              ))}
            </select>

            {lineas.length === 0 ? (
              <p className={styles.vacio}>Aún no hay productos en la factura.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Desc.%</th>
                      <th>Base</th>
                      <th>IVA</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l) => {
                      const p = productosPorId[l.productoId];
                      const linea = calc?.lineas.find((_, i) => lineas[i].lineId === l.lineId);
                      return (
                        <tr key={l.lineId}>
                          <td>
                            <div className={styles.prodNombre}>{p?.descripcion}</div>
                            <div className={styles.prodSub}>{p?.codigo} · {fmt(p?.precioVenta)}</div>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className={styles.mini}
                              value={l.cantidad}
                              onChange={(e) => actualizarLinea(l.lineId, "cantidad", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className={styles.mini}
                              value={l.descuentoPorcentaje}
                              onChange={(e) => actualizarLinea(l.lineId, "descuentoPorcentaje", e.target.value)}
                            />
                          </td>
                          <td>{fmt(linea?.base)}</td>
                          <td>{fmt(linea?.valorIva)}</td>
                          <td>
                            <button className={styles.rm} onClick={() => quitarLinea(l.lineId)}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Detalles</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha de emisión</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Forma de pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                  <option value="Contado">Contado</option>
                  <option value="Crédito">Crédito</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Observaciones</label>
              <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </section>
        </div>

        <aside className={styles.resumen}>
          <h2 className={styles.cardTitle}>Resumen</h2>
          <Row label="Subtotal" valor={fmt(calc?.subtotal)} />
          {calc?.totalDescuentos > 0 && <Row label="Descuentos" valor={`-${fmt(calc.totalDescuentos)}`} />}
          <Row label="IVA" valor={fmt(calc?.totalIva)} />
          {calc?.totalRetenciones > 0 && (
            <Row label="ReteFuente" valor={`-${fmt(calc.totalRetenciones)}`} verde />
          )}
          <div className={styles.total}>
            <span>Total a cobrar</span>
            <strong>{fmt(calc?.totalACobrar)}</strong>
          </div>
          <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={emitir} disabled={emitiendo}>
            {emitiendo ? "Emitiendo..." : "Emitir factura"}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, valor, verde }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <span style={verde ? { color: "var(--success)" } : undefined}>{valor}</span>
    </div>
  );
}
