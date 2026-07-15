"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import styles from "../hubs.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function FinanzasPage() {
  const router = useRouter();
  const [r, setR] = useState(null);
  const [tab, setTab] = useState("tesoreria");

  useEffect(() => {
    obtenerResumen().then(setR);
  }, []);

  const balance = useMemo(() => (r ? r.totalFacturado - r.totalCompras : 0), [r]);

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Finanzas</h1>
        <p>Tesorería e impuestos, calculados con tus datos reales.</p>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "tesoreria" ? styles.tabActive : ""}`} onClick={() => setTab("tesoreria")}>Tesorería</button>
        <button className={`${styles.tab} ${tab === "impuestos" ? styles.tabActive : ""}`} onClick={() => setTab("impuestos")}>Impuestos</button>
      </div>

      {tab === "tesoreria" ? (
        <>
          <section className={styles.kpis}>
            <div className={`${styles.kpi} ${styles.brand}`}>
              <span className={styles.kpiValor}>{fmt(r?.totalFacturado)}</span>
              <span className={styles.kpiLabel}>Ingresos facturados</span>
            </div>
            <Kpi valor={fmt(r?.totalCompras)} label="Egresos (compras)" />
            <Kpi valor={fmt(balance)} label="Balance (ingresos − egresos)" />
            <Kpi valor={r?.facturas ?? "—"} label="Facturas emitidas" />
          </section>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Flujo</h2>
            <div className={styles.row}><span>Total facturado (ventas)</span><strong>{fmt(r?.totalFacturado)}</strong></div>
            <div className={styles.row}><span>Total compras (a pagar)</span><strong>{fmt(r?.totalCompras)}</strong></div>
            <div className={styles.row}><span>Documentos soporte (neto)</span><strong>{fmt(r?.totalSoportes)}</strong></div>
            <div className={`${styles.row} ${styles.rowHi} ${balance >= 0 ? styles.pos : styles.neg}`}>
              <span>Balance</span><strong>{fmt(balance)}</strong>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className={styles.kpis}>
            <Kpi valor={fmt(r?.ivaGenerado)} label="IVA generado" />
            <Kpi valor={fmt(r?.ivaDescontable)} label="IVA descontable" />
            <div className={`${styles.kpi} ${styles.brand}`}>
              <span className={styles.kpiValor}>{fmt(r?.ivaPorPagar)}</span>
              <span className={styles.kpiLabel}>IVA por pagar</span>
            </div>
            <Kpi valor={fmt(r?.retencionesVentas)} label="ReteFuente practicada" />
          </section>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Detalle de impuestos</h2>
            <div className={styles.row}><span>IVA generado (facturas de venta)</span><strong>{fmt(r?.ivaGenerado)}</strong></div>
            <div className={styles.row}><span>IVA descontable (compras)</span><strong>{fmt(r?.ivaDescontable)}</strong></div>
            <div className={`${styles.row} ${styles.rowHi}`}><span>Saldo IVA por pagar</span><strong>{fmt(r?.ivaPorPagar)}</strong></div>
            <div className={styles.row}><span>ReteFuente practicada a clientes</span><strong>{fmt(r?.retencionesVentas)}</strong></div>
            <div className={styles.row}><span>Retenciones asumidas en compras</span><strong>{fmt(r?.retencionesCompras)}</strong></div>
            <div className={styles.row}><span>Retenciones en documentos soporte</span><strong>{fmt(r?.retencionesSoportes)}</strong></div>
          </div>
        </>
      )}

      <section className={styles.cardsGrid} style={{ marginTop: 24 }}>
        <button className={styles.linkCard} onClick={() => router.push("/documentos-soportes")}>
          <h3>Documentos soporte</h3>
          <p>Adquisiciones a no obligados a facturar</p>
          {r?.soportes != null && <span className={styles.linkCount}>{r.soportes}</span>}
        </button>
        <button className={styles.linkCard} onClick={() => router.push("/compras")}>
          <h3>Compras</h3>
          <p>Facturas de proveedores</p>
          {r?.compras != null && <span className={styles.linkCount}>{r.compras}</span>}
        </button>
        <button className={styles.linkCard} onClick={() => router.push("/facturacion")}>
          <h3>Facturas</h3>
          <p>Ingresos facturados</p>
          {r?.facturas != null && <span className={styles.linkCount}>{r.facturas}</span>}
        </button>
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
