"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUsuario } from "@/lib/UsuarioContext";
import { obtenerResumen } from "@/lib/resumenApi";
import {
  FacturaIcon,
  ClientesIcon,
  ComprasIcon,
  NominaIcon,
  AsientosIcon,
  NotasIcon,
  ProductoIcon,
  BilleteIcon,
  ChevronIcon,
} from "../moduleIcons";
import styles from "./dashboard.module.css";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const fmt = (v) => cop.format(Number(v) || 0);
const entero = (v) => String(Math.round(Number(v) || 0));

function fmtFecha(f) {
  if (!f) return "—";
  const d = new Date(typeof f === "string" && f.length <= 10 ? `${f}T12:00:00` : f);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(d);
}

// Cuenta de 0 al valor una sola vez al cargar los datos. Respeta reduced-motion.
function useCountUp(target, run) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) {
      setV(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const dur = 700;
    const tick = (t) => {
      if (!start) start = t;
      const k = Math.min((t - start) / dur, 1);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target]);
  return v;
}

export default function DashboardPage() {
  const usuario = useUsuario();
  const router = useRouter();
  const [r, setR] = useState(null);

  useEffect(() => {
    obtenerResumen().then(setR);
  }, []);

  const loading = r === null;
  const emitidas = r ? Math.max(0, r.facturas - r.facturasAnuladas) : 0;
  const iva = r?.ivaPorPagar ?? 0;
  const favor = iva < 0;

  const acciones = [
    { icon: <FacturaIcon />, c: styles.cPrimary, titulo: "Nueva factura", desc: "Emitir una factura de venta", to: "/facturacion/nueva" },
    { icon: <ClientesIcon />, c: styles.cInfo, titulo: "Clientes", desc: "Gestiona tus clientes", count: r?.clientes, to: "/clientes" },
    { icon: <ComprasIcon />, c: styles.cWarning, titulo: "Compras", desc: "Facturas de proveedores", count: r?.compras, to: "/compras" },
    { icon: <NominaIcon />, c: styles.cSuccess, titulo: "Nómina", desc: "Empleados y liquidación", count: r?.empleadosActivos, to: "/nomina" },
    { icon: <AsientosIcon />, c: styles.cViolet, titulo: "Libro diario", desc: "Todos los asientos, en orden", count: r?.asientos, to: "/libro-diario" },
    { icon: <NotasIcon />, c: styles.cTeal, titulo: "Notas D/C", desc: "Ajustes a facturas", count: r?.notas, to: "/notas" },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <header className={styles.heroHead}>
          <h1>Hola, {usuario?.nombre || "de nuevo"}</h1>
          <p>Este es el resumen de tu actividad contable.</p>
        </header>

        <section className={styles.kpis}>
          <Kpi
            emph
            loading={loading}
            colorClass={styles.cPrimary}
            icon={<BilleteIcon />}
            label="Total facturado"
            value={r?.totalFacturado ?? 0}
            format={fmt}
            sub={`${emitidas} ${emitidas === 1 ? "factura emitida" : "facturas emitidas"}`}
          />
          <Kpi
            loading={loading}
            colorClass={styles.cPrimary}
            icon={<FacturaIcon />}
            label="Facturas emitidas"
            value={emitidas}
            format={entero}
            sub={r?.facturasAnuladas ? `${r.facturasAnuladas} anuladas` : null}
          />
          <Kpi
            loading={loading}
            colorClass={styles.cInfo}
            icon={<ClientesIcon />}
            label="Clientes"
            value={r?.clientes ?? 0}
            format={entero}
          />
          <Kpi
            loading={loading}
            colorClass={styles.cViolet}
            icon={<ProductoIcon />}
            label="Productos"
            value={r?.productos ?? 0}
            format={entero}
          />
        </section>
      </section>

      <div className={styles.cols}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Resumen tributario</h2>
            <button className={styles.panelLink} onClick={() => router.push("/finanzas")}>
              Finanzas <ChevronIcon />
            </button>
          </div>

          {loading ? (
            <SkelRows n={5} />
          ) : (
            <div className={styles.enter}>
              <div className={styles.taxRow}>
                <span className={styles.taxLabel}>IVA generado (ventas)</span>
                <span className={styles.taxVal}>{fmt(r.ivaGenerado)}</span>
              </div>
              <div className={styles.taxRow}>
                <span className={styles.taxLabel}>IVA descontable (compras)</span>
                <span className={`${styles.taxVal} ${styles.taxNeg}`}>−{fmt(r.ivaDescontable)}</span>
              </div>
              <div className={`${styles.taxResult} ${favor ? styles.favorBg : ""}`}>
                <span className={styles.taxResultLabel}>{favor ? "Saldo a favor de IVA" : "IVA por pagar"}</span>
                <span className={`${styles.taxResultVal} ${favor ? styles.favor : ""}`}>
                  {fmt(Math.abs(iva))}
                </span>
              </div>
              <p className={styles.taxHint}>IVA generado menos IVA descontable del periodo.</p>

              <div className={styles.taxSplit}>
                <div className={styles.taxRow}>
                  <span className={styles.taxLabel}>ReteFuente en ventas</span>
                  <span className={styles.taxVal}>{fmt(r.retencionesVentas)}</span>
                </div>
                <div className={styles.taxRow}>
                  <span className={styles.taxLabel}>Retenciones en compras</span>
                  <span className={styles.taxVal}>{fmt(r.retencionesCompras)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Últimas facturas</h2>
            {r?.ultimasFacturas?.length > 0 && (
              <button className={styles.panelLink} onClick={() => router.push("/facturacion")}>
                Ver todas <ChevronIcon />
              </button>
            )}
          </div>

          {loading ? (
            <SkelRows n={4} />
          ) : !r.ultimasFacturas.length ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>Aún no has emitido facturas.</p>
              <button className={styles.emptyLink} onClick={() => router.push("/facturacion/nueva")}>
                Crear la primera factura <ChevronIcon />
              </button>
            </div>
          ) : (
            <table className={`${styles.recent} ${styles.enter}`}>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th className={styles.right}>Total</th>
                  <th className={styles.right}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {r.ultimasFacturas.map((f) => (
                  <tr key={f.id}>
                    <td className={styles.rNum}>{f.numeroCompleto}</td>
                    <td className={styles.rClient} title={f.clienteNombre}>
                      {f.clienteNombre}
                    </td>
                    <td className={styles.rDate}>{fmtFecha(f.fecha)}</td>
                    <td className={`${styles.right} ${styles.rAmount}`}>{fmt(f.totalACobrar)}</td>
                    <td className={styles.right}>
                      <span className={`badge-estado ${f.estado === "anulada" ? "inactivo" : "activo"}`}>
                        {f.estado === "anulada" ? "Anulada" : "Emitida"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section>
        <h2 className={styles.actionsTitle}>Accesos rápidos</h2>
        <div className={styles.actions}>
          {acciones.map((a) => (
            <button key={a.titulo} className={`${styles.action} ${a.c}`} onClick={() => router.push(a.to)}>
              <span className={styles.actionIcon}>{a.icon}</span>
              <span className={styles.actionBody}>
                <span className={styles.actionTitle}>
                  {a.titulo}
                  {a.count != null && <span className={styles.actionCount}>{a.count}</span>}
                </span>
                <span className={styles.actionDesc}>{a.desc}</span>
              </span>
              <span className={styles.actionArrow}>
                <ChevronIcon />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ emph, colorClass, icon, label, value, format, sub, loading }) {
  const shown = useCountUp(Number(value) || 0, !loading);
  return (
    <div className={`${styles.kpi} ${colorClass || ""}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon}>{icon}</span>
      </div>
      {loading ? (
        <div className={`${styles.skel} ${styles.skelValue}`} />
      ) : (
        <span className={`${styles.kpiValue} ${emph ? styles.kpiValueEmph : ""}`}>
          {format(shown)}
        </span>
      )}
      {sub && !loading && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  );
}

function SkelRows({ n }) {
  return (
    <div>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className={`${styles.skel} ${styles.skelRow}`}
          style={{ width: `${90 - i * 8}%` }}
        />
      ))}
    </div>
  );
}
