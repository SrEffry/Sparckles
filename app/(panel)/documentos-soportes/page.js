"use client";

import { useEffect, useMemo, useState } from "react";
import { listarSoportes, crearSoporte, anularSoporte } from "@/lib/soportesApi";
import styles from "./soportes.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function SoportesPage() {
  const [soportes, setSoportes] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setSoportes(await listarSoportes());
  }
  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const l = (soportes || []).filter((s) => s.estado === "Emitido");
    return {
      total: (soportes || []).length,
      bruto: l.reduce((a, s) => a + Number(s.bruto || 0), 0),
      neto: l.reduce((a, s) => a + Number(s.neto || 0), 0),
    };
  }, [soportes]);

  const filtrados = useMemo(() => {
    const l = soportes || [];
    const q = search.toLowerCase();
    return l.filter((s) => [s.numero, s.proveedorNombre, s.concepto].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [soportes, search]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function anular(s) {
    if (!confirm(`¿Anular el documento ${s.numero}?`)) return;
    const res = await anularSoporte(s.id);
    if (res.error) return notificar(res.error, "error");
    await recargar();
    notificar("Documento anulado");
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Documentos Soporte</h1>
          <p>Adquisiciones a no obligados a facturar (DIAN)</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Nuevo documento</button>
      </header>

      <section className={styles.stats}>
        <StatCard label="Documentos" valor={stats.total} />
        <StatCard label="Valor bruto (emitidos)" valor={fmt(stats.bruto)} chico />
        <StatCard label="Neto a pagar" valor={fmt(stats.neto)} chico />
      </section>

      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Buscar por número, proveedor o concepto..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {soportes === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay documentos soporte.</p>
          <button className="btn-secondary" onClick={() => setModalOpen(true)}>Generar el primero</button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Concepto</th><th>Bruto</th><th>Retenciones</th><th>Neto</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {filtrados.map((s) => (
                <tr key={s.id} className={s.estado === "Anulado" ? styles.anulada : ""}>
                  <td><strong>{s.numero}</strong></td>
                  <td>{s.fecha}</td>
                  <td>
                    <div className={styles.nombre}>{s.proveedorNombre}</div>
                    {s.proveedorDocumento && <div className={styles.sub}>{s.proveedorDocumento}</div>}
                  </td>
                  <td className={styles.concepto}>{s.concepto}</td>
                  <td>{fmt(s.bruto)}</td>
                  <td className={styles.ret}>{Number(s.reteFuente) + Number(s.reteIca) > 0 ? `−${fmt(Number(s.reteFuente) + Number(s.reteIca))}` : "—"}</td>
                  <td className={styles.monto}><strong>{fmt(s.neto)}</strong></td>
                  <td><span className={`badge-estado ${s.estado === "Anulado" ? "inactivo" : "activo"}`}>{s.estado}</span></td>
                  <td>{s.estado === "Emitido" && <button className={styles.del} onClick={() => anular(s)}>Anular</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <SoporteModal
          onClose={() => setModalOpen(false)}
          onGuardar={async (payload) => {
            const res = await crearSoporte(payload);
            if (res.error) return res;
            await recargar();
            setModalOpen(false);
            notificar(`Documento ${res.soporte.numero} generado`);
            return {};
          }}
        />
      )}
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

function SoporteModal({ onClose, onGuardar }) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    proveedorNombre: "",
    proveedorDocumento: "",
    concepto: "",
    bruto: "",
    porcReteFuente: 0,
    porcReteIca: 0,
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }));

  const calc = useMemo(() => {
    const bruto = Number(form.bruto) || 0;
    const reteFuente = bruto * ((Number(form.porcReteFuente) || 0) / 100);
    const reteIca = bruto * ((Number(form.porcReteIca) || 0) / 1000);
    return { bruto, reteFuente, reteIca, neto: bruto - reteFuente - reteIca };
  }, [form]);

  async function submit() {
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setTimeout(() => setError(""), 4000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Documento Soporte</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label>Proveedor (no obligado a facturar) *</label><input value={form.proveedorNombre} onChange={(e) => set("proveedorNombre", e.target.value)} /></div>
            <div className="form-group"><label>Documento (CC/NIT)</label><input value={form.proveedorDocumento} onChange={(e) => set("proveedorDocumento", e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label>Concepto *</label>
            <input value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Descripción del bien o servicio adquirido" />
          </div>
          <div className="form-row">
            <div className="form-group"><label>Fecha</label><input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
            <div className="form-group"><label>Valor bruto *</label><input type="number" min="0" value={form.bruto} onChange={(e) => set("bruto", e.target.value)} placeholder="0" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>ReteFuente (%)</label><input type="number" min="0" step="0.1" value={form.porcReteFuente} onChange={(e) => set("porcReteFuente", e.target.value)} /></div>
            <div className="form-group"><label>ReteICA (por mil ‰)</label><input type="number" min="0" step="0.1" value={form.porcReteIca} onChange={(e) => set("porcReteIca", e.target.value)} /></div>
          </div>

          <div className={styles.totales}>
            <div className={styles.totRow}><span>Valor bruto</span><span>{fmt(calc.bruto)}</span></div>
            <div className={styles.totRow}><span>(−) ReteFuente</span><span className={styles.ret}>−{fmt(calc.reteFuente)}</span></div>
            <div className={styles.totRow}><span>(−) ReteICA</span><span className={styles.ret}>−{fmt(calc.reteIca)}</span></div>
            <div className={styles.totFinal}><span>Neto a pagar</span><strong>{fmt(calc.neto)}</strong></div>
          </div>

          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={guardando}>{guardando ? "Generando..." : "Generar documento"}</button>
        </div>
      </div>
    </div>
  );
}
