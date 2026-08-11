"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import { SoporteIcon, ComprasIcon, FacturaIcon, ChevronIcon } from "../moduleIcons";
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
            {/* El INC no entra en el saldo de IVA: es otro impuesto, con formulario propio,
                y no se compensa contra el IVA descontable de las compras. */}
            {r?.incGenerado > 0 && (
              <div className={styles.row}>
                <span title="Impuesto Nacional al Consumo. Se declara en su propio formulario y no se compensa contra el IVA descontable.">
                  Impuesto al Consumo generado (declara aparte)
                </span>
                <strong>{fmt(r?.incGenerado)}</strong>
              </div>
            )}
            <div className={styles.row}><span>ReteFuente practicada a clientes</span><strong>{fmt(r?.retencionesVentas)}</strong></div>
            <div className={styles.row}><span>Retenciones asumidas en compras</span><strong>{fmt(r?.retencionesCompras)}</strong></div>
            <div className={styles.row}><span>Retenciones en documentos soporte</span><strong>{fmt(r?.retencionesSoportes)}</strong></div>
          </div>
        </>
      )}

      <section className={styles.cardsGrid} style={{ marginTop: 24 }}>
        {[
          // Tesorería: el movimiento real del dinero. Facturas y compras son la causación y
          // viven en Operaciones; aquí va lo que se cobró y lo que se pagó.
          { icon: <FacturaIcon />, color: styles.cSuccess, t: "Comprobante de ingreso", d: "Recaudos aplicados a facturas de venta", href: "/comprobantes?tipo=ingreso" },
          { icon: <ComprasIcon />, color: styles.cWarning, t: "Comprobante de egreso", d: "Pagos aplicados a compras de proveedores", href: "/comprobantes?tipo=egreso" },
          { icon: <SoporteIcon />, color: styles.cTeal, t: "Documentos soporte", d: "Adquisiciones a no obligados a facturar", count: r?.soportes, href: "/documentos-soportes" },
        ].map((x) => (
          <button key={x.t} className={`${styles.linkCard} ${x.color}`} onClick={() => router.push(x.href)}>
            <span className={styles.linkIcon}>{x.icon}</span>
            <span className={styles.linkBody}>
              <span className={styles.linkHead}>
                {x.t}
                {x.count != null && <span className={styles.linkCount}>{x.count}</span>}
              </span>
              <span className={styles.linkDesc}>{x.d}</span>
            </span>
            <span className={styles.linkArrow}>
              <ChevronIcon />
            </span>
          </button>
        ))}
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
