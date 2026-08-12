"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listarAsientos,
  obtenerAsiento,
  crearAsiento,
  anularAsiento,
  buscarCuentas,
} from "@/lib/asientosApi";
import { hoyBogota } from "@/lib/fechas";
import styles from "./asientos.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function AsientosPage() {
  const [asientos, setAsientos] = useState(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setAsientos(await listarAsientos());
  }
  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const l = asientos || [];
    return {
      total: l.length,
      registrados: l.filter((a) => a.estado === "registrado" && !a.anulado).length,
      borradores: l.filter((a) => a.estado === "borrador").length,
    };
  }, [asientos]);

  const filtrados = useMemo(() => {
    const l = asientos || [];
    const q = search.toLowerCase();
    return l.filter((a) => [a.numero, a.descripcion].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [asientos, search]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function verDetalle(id) {
    const a = await obtenerAsiento(id);
    if (a) setDetalle(a);
  }
  async function anular(a) {
    const motivo = prompt(`Motivo de anulación del asiento ${a.numero}:`);
    if (motivo === null) return;
    const res = await anularAsiento(a.id, motivo);
    if (res.error) return notificar(res.error, "error");
    await recargar();
    notificar("Asiento anulado");
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Asientos Contables</h1>
          <p>Registro de partida doble sobre el PUC</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Nuevo asiento</button>
      </header>

      <section className={styles.stats}>
        <StatCard label="Total asientos" valor={stats.total} />
        <StatCard label="Registrados" valor={stats.registrados} />
        <StatCard label="Borradores" valor={stats.borradores} />
      </section>

      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Buscar por número o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {asientos === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay asientos registrados.</p>
          <button className="btn-secondary" onClick={() => setModalOpen(true)}>Crear el primero</button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Número</th><th>Fecha</th><th>Descripción</th><th>Débitos</th><th>Créditos</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtrados.map((a) => (
                <tr key={a.id} className={a.anulado ? styles.anulada : ""}>
                  <td><strong>{a.numero}</strong></td>
                  <td>{a.fecha}</td>
                  <td className={styles.desc}>{a.descripcion}</td>
                  <td>{fmt(a.totalDebitos)}</td>
                  <td>{fmt(a.totalCreditos)}</td>
                  <td>
                    {a.anulado ? (
                      <span className="badge-estado inactivo">Anulado</span>
                    ) : a.estado === "borrador" ? (
                      <span className={styles.badgeBorr}>Borrador</span>
                    ) : (
                      <span className="badge-estado activo">Registrado</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => verDetalle(a.id)}>Ver</button>
                      {!a.anulado && <button className={styles.del} onClick={() => anular(a)}>Anular</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <AsientoModal
          onClose={() => setModalOpen(false)}
          onGuardar={async (payload) => {
            const res = await crearAsiento(payload);
            if (res.error) return res;
            await recargar();
            setModalOpen(false);
            notificar(`Asiento ${res.asiento.numero} guardado`);
            return {};
          }}
        />
      )}
      {detalle && <AsientoDetalle asiento={detalle} onClose={() => setDetalle(null)} />}
      {notif && <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>}
    </div>
  );
}

function StatCard({ label, valor }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

const movVacio = () => ({ cuenta: "", nombreCuenta: "", texto: "", debito: "", credito: "", tercero: "" });

function AsientoModal({ onClose, onGuardar }) {
  const [sector, setSector] = useState("comercial");
  const [fecha, setFecha] = useState(hoyBogota());
  const [descripcion, setDescripcion] = useState("");
  const [movs, setMovs] = useState([movVacio(), movVacio()]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const totales = useMemo(() => {
    let d = 0, c = 0;
    for (const m of movs) {
      d += Number(m.debito) || 0;
      c += Number(m.credito) || 0;
    }
    return { d, c, dif: Math.abs(d - c) };
  }, [movs]);
  const balanceado = totales.dif < 0.01 && (totales.d > 0 || totales.c > 0);

  function setMov(idx, campo, valor) {
    setMovs((ms) => ms.map((m, i) => (i === idx ? { ...m, [campo]: valor } : m)));
  }
  function seleccionarCuenta(idx, cuenta) {
    setMovs((ms) => ms.map((m, i) => (i === idx ? { ...m, cuenta: cuenta.codigo, nombreCuenta: cuenta.nombre, texto: `${cuenta.codigo} - ${cuenta.nombre}` } : m)));
  }

  async function guardar(estado) {
    setGuardando(true);
    const res = await onGuardar({ sector, fecha, descripcion, estado, movimientos: movs });
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setTimeout(() => setError(""), 5000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div className="modal-header">
          <h2>Nuevo Asiento</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>PUC (sector)</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="comercial">Comercial (NIIF)</option>
                <option value="esal">Sin ánimo de lucro (ESAL)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción *</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Concepto del asiento" />
          </div>

          <label className="empresa-field-label">Movimientos</label>
          <div className={styles.movHead}>
            <span>Cuenta (PUC)</span><span>Débito</span><span>Crédito</span><span>Tercero</span><span></span>
          </div>
          {movs.map((m, idx) => (
            <div key={idx} className={styles.movRow}>
              <CuentaPicker
                sector={sector}
                texto={m.texto}
                onTexto={(v) => setMov(idx, "texto", v)}
                onSelect={(cuenta) => seleccionarCuenta(idx, cuenta)}
              />
              <input type="number" min="0" value={m.debito} onChange={(e) => setMov(idx, "debito", e.target.value)} placeholder="0" />
              <input type="number" min="0" value={m.credito} onChange={(e) => setMov(idx, "credito", e.target.value)} placeholder="0" />
              <input value={m.tercero} onChange={(e) => setMov(idx, "tercero", e.target.value)} placeholder="Opcional" />
              <button className={styles.rm} onClick={() => setMovs((ms) => ms.filter((_, i) => i !== idx))} disabled={movs.length <= 2}>✕</button>
            </div>
          ))}
          <button className={styles.addItem} onClick={() => setMovs((ms) => [...ms, movVacio()])}>+ Agregar movimiento</button>

          <div className={styles.balance}>
            <div><span>Débitos</span><strong>{fmt(totales.d)}</strong></div>
            <div><span>Créditos</span><strong>{fmt(totales.c)}</strong></div>
            <div className={balanceado ? styles.ok : styles.bad}>
              <span>Diferencia</span><strong>{fmt(totales.dif)} {balanceado ? "✓" : ""}</strong>
            </div>
          </div>

          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => guardar("borrador")} disabled={guardando}>Guardar borrador</button>
          <button className="btn-primary" onClick={() => guardar("registrado")} disabled={guardando || !balanceado}>
            {guardando ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CuentaPicker({ sector, texto, onTexto, onSelect }) {
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(async () => {
      setResultados(await buscarCuentas(sector, texto.replace(/ - .*/, "")));
    }, 250);
    return () => clearTimeout(t);
  }, [texto, sector, abierto]);

  useEffect(() => {
    function fuera(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  return (
    <div className={styles.picker} ref={boxRef}>
      <input
        value={texto}
        onChange={(e) => {
          onTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar cuenta..."
      />
      {abierto && resultados.length > 0 && (
        <div className={styles.dropdown}>
          {resultados.map((c) => (
            <button
              key={c.id}
              className={styles.opt}
              onClick={() => {
                onSelect(c);
                setAbierto(false);
              }}
            >
              <strong>{c.codigo}</strong> {c.nombre}
              <span className={styles.nat}>{c.naturaleza}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AsientoDetalle({ asiento: a, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>{a.numero}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={styles.detGrid}>
            <div><div className={styles.detLabel}>Fecha</div><strong>{a.fecha}</strong></div>
            <div><div className={styles.detLabel}>PUC</div><strong>{a.sector === "esal" ? "Sin ánimo de lucro" : "Comercial"}</strong></div>
          </div>
          <p className={styles.descBox}>{a.descripcion}</p>
          <table className={styles.movTable}>
            <thead><tr><th>Cuenta</th><th>Débito</th><th>Crédito</th><th>Tercero</th></tr></thead>
            <tbody>
              {a.movimientos?.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.cuenta}</strong> {m.nombreCuenta}</td>
                  <td>{Number(m.debito) > 0 ? fmt(m.debito) : "—"}</td>
                  <td>{Number(m.credito) > 0 ? fmt(m.credito) : "—"}</td>
                  <td>{m.tercero || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td><strong>Totales</strong></td><td><strong>{fmt(a.totalDebitos)}</strong></td><td><strong>{fmt(a.totalCreditos)}</strong></td><td></td></tr>
            </tfoot>
          </table>
          {a.anulado && <p className={styles.anulMsg}>Asiento anulado{a.motivoAnulacion ? `: ${a.motivoAnulacion}` : ""}.</p>}
        </div>
      </div>
    </div>
  );
}
