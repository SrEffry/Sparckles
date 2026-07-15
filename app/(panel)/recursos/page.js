"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listarEmpleados } from "@/lib/empleadosApi";
import { formatearAbreviado } from "@/lib/format";
import styles from "./recursos.module.css";

export default function RecursosPage() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState([]);
  const [tab, setTab] = useState("nomina");
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    listarEmpleados().then(setEmpleados);
  }, []);

  // Mismos cálculos que recursos.js del sitio actual.
  const kpis = useMemo(() => {
    const activos = empleados.filter((e) => e.activo);
    const nominaMensual = activos.reduce(
      (acc, e) => acc + (parseFloat(e.salarioBase) || 0),
      0
    );
    return {
      totalActivos: activos.length,
      nominaMensual,
      seguridadSocial: nominaMensual * 0.22,
      prestaciones: nominaMensual * 0.2183,
    };
  }, [empleados]);

  function proximamente(mensaje) {
    setAviso(mensaje);
    setTimeout(() => setAviso(null), 3000);
  }

  return (
    <div>
      <header className={styles.head}>
        <h1>Recursos</h1>
        <p>Gestión de nómina y activos fijos</p>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "nomina" ? styles.active : ""}`}
          onClick={() => setTab("nomina")}
        >
          Nómina
        </button>
        <button
          className={`${styles.tab} ${tab === "activos" ? styles.active : ""}`}
          onClick={() => setTab("activos")}
        >
          Activos Fijos
        </button>
      </div>

      {tab === "nomina" ? (
        <>
          <section className={styles.statsGrid}>
            <StatCard
              tono="blue"
              valor={kpis.totalActivos}
              label="Empleados activos"
            />
            <StatCard
              tono="green"
              valor={formatearAbreviado(kpis.nominaMensual)}
              label="Nómina mensual"
            />
            <StatCard
              tono="purple"
              valor={formatearAbreviado(kpis.seguridadSocial)}
              label="Seguridad social"
            />
            <StatCard
              tono="orange"
              valor={formatearAbreviado(kpis.prestaciones)}
              label="Prestaciones"
            />
          </section>

          <section className={styles.actionsGrid}>
            <ActionCard
              titulo="Empleados"
              texto="Gestionar el personal, revisar perfiles y editar información de contratos."
              cta="Ver Empleados"
              tono="blue"
              onClick={() => router.push("/nomina")}
            />
            <ActionCard
              titulo="Liquidación"
              texto="Calcular la nómina del mes, registrar pagos y generar desprendibles PDF."
              cta="Liquidar Nómina"
              tono="green"
              onClick={() => router.push("/nomina")}
            />
            <ActionCard
              titulo="Certificados"
              texto="Generar certificados laborales y comprobantes de ingresos automáticamente."
              cta="Ver Certificados"
              tono="purple"
              onClick={() => proximamente("Módulo de Certificados en desarrollo")}
            />
          </section>
        </>
      ) : (
        <div className={styles.placeholder}>
          <p>Gestión de activos fijos — próximamente.</p>
        </div>
      )}

      {aviso && <div className={styles.toast}>{aviso}</div>}
    </div>
  );
}

function StatCard({ tono, valor, label }) {
  return (
    <div className={`${styles.stat} ${styles[tono]}`}>
      <span className={styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function ActionCard({ titulo, texto, cta, tono, onClick }) {
  return (
    <div className={styles.action}>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      <button className={`${styles.actionBtn} ${styles[tono]}`} onClick={onClick}>
        {cta}
      </button>
    </div>
  );
}
