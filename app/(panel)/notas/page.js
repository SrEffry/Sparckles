"use client";

import { useEffect, useMemo, useState } from "react";
import { listarNotas, obtenerNota, crearNota, eliminarNota } from "@/lib/notasApi";
import { listarFacturas } from "@/lib/facturasApi";
import { motivosDe } from "@/lib/motivosNota";
import { generarNotaPDF } from "@/lib/pdf/notaPdf";
import styles from "./notas.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function NotasPage() {
  const [notas, setNotas] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setNotas(await listarNotas());
  }
  useEffect(() => {
    recargar();
    listarFacturas().then((f) => setFacturas(f.filter((x) => x.estado === "emitida")));
  }, []);

  const stats = useMemo(() => {
    const l = notas || [];
    return {
      credito: l.filter((n) => n.tipo === "credito").length,
      debito: l.filter((n) => n.tipo === "debito").length,
      total: l.reduce((s, n) => s + Number(n.totalNota || 0), 0),
    };
  }, [notas]);

  const filtradas = useMemo(() => {
    let l = notas || [];
    const q = search.toLowerCase();
    if (q) l = l.filter((n) => [n.numero, n.facturaRef, n.motivoLabel].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
    if (filtroTipo) l = l.filter((n) => n.tipo === filtroTipo);
    return l;
  }, [notas, search, filtroTipo]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function verDetalle(id) {
    const n = await obtenerNota(id);
    if (n) setDetalle(n);
  }

  async function eliminar(n) {
    if (!confirm(`¿Eliminar la nota ${n.numero}? Se revertirá su efecto en la factura.`)) return;
    const ok = await eliminarNota(n.id);
    if (ok) {
      await recargar();
      notificar("Nota eliminada");
    } else notificar("No se pudo eliminar", "error");
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Notas Débito / Crédito</h1>
          <p>Ajustes a facturas según motivos DIAN</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Nueva nota</button>
      </header>

      <section className={styles.stats}>
        <StatCard label="Notas Crédito" valor={stats.credito} />
        <StatCard label="Notas Débito" valor={stats.debito} />
        <StatCard label="Valor total" valor={fmt(stats.total)} chico />
      </section>

      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Buscar por número, factura o motivo..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.filtro} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos</option>
          <option value="credito">Nota Crédito</option>
          <option value="debito">Nota Débito</option>
        </select>
      </div>

      {notas === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay notas registradas.</p>
          <button className="btn-secondary" onClick={() => setModalOpen(true)}>Crear la primera</button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Factura</th><th>Motivo</th><th>Valor</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtradas.map((n) => (
                <tr key={n.id}>
                  <td><strong>{n.numero}</strong></td>
                  <td>
                    <span className={n.tipo === "credito" ? styles.badgeNC : styles.badgeND}>
                      {n.tipo === "credito" ? "Crédito" : "Débito"}
                    </span>
                  </td>
                  <td>{n.fecha}</td>
                  <td>{n.facturaRef || "—"}</td>
                  <td className={styles.motivo}>{n.motivoLabel}</td>
                  <td className={n.tipo === "credito" ? styles.valNC : styles.valND}>
                    <strong>{n.tipo === "credito" ? "−" : "+"}{fmt(n.totalNota)}</strong>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => verDetalle(n.id)}>Ver</button>
                      <button className={styles.del} onClick={() => eliminar(n)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <NotaModal
          facturas={facturas}
          onClose={() => setModalOpen(false)}
          onGuardar={async (payload) => {
            const res = await crearNota(payload);
            if (res.error) return res;
            await recargar();
            setModalOpen(false);
            notificar(`Nota ${res.nota.numero} creada`);
            return {};
          }}
        />
      )}
      {detalle && <NotaDetalle nota={detalle} onClose={() => setDetalle(null)} />}
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

function NotaModal({ facturas, onClose, onGuardar }) {
  const [tipo, setTipo] = useState("credito");
  const [facturaId, setFacturaId] = useState("");
  const [motivoCodigo, setMotivoCodigo] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([itemVacio()]);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const motivos = motivosDe(tipo);
  const facturaSel = facturas.find((f) => f.id === facturaId);

  const totales = useMemo(() => {
    let subtotal = 0, totalIva = 0;
    for (const i of items) {
      const neto = (Number(i.cantidad) || 0) * (Number(i.precioUnitario) || 0) * (1 - (Number(i.descuento) || 0) / 100);
      subtotal += neto;
      totalIva += neto * ((Number(i.iva) || 0) / 100);
    }
    return { subtotal, totalIva, total: subtotal + totalIva };
  }, [items]);

  function setItem(idx, campo, valor) {
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  async function submit() {
    setGuardando(true);
    const res = await onGuardar({ tipo, facturaId: facturaId || null, motivoCodigo, fecha, items, observaciones });
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setTimeout(() => setError(""), 4000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h2>Nueva Nota</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={styles.tipoToggle}>
            <label className={tipo === "credito" ? styles.tipoOn : ""}>
              <input type="radio" checked={tipo === "credito"} onChange={() => { setTipo("credito"); setMotivoCodigo(""); }} /> Nota Crédito
            </label>
            <label className={tipo === "debito" ? styles.tipoOn : ""}>
              <input type="radio" checked={tipo === "debito"} onChange={() => { setTipo("debito"); setMotivoCodigo(""); }} /> Nota Débito
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Factura relacionada</label>
              <select value={facturaId} onChange={(e) => setFacturaId(e.target.value)}>
                <option value="">Sin factura</option>
                {facturas.map((f) => (
                  <option key={f.id} value={f.id}>{f.numeroCompleto} — {f.clienteNombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          {facturaSel && <p className={styles.hint}>Cliente: {facturaSel.clienteNombre}</p>}

          <div className="form-group">
            <label>Motivo DIAN *</label>
            <select value={motivoCodigo} onChange={(e) => setMotivoCodigo(e.target.value)}>
              <option value="">Seleccione motivo...</option>
              {motivos.map((m) => (
                <option key={m.codigo} value={m.codigo}>{m.codigo}. {m.label}</option>
              ))}
            </select>
          </div>

          <label className="empresa-field-label">Ítems</label>
          <div className={styles.itemsHead}>
            <span>Descripción</span><span>Cant.</span><span>P. Unit.</span><span>Dto%</span><span>IVA%</span><span></span>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className={styles.itemRow}>
              <input value={it.descripcion} onChange={(e) => setItem(idx, "descripcion", e.target.value)} placeholder="Descripción" />
              <input type="number" min="0" value={it.cantidad} onChange={(e) => setItem(idx, "cantidad", e.target.value)} />
              <input type="number" min="0" value={it.precioUnitario} onChange={(e) => setItem(idx, "precioUnitario", e.target.value)} />
              <input type="number" min="0" max="100" value={it.descuento} onChange={(e) => setItem(idx, "descuento", e.target.value)} />
              <input type="number" min="0" value={it.iva} onChange={(e) => setItem(idx, "iva", e.target.value)} />
              <button className={styles.rm} onClick={() => setItems((its) => its.filter((_, i) => i !== idx))} disabled={items.length === 1}>✕</button>
            </div>
          ))}
          <button className={styles.addItem} onClick={() => setItems((its) => [...its, itemVacio()])}>+ Agregar ítem</button>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Observaciones</label>
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>

          <div className={styles.totales}>
            <div className={styles.totRow}><span>Subtotal</span><span>{fmt(totales.subtotal)}</span></div>
            <div className={styles.totRow}><span>IVA</span><span>{fmt(totales.totalIva)}</span></div>
            <div className={styles.totFinal}><span>Total {tipo === "credito" ? "Nota Crédito" : "Nota Débito"}</span><strong>{fmt(totales.total)}</strong></div>
          </div>

          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={guardando}>{guardando ? "Guardando..." : "Crear nota"}</button>
        </div>
      </div>
    </div>
  );
}

function NotaDetalle({ nota: n, onClose }) {
  const signo = n.tipo === "credito" ? "−" : "+";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2>{n.numero}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={styles.detGrid}>
            <div><div className={styles.detLabel}>Tipo</div><strong>{n.tipo === "credito" ? "Nota Crédito" : "Nota Débito"}</strong></div>
            <div><div className={styles.detLabel}>Factura</div><strong>{n.facturaRef || "—"}</strong></div>
            <div><div className={styles.detLabel}>Motivo</div><strong>{n.motivoLabel}</strong></div>
            <div><div className={styles.detLabel}>Cliente</div><strong>{n.clienteNombre || "—"}</strong></div>
          </div>
          <table className={styles.itemsTable}>
            <thead><tr><th>Descripción</th><th>Cant.</th><th>IVA%</th><th>Subtotal</th></tr></thead>
            <tbody>
              {n.items?.map((it) => (
                <tr key={it.id}><td>{it.descripcion}</td><td>{Number(it.cantidad)}</td><td>{Number(it.iva)}%</td><td>{fmt(it.subtotalItem)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className={styles.totales}>
            <div className={styles.totRow}><span>Subtotal</span><span>{fmt(n.subtotal)}</span></div>
            <div className={styles.totRow}><span>IVA</span><span>{fmt(n.totalIva)}</span></div>
            <div className={styles.totFinal}><span>Total</span><strong>{signo}{fmt(n.totalNota)}</strong></div>
          </div>
          {n.observaciones && <p className={styles.hint}>Obs: {n.observaciones}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={() => generarNotaPDF(n)}>Descargar PDF</button>
        </div>
      </div>
    </div>
  );
}
