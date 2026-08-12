"use client";

import { useEffect, useMemo, useState } from "react";
import { listarCompras, crearCompra, actualizarCompra, eliminarCompra, obtenerCompra } from "@/lib/comprasApi";
import ImportExport from "@/components/ImportExport";
import { hoyBogota } from "@/lib/fechas";
import styles from "./compras.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const TIPOS_DOC = ["Factura", "Documento equivalente", "Cuenta de cobro"];
const CONDICIONES = ["Contado", "Crédito"];
const MEDIOS = ["Efectivo", "Transferencia", "Tarjeta", "Cheque"];

// Unidad de cada retención. El ICA se expresa POR MIL (‰), no en porcentaje: es la tarifa
// municipal. Debe coincidir con `RETENCIONES` de lib/compraValidation.js, que es la autoridad.
const UNIDAD_RETENCION = { retefuente: "%", reteiva: "%", reteica: "‰" };

// Vista previa. El valor definitivo lo recalcula el servidor; esto solo evita que el usuario
// vea un total distinto al que se guarda.
function valorRetencion(r, base, key) {
  if (!r?.activa) return 0;
  const divisor = UNIDAD_RETENCION[key] === "‰" ? 1000 : 100;
  return base * ((Number(r.tarifa) || 0) / divisor);
}

