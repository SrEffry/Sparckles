"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listarFacturas, obtenerFactura, anularFactura } from "@/lib/facturasApi";
import { generarFacturaPDF } from "@/lib/pdf/facturaPdf";
import ImportExport from "@/components/ImportExport";
import styles from "./facturacion.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function HistorialFacturasPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState(null);
  const [search, setSearch] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setFacturas(await listarFacturas());
  }
  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const l = facturas || [];
    const emitidas = l.filter((f) => f.estado === "emitida");
    return {
      total: l.length,
      emitidas: emitidas.length,
      anuladas: l.filter((f) => f.estado === "anulada").length,
      facturado: emitidas.reduce((a, f) => a + Number(f.totalACobrar || 0), 0),
    };
  }, [facturas]);

  const filtradas = useMemo(() => {
    const l = facturas || [];
    const q = search.toLowerCase();
    return l.filter((f) =>
      [f.numeroCompleto, f.clienteNombre].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [facturas, search]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function verDetalle(id) {
    const f = await obtenerFactura(id);
    if (f) setDetalle(f);
  }

  async function anular(f) {
    if (!confirm(`¿Anular la factura ${f.numeroCompleto}? Esta acción no se puede revertir.`)) return;
    const res = await anularFactura(f.id);
    if (res.error) return notificar(res.error, "error");
    await recargar();
    notificar("Factura anulada");
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Facturas</h1>
          <p>Historial de facturación</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ImportExport modulo="ventas" />
          <button className="btn-primary" onClick={() => router.push("/facturacion/nueva")}>
            + Nueva factura
          </button>
        </div>
      </header>

      <section className={styles.stats}>
        <StatCard label="Total facturas" valor={stats.total} />
        <StatCard label="Emitidas" valor={stats.emitidas} />
        <StatCard label="Anuladas" valor={stats.anuladas} />
        <StatCard label="Facturado" valor={fmt(stats.facturado)} chico />
      </section>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Buscar por número o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {facturas === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay facturas emitidas.</p>
          <button className="btn-secondary" onClick={() => router.push("/facturacion/nueva")}>
            Emitir la primera
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total a cobrar</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className={f.estado === "anulada" ? styles.anulada : ""}>
                  <td><strong>{f.numeroCompleto}</strong></td>
                  <td>{f.fecha}</td>
                  <td>{f.clienteNombre}</td>
                  <td className={styles.monto}>{fmt(f.totalACobrar)}</td>
                  <td>
                    <span className={`badge-estado ${f.estado === "anulada" ? "inactivo" : "activo"}`}>
                      {f.estado === "anulada" ? "Anulada" : "Emitida"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => verDetalle(f.id)}>Ver</button>
                      {f.estado === "emitida" && (
                        <button className={styles.del} onClick={() => anular(f)}>Anular</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && <FacturaDetalle factura={detalle} onClose={() => setDetalle(null)} />}
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

function FacturaDetalle({ factura: f, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>{f.numeroCompleto}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={styles.detGrid}>
            <div>
              <div className={styles.detLabel}>Emisor</div>
              <strong>{f.emisorRazonSocial}</strong>
              <div className={styles.detSub}>NIT {f.emisorNit}</div>
            </div>
            <div>
              <div className={styles.detLabel}>Cliente</div>
              <strong>{f.clienteNombre}</strong>
              <div className={styles.detSub}>
                {f.clienteTipoDocumento} {f.clienteNumeroDocumento}
                {f.clienteDv ? `-${f.clienteDv}` : ""}
              </div>
            </div>
            <div>
              <div className={styles.detLabel}>Fecha</div>
              <strong>{f.fecha}</strong>
            </div>
            <div>
              <div className={styles.detLabel}>Estado</div>
              <span className={`badge-estado ${f.estado === "anulada" ? "inactivo" : "activo"}`}>
                {f.estado === "anulada" ? "Anulada" : "Emitida"}
              </span>
            </div>
          </div>

          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Base</th>
                <th>IVA</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {f.items?.map((it) => (
                <tr key={it.id}>
                  <td>{it.descripcion}</td>
                  <td>{Number(it.cantidad)}</td>
                  <td>{fmt(it.base)}</td>
                  <td>{fmt(it.valorIva)}</td>
                  <td>{fmt(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.totales}>
            <Row label="Subtotal" valor={fmt(f.subtotal)} />
            {Number(f.totalDescuentos) > 0 && <Row label="Descuentos" valor={`-${fmt(f.totalDescuentos)}`} />}
            <Row label="IVA" valor={fmt(f.iva)} />
            {Number(f.retenciones) > 0 && <Row label="ReteFuente" valor={`-${fmt(f.retenciones)}`} />}
            <div className={styles.totalFinal}>
              <span>Total a cobrar</span>
              <strong>{fmt(f.totalACobrar)}</strong>
            </div>
          </div>
          {f.observaciones && <p className={styles.obs}>Obs: {f.observaciones}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={() => generarFacturaPDF(f)}>Descargar PDF</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, valor }) {
  return (
    <div className={styles.totRow}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}
