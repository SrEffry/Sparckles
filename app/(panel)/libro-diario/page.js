"use client";

// LIBRO DIARIO — SOLO LECTURA.
//
// Antes esta pantalla permitía crear asientos manuales sueltos. Un asiento sin documento que lo
// soporte no cumple el art. 124 del Decreto 2649 (falta el origen y la justificación) y no deja
// rastro de qué periodo se estaba ajustando. Ahora todo asiento es la CONSECUENCIA de un
// documento: una factura, una compra, un comprobante de tesorería o una nota de contabilidad.
//
// Tampoco se anula desde aquí: el libro no se corrige borrando, se corrige con el contraasiento
// que emite la reversión del documento que lo originó.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listarAsientos, obtenerAsiento } from "@/lib/asientosApi";
import styles from "./libro.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

// De qué documento vino el asiento, y a dónde ir para corregirlo.
const ORIGEN = {
  ingreso: { etiqueta: "Comprobante de ingreso", ruta: "/comprobantes?tipo=ingreso" },
  egreso: { etiqueta: "Comprobante de egreso", ruta: "/comprobantes?tipo=egreso" },
  nota_contabilidad: { etiqueta: "Nota de contabilidad", ruta: "/notas-contabilidad" },
  manual: { etiqueta: "Manual (histórico)", ruta: null },
  asiento: { etiqueta: "Manual (histórico)", ruta: null },
};

export default function LibroDiarioPage() {
  const router = useRouter();
  const [asientos, setAsientos] = useState(null);
  const [search, setSearch] = useState("");
  const [origen, setOrigen] = useState("");
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    listarAsientos().then(setAsientos);
  }, []);

  const stats = useMemo(() => {
    const l = asientos || [];
    const vivos = l.filter((a) => !a.anulado);
    return {
      total: l.length,
      debitos: vivos.reduce((s, a) => s + Number(a.totalDebitos), 0),
      creditos: vivos.reduce((s, a) => s + Number(a.totalCreditos), 0),
    };
  }, [asientos]);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    return (asientos || []).filter((a) => {
      if (origen && (a.tipo || "manual") !== origen) return false;
      if (!q) return true;
      return [a.numero, a.descripcion, a.documentoRef].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [asientos, search, origen]);

  // El libro debe cuadrar globalmente: si no, hay un asiento descuadrado y hay que verlo.
  const descuadre = Math.abs(stats.debitos - stats.creditos);

  async function ver(id) {
    const a = await obtenerAsiento(id);
    if (a) setDetalle(a);
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Libro diario</h1>
          <p>Todos los asientos, en orden. Es un registro de solo lectura.</p>
        </div>
      </header>

      <div className={styles.avisoAlcance}>
        <strong>El libro no se edita.</strong> Cada asiento lo genera su documento: una factura, una
        compra, un comprobante de tesorería o una{" "}
        <button className={styles.enlace} onClick={() => router.push("/notas-contabilidad")}>
          nota de contabilidad
        </button>
        . Para corregir un asiento, reversa el documento que lo originó — así queda el contraasiento
        y no un hueco en la numeración (art. 123 del Decreto 2649).
      </div>

      <section className={styles.stats}>
        <StatCard label="Asientos" valor={stats.total} />
        <StatCard label="Total débitos" valor={fmt(stats.debitos)} chico />
        <StatCard label="Total créditos" valor={fmt(stats.creditos)} chico />
        <StatCard
          label={descuadre < 0.01 ? "Libro cuadrado" : "Descuadre — revísalo"}
          valor={descuadre < 0.01 ? "✓" : fmt(descuadre)}
          chico
          malo={descuadre >= 0.01}
        />
      </section>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Buscar por número, descripción o documento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.filtro} value={origen} onChange={(e) => setOrigen(e.target.value)}>
          <option value="">Todos los orígenes</option>
          <option value="ingreso">Comprobantes de ingreso</option>
          <option value="egreso">Comprobantes de egreso</option>
          <option value="nota_contabilidad">Notas de contabilidad</option>
          <option value="manual">Manuales (históricos)</option>
        </select>
      </div>

      {asientos === null ? (
        <div className={styles.empty}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay asientos con esos filtros.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Origen</th>
                <th>Descripción</th>
                <th>Débitos</th>
                <th>Créditos</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((a) => {
                const o = ORIGEN[a.tipo] || ORIGEN.manual;
                return (
                  <tr key={a.id} className={a.anulado ? styles.anulada : ""}>
                    <td>
                      <strong>{a.numero}</strong>
                    </td>
                    <td>{a.fecha}</td>
                    <td>
                      {o.ruta ? (
                        <button className={styles.enlaceChico} onClick={() => router.push(o.ruta)}>
                          {o.etiqueta}
                        </button>
                      ) : (
                        <span className={styles.origenSuelto}>{o.etiqueta}</span>
                      )}
                    </td>
                    <td className={styles.desc}>{a.descripcion}</td>
                    <td className={styles.monto}>{fmt(a.totalDebitos)}</td>
                    <td className={styles.monto}>{fmt(a.totalCreditos)}</td>
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
                        <button onClick={() => ver(a.id)}>Ver</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detalle && <AsientoDetalle asiento={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

function StatCard({ label, valor, chico, malo }) {
  return (
    <div className={`${styles.stat} ${malo ? styles.statMalo : ""}`}>
      <span className={chico ? styles.statValorChico : styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function AsientoDetalle({ asiento: a, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>{a.numero}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className={styles.detGrid}>
            <div>
              <div className={styles.detLabel}>Fecha</div>
              <strong>{a.fecha}</strong>
            </div>
            <div>
              <div className={styles.detLabel}>PUC</div>
              <strong>{a.sector === "esal" ? "Sin ánimo de lucro" : "Comercial"}</strong>
            </div>
            <div>
              <div className={styles.detLabel}>Documento</div>
              <strong>{a.documentoRef || "—"}</strong>
            </div>
          </div>
          <p className={styles.descBox}>{a.descripcion}</p>
          <table className={styles.movTable}>
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Débito</th>
                <th>Crédito</th>
                <th>Tercero</th>
              </tr>
            </thead>
            <tbody>
              {a.movimientos?.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.cuenta}</strong> {m.nombreCuenta}
                  </td>
                  <td>{Number(m.debito) > 0 ? fmt(m.debito) : "—"}</td>
                  <td>{Number(m.credito) > 0 ? fmt(m.credito) : "—"}</td>
                  <td>{m.tercero || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <strong>Totales</strong>
                </td>
                <td>
                  <strong>{fmt(a.totalDebitos)}</strong>
                </td>
                <td>
                  <strong>{fmt(a.totalCreditos)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
          {a.anulado && (
            <p className={styles.anulMsg}>Asiento anulado{a.motivoAnulacion ? `: ${a.motivoAnulacion}` : ""}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
