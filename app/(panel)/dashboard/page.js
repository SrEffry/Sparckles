"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUsuario } from "@/lib/UsuarioContext";
import { obtenerResumen } from "@/lib/resumenApi";
import styles from "../hubs.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function DashboardPage() {
  const usuario = useUsuario();
  const router = useRouter();
  const [r, setR] = useState(null);

  useEffect(() => {
    obtenerResumen().then(setR);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Hola, {usuario?.nombre} 👋</h1>
        <p>Este es el resumen de tu actividad contable.</p>
      </div>

      <section className={styles.kpis}>
        <div className={`${styles.kpi} ${styles.brand}`}>
          <span className={styles.kpiValor}>{fmt(r?.totalFacturado)}</span>
          <span className={styles.kpiLabel}>Total facturado</span>
        </div>
        <Kpi valor={r?.facturas ?? "—"} label="Facturas emitidas" />
        <Kpi valor={r?.clientes ?? "—"} label="Clientes" />
        <Kpi valor={r?.productos ?? "—"} label="Productos" />
      </section>

      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Resumen tributario</h2>
          <div className={styles.row}><span>IVA generado (ventas)</span><strong>{fmt(r?.ivaGenerado)}</strong></div>
          <div className={styles.row}><span>IVA descontable (compras)</span><strong>{fmt(r?.ivaDescontable)}</strong></div>
          <div className={`${styles.row} ${styles.rowHi}`}><span>IVA por pagar</span><strong>{fmt(r?.ivaPorPagar)}</strong></div>
          <div className={styles.row}><span>ReteFuente practicada (ventas)</span><strong>{fmt(r?.retencionesVentas)}</strong></div>
          <div className={styles.row}><span>Retenciones en compras</span><strong>{fmt(r?.retencionesCompras)}</strong></div>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Últimas facturas</h2>
          {!r?.ultimasFacturas?.length ? (
            <p className={styles.recentEmpty}>Aún no has emitido facturas.</p>
          ) : (
            <table className={styles.recent}>
              <tbody>
                {r.ultimasFacturas.map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.numeroCompleto}</strong></td>
                    <td>{f.clienteNombre}</td>
                    <td style={{ textAlign: "right" }}>{fmt(f.totalACobrar)}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge-estado ${f.estado === "anulada" ? "inactivo" : "activo"}`}>
                        {f.estado === "anulada" ? "Anulada" : "Emitida"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <section className={styles.cardsGrid}>
        <LinkCard titulo="Nueva factura" desc="Emitir una factura de venta" onClick={() => router.push("/facturacion/nueva")} />
        <LinkCard titulo="Clientes" desc="Gestiona tus clientes" count={r?.clientes} onClick={() => router.push("/clientes")} />
        <LinkCard titulo="Compras" desc="Facturas de proveedores" count={r?.compras} onClick={() => router.push("/compras")} />
        <LinkCard titulo="Nómina" desc="Empleados y liquidación" count={r?.empleadosActivos} onClick={() => router.push("/nomina")} />
        <LinkCard titulo="Asientos" desc="Contabilidad de partida doble" count={r?.asientos} onClick={() => router.push("/asientos-contables")} />
        <LinkCard titulo="Notas D/C" desc="Ajustes a facturas" count={r?.notas} onClick={() => router.push("/notas")} />
      </section>
    </div>
  );
}

function Kpi({ valor, label }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiValor}>{valor}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  );
}

function LinkCard({ titulo, desc, count, onClick }) {
  return (
    <button className={styles.linkCard} onClick={onClick}>
      <h3>{titulo}</h3>
      <p>{desc}</p>
      {count != null && <span className={styles.linkCount}>{count}</span>}
    </button>
  );
}
