"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listarFacturas, obtenerFactura, anularFactura } from "@/lib/facturasApi";
import { generarFacturaPDF } from "@/lib/pdf/facturaPdf";
import { hoyBogota } from "@/lib/fechas";
import ImportExport from "@/components/ImportExport";
import FiltrosFacturas from "./FiltrosFacturas";
import PieTotales from "./PieTotales";
import filtroStyles from "./filtros.module.css";
import styles from "./facturacion.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function HistorialFacturasPage() {
  const router = useRouter();
  const hoy = hoyBogota();
  // El estado por defecto es "emitidas" y se muestra como chip: sumar las anuladas infla la
  // declaración, pero ocultarlas en silencio hace creer que se ve el histórico completo.
  const [filtros, setFiltros] = useState({ estado: "emitida", page: 1, hoy });
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [notif, setNotif] = useState(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setDatos(await listarFacturas({ ...filtros, hoy }));
    setCargando(false);
  }, [filtros, hoy]);

  useEffect(() => {
    // Pequeño retardo: los campos de texto y monto disparan un cambio por tecla.
    const t = setTimeout(recargar, 250);
    return () => clearTimeout(t);
  }, [recargar]);

  const facturas = datos?.facturas || null;
  const paginacion = datos?.paginacion;

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
    const motivo = prompt("Motivo de la anulación (queda registrado en el documento):") || "";
    const res = await anularFactura(f.id, motivo);
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

      <FiltrosFacturas
        filtros={filtros}
        onCambio={setFiltros}
        abierto={panelAbierto}
        onToggle={() => setPanelAbierto((v) => !v)}
        hoy={hoy}
      />

      {facturas === null || (cargando && !facturas) ? (
        <div className={styles.empty}>Cargando...</div>
      ) : facturas.length === 0 ? (
        <div className={styles.empty}>
          <p>Ninguna factura coincide con los filtros aplicados.</p>
          <button className="btn-secondary" onClick={() => router.push("/facturacion/nueva")}>
            Emitir una factura
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
                <th>Documento</th>
                {/* Dos columnas distintas a propósito: el total facturado es el valor del
                    documento; el total a cobrar es caja tras retenciones. */}
                <th>Total facturado</th>
                <th>Total a cobrar</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id} className={f.estado === "anulada" ? styles.anulada : ""}>
                  <td><strong>{f.numeroCompleto}</strong></td>
                  <td>{f.fecha}</td>
                  <td>{f.clienteNombre}</td>
                  <td>{f.clienteNumeroDocumento || "—"}</td>
                  <td className={styles.monto}>{fmt(f.total)}</td>
                  <td className={styles.monto}>{fmt(f.totalACobrar)}</td>
                  <td>
                    <span className={`badge-estado ${f.estado === "anulada" ? "inactivo" : "activo"}`}>
                      {f.estado === "anulada" ? "Anulada" : "Emitida"}
                    </span>
                    {f.fechaAnulacion && (
                      <div className={styles.detSub}>el {f.fechaAnulacion}</div>
                    )}
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

      {paginacion && paginacion.paginas > 1 && (
        <div className={filtroStyles.paginacion}>
          <button
            disabled={paginacion.page <= 1}
            onClick={() => setFiltros((f) => ({ ...f, page: paginacion.page - 1 }))}
          >
            ← Anterior
          </button>
          <span className={filtroStyles.pagInfo}>
            Página {paginacion.page} de {paginacion.paginas} · {paginacion.total} documentos
          </span>
          <button
            disabled={paginacion.page >= paginacion.paginas}
            onClick={() => setFiltros((f) => ({ ...f, page: paginacion.page + 1 }))}
          >
            Siguiente →
          </button>
        </div>
      )}

      <PieTotales agregados={datos?.agregados} avisos={datos?.avisos} filtros={datos?.filtros} />

      {detalle && <FacturaDetalle factura={detalle} onClose={() => setDetalle(null)} />}
      {notif && <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>}
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