export default function ComprasPage() {
  const [compras, setCompras] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {compra}
  const [detalle, setDetalle] = useState(null);
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setCompras(await listarCompras());
  }
  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const l = compras || [];
    const proveedores = new Set(l.map((c) => c.proveedorNit || c.proveedorNombre).filter(Boolean));
    return {
      total: l.length,
      valor: l.reduce((s, c) => s + Number(c.totalAPagar || 0), 0),
      proveedores: proveedores.size,
    };
  }, [compras]);

  const filtradas = useMemo(() => {
    const l = compras || [];
    const q = search.toLowerCase();
    return l.filter((c) => [c.numFactura, c.proveedorNombre, c.proveedorNit].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [compras, search]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function guardar(payload, id) {
    const res = id ? await actualizarCompra(id, payload) : await crearCompra(payload);
    if (res.error) return res;
    await recargar();
    setModal(null);
    notificar(id ? "Compra actualizada" : "Compra registrada");
    return {};
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar la compra ${c.numFactura}?`)) return;
    const ok = await eliminarCompra(c.id);
    if (ok) {
      await recargar();
      notificar("Compra eliminada");
    } else notificar("No se pudo eliminar", "error");
  }

  async function editar(c) {
    const full = await obtenerCompra(c.id);
    if (full) setModal({ compra: full });
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Compras</h1>
          <p>Facturas de proveedores</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ImportExport modulo="compras" soportaImport onImported={recargar} />
          <button className="btn-primary" onClick={() => setModal({ compra: null })}>+ Nueva compra</button>
        </div>
      </header>

      <section className={styles.stats}>
        <StatCard label="Compras" valor={stats.total} />
        <StatCard label="Valor total" valor={fmt(stats.valor)} chico />
        <StatCard label="Proveedores" valor={stats.proveedores} />
      </section>

      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Buscar por factura o proveedor..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {compras === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay compras registradas.</p>
          <button className="btn-secondary" onClick={() => setModal({ compra: null })}>Registrar la primera</button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Factura</th><th>Fecha</th><th>Proveedor</th><th>Subtotal</th><th>IVA</th><th>Retención</th><th>Total a pagar</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.numFactura}</strong></td>
                  <td>{c.fecha}</td>
                  <td>
                    <div className={styles.nombre}>{c.proveedorNombre}</div>
                    {c.proveedorNit && <div className={styles.sub}>NIT {c.proveedorNit}</div>}
                  </td>
                  <td>{fmt(c.subtotal)}</td>
                  <td>{fmt(c.totalIva)}</td>
                  <td className={Number(c.totalRetenciones) > 0 ? styles.ret : ""}>
                    {Number(c.totalRetenciones) > 0 ? `−${fmt(c.totalRetenciones)}` : "—"}
                  </td>
                  <td className={styles.monto}><strong>{fmt(c.totalAPagar)}</strong></td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => setDetalle(c)}>Ver</button>
                      <button onClick={() => editar(c)}>Editar</button>
                      <button className={styles.del} onClick={() => eliminar(c)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <CompraModal
          inicial={modal.compra}
          onClose={() => setModal(null)}
          onGuardar={(payload) => guardar(payload, modal.compra?.id)}
        />
      )}
      {detalle && <CompraDetalle compra={detalle} onClose={() => setDetalle(null)} />}
      {notif && <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>}
    </div>
  );
}

function StatCard({ label, valor, chico }) {
  return (
    <div className={styles.stat}>
      <span className={chico ? styles.statValorChico : styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

const itemVacio = () => ({ descripcion: "", cantidad: 1, precioUnitario: 0, descuento: 0, iva: 19 });

function estadoInicial(c) {
  return {
    numFactura: c?.numFactura || "",
    fecha: c?.fecha || hoyBogota(),
    fechaVencimiento: c?.fechaVencimiento || "",
    tipoDoc: c?.tipoDoc || "Factura",
    condicionPago: c?.condicionPago || "Contado",
    medioPago: c?.medioPago || "Transferencia",
    proveedorNombre: c?.proveedorNombre || "",
    proveedorNit: c?.proveedorNit || "",
    proveedorTel: c?.proveedorTel || "",
    observaciones: c?.observaciones || "",
    items: c?.items?.length
      ? c.items.map((i) => ({ descripcion: i.descripcion, cantidad: Number(i.cantidad), precioUnitario: Number(i.precioUnitario), descuento: Number(i.descuento), iva: Number(i.iva) }))
      : [itemVacio()],
    retenciones: {
      retefuente: { activa: c?.retenciones?.retefuente?.activa || false, tarifa: c?.retenciones?.retefuente?.tarifa || 0 },
      reteiva: { activa: c?.retenciones?.reteiva?.activa || false, tarifa: c?.retenciones?.reteiva?.tarifa || 0 },
      reteica: { activa: c?.retenciones?.reteica?.activa || false, tarifa: c?.retenciones?.reteica?.tarifa || 0 },
    },
  };
}

function CompraModal({ inicial, onClose, onGuardar }) {
  const [form, setForm] = useState(() => estadoInicial(inicial));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }));

  const calc = useMemo(() => {
    let subtotal = 0, totalIva = 0;
    for (const i of form.items) {
      const neto = (Number(i.cantidad) || 0) * (Number(i.precioUnitario) || 0) * (1 - (Number(i.descuento) || 0) / 100);
      subtotal += neto;
      totalIva += neto * ((Number(i.iva) || 0) / 100);
    }
    const bruto = subtotal + totalIva;
    const r = form.retenciones;
    const vRF = valorRetencion(r.retefuente, subtotal, "retefuente");
    const vRI = valorRetencion(r.reteiva, totalIva, "reteiva");
    const vRC = valorRetencion(r.reteica, subtotal, "reteica");
    const totalRet = vRF + vRI + vRC;
    return { subtotal, totalIva, bruto, totalRet, totalAPagar: bruto - totalRet };
  }, [form]);

  function setItem(idx, campo, valor) {
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)) }));
  }
  function setRet(key, campo, valor) {
    setForm((f) => ({ ...f, retenciones: { ...f.retenciones, [key]: { ...f.retenciones[key], [campo]: valor } } }));
  }

  async function submit() {
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setTimeout(() => setError(""), 4000);
    }
  }

  const RetRow = ({ k, label, base }) => (
    <div className={styles.retRow}>
      <label>
        <input type="checkbox" checked={form.retenciones[k].activa} onChange={(e) => setRet(k, "activa", e.target.checked)} /> {label}
      </label>
      {form.retenciones[k].activa && (
        <>
          <input
            type="number"
            min="0"
            step={UNIDAD_RETENCION[k] === "‰" ? "0.01" : "0.1"}
            className={styles.retTarifa}
            value={form.retenciones[k].tarifa}
            onChange={(e) => setRet(k, "tarifa", e.target.value)}
            placeholder={UNIDAD_RETENCION[k]}
            aria-label={`Tarifa de ${label} en ${UNIDAD_RETENCION[k] === "‰" ? "por mil" : "porcentaje"}`}
          />
          <span className={styles.retVal}>−{fmt(valorRetencion(form.retenciones[k], base, k))}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>{inicial ? "Editar Compra" : "Nueva Compra"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <h3 className={styles.grupo}>Proveedor</h3>
          <div className="form-row">
            <div className="form-group"><label>Nombre / Razón social *</label><input value={form.proveedorNombre} onChange={(e) => set("proveedorNombre", e.target.value)} /></div>
            <div className="form-group"><label>NIT</label><input value={form.proveedorNit} onChange={(e) => set("proveedorNit", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Teléfono</label><input value={form.proveedorTel} onChange={(e) => set("proveedorTel", e.target.value)} /></div>
            <div className="form-group"><label>Tipo de documento</label>
              <select value={form.tipoDoc} onChange={(e) => set("tipoDoc", e.target.value)}>{TIPOS_DOC.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
          </div>

          <h3 className={styles.grupo}>Documento</h3>
          <div className="form-row">
            <div className="form-group"><label>N° factura proveedor *</label><input value={form.numFactura} onChange={(e) => set("numFactura", e.target.value)} /></div>
            <div className="form-group"><label>Fecha *</label><input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Vencimiento</label><input type="date" value={form.fechaVencimiento} onChange={(e) => set("fechaVencimiento", e.target.value)} /></div>
            <div className="form-group"><label>Condición de pago</label>
              <select value={form.condicionPago} onChange={(e) => set("condicionPago", e.target.value)}>{CONDICIONES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
          </div>

          <h3 className={styles.grupo}>Ítems</h3>
          <div className={styles.itemsHead}><span>Descripción</span><span>Cant.</span><span>P. Unit.</span><span>Dto%</span><span>IVA%</span><span></span></div>
          {form.items.map((it, idx) => (
            <div key={idx} className={styles.itemRow}>
              <input value={it.descripcion} onChange={(e) => setItem(idx, "descripcion", e.target.value)} placeholder="Descripción" />
              <input type="number" min="0" value={it.cantidad} onChange={(e) => setItem(idx, "cantidad", e.target.value)} />
              <input type="number" min="0" value={it.precioUnitario} onChange={(e) => setItem(idx, "precioUnitario", e.target.value)} />
              <input type="number" min="0" max="100" value={it.descuento} onChange={(e) => setItem(idx, "descuento", e.target.value)} />
              <input type="number" min="0" value={it.iva} onChange={(e) => setItem(idx, "iva", e.target.value)} />
              <button className={styles.rm} onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} disabled={form.items.length === 1}>✕</button>
            </div>
          ))}
          <button className={styles.addItem} onClick={() => setForm((f) => ({ ...f, items: [...f.items, itemVacio()] }))}>+ Agregar ítem</button>

          <h3 className={styles.grupo}>Retenciones</h3>
          <RetRow k="retefuente" label="ReteFuente (% sobre subtotal)" base={calc.subtotal} />
          <RetRow k="reteiva" label="ReteIVA (% sobre IVA)" base={calc.totalIva} />
          <RetRow k="reteica" label="ReteICA (‰ sobre subtotal)" base={calc.subtotal} />

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Observaciones</label>
            <input value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
          </div>

          <div className={styles.totales}>
            <div className={styles.totRow}><span>Subtotal</span><span>{fmt(calc.subtotal)}</span></div>
            <div className={styles.totRow}><span>IVA</span><span>{fmt(calc.totalIva)}</span></div>
            {calc.totalRet > 0 && <div className={styles.totRow}><span>Retenciones</span><span className={styles.ret}>−{fmt(calc.totalRet)}</span></div>}
            <div className={styles.totFinal}><span>Total a pagar</span><strong>{fmt(calc.totalAPagar)}</strong></div>
          </div>

          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={guardando}>{guardando ? "Guardando..." : "Guardar compra"}</button>
        </div>
      </div>
    </div>
  );
}

function CompraDetalle({ compra: c, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2>Compra {c.numFactura}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={styles.detGrid}>
            <div><div className={styles.detLabel}>Proveedor</div><strong>{c.proveedorNombre}</strong><div className={styles.sub}>{c.proveedorNit ? `NIT ${c.proveedorNit}` : ""}</div></div>
            <div><div className={styles.detLabel}>Fecha</div><strong>{c.fecha}</strong></div>
          </div>
          <div className={styles.totales}>
            <div className={styles.totRow}><span>Subtotal</span><span>{fmt(c.subtotal)}</span></div>
            <div className={styles.totRow}><span>IVA</span><span>{fmt(c.totalIva)}</span></div>
            {Number(c.totalRetenciones) > 0 && <div className={styles.totRow}><span>Retenciones</span><span className={styles.ret}>−{fmt(c.totalRetenciones)}</span></div>}
            <div className={styles.totFinal}><span>Total a pagar</span><strong>{fmt(c.totalAPagar)}</strong></div>
          </div>
          {c.observaciones && <p className={styles.sub} style={{ marginTop: 12 }}>Obs: {c.observaciones}</p>}
        </div>
      </div>
    </div>
  );
}
