"use client";

// Hub de Reportes.
//
// Arranca con un solo submódulo, y a propósito: la preparación para exógena. El módulo NO
// genera todavía ningún formato para la DIAN, y la pantalla lo dice en vez de dejar que alguien
// lo suponga — un archivo que sale del software con aire de oficial se presenta sin que nadie
// lo vuelva a mirar, y el art. 651 E.T. sanciona la información errónea igual que la que falta.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerPreparacionExogena } from "@/lib/reportesApi";
import { SoporteIcon, ChevronIcon } from "../moduleIcons";
import styles from "../hubs.module.css";

export default function ReportesPage() {
  const router = useRouter();
  const [d, setD] = useState(null);

  useEffect(() => {
    obtenerPreparacionExogena().then(setD);
  }, []);

  const t = d?.totales;
  const pct = t?.terceros ? Math.round((t.listos / t.terceros) * 100) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Reportes</h1>
        <p>Información exógena y reportes tributarios.</p>
      </div>

      <section className={styles.kpis}>
        <div className={`${styles.kpi} ${styles.brand}`}>
          <span className={styles.kpiValor}>{t ? `${pct}%` : "—"}</span>
          <span className={styles.kpiLabel}>Terceros listos para exógena</span>
        </div>
        <Kpi valor={t?.terceros ?? "—"} label="Terceros en total" />
        <Kpi valor={t?.conCriticos ?? "—"} label="Con datos que impiden reportar" />
        <Kpi
          valor={d?.plazo ? `${d.plazo.diasRestantes} d` : "—"}
          label={d?.plazo ? `Para el plazo (${d.plazo.fecha})` : "Plazo no disponible"}
        />
      </section>

      <section className={styles.cardsGrid} style={{ marginTop: 24 }}>
        <button className={`${styles.linkCard} ${styles.cTeal}`} onClick={() => router.push("/reportes/formatos")}>
          <span className={styles.linkIcon}>
            <SoporteIcon />
          </span>
          <span className={styles.linkBody}>
            <span className={styles.linkHead}>Extractos de exógena</span>
            <span className={styles.linkDesc}>
              1003, 1005, 1006 y 1007 en las columnas del layout — borrador para revisión
            </span>
          </span>
          <span className={styles.linkArrow}>
            <ChevronIcon />
          </span>
        </button>

        <button className={`${styles.linkCard} ${styles.cInfo}`} onClick={() => router.push("/reportes/exogena")}>
          <span className={styles.linkIcon}>
            <SoporteIcon />
          </span>
          <span className={styles.linkBody}>
            <span className={styles.linkHead}>
              Preparación para exógena
              {t?.conCriticos ? <span className={styles.linkCount}>{t.conCriticos}</span> : null}
            </span>
            <span className={styles.linkDesc}>
              Qué datos faltan por tercero antes de que llegue el plazo
            </span>
          </span>
          <span className={styles.linkArrow}>
            <ChevronIcon />
          </span>
        </button>
      </section>

      <div className={styles.panel} style={{ marginTop: 24 }}>
        <h2 className={styles.panelTitle}>Qué hace este módulo hoy</h2>
        <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Por ahora <strong>diagnostica, no presenta</strong>. Revisa tus clientes, proveedores y
          empleados y señala qué le falta a cada uno para poder reportarlo: el tipo de documento
          en código DIAN, los apellidos y nombres separados, la dirección y los códigos DANE de
          departamento y municipio. Esos datos se capturan durante todo el año, pero solo se
          echan de menos al armar el reporte — y para entonces ya no hay tiempo.
          <br />
          <br />
          <strong>No genera los formatos ni el archivo XML.</strong> El XML lo produce el
          prevalidador oficial de la DIAN; lo que Sparkles entregará más adelante son los datos
          en las columnas del layout, para pegarlos ahí. Nada sale de aquí hacia la DIAN sin que
          lo revise un contador.
        </p>
      </div>
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
