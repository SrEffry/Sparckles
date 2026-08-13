"use client";

// Hub de Contabilidad: lo que sostiene los libros, separado de lo que los mueve.
//
// Facturación y compras viven en Operaciones porque son operaciones del negocio. Lo de aquí es
// el aparato contable: el plan de cuentas, el mapa que traduce conceptos a cuentas, las notas
// de ajuste y el libro donde todo aterriza.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import { obtenerMapaCuentas } from "@/lib/mapaCuentasApi";
import { AsientosIcon, NotasIcon, ConfigIcon, ChevronIcon } from "../moduleIcons";
import styles from "../hubs.module.css";

export default function ContabilidadPage() {
  const router = useRouter();
  const [r, setR] = useState(null);
  const [mapa, setMapa] = useState(null);

  useEffect(() => {
    obtenerResumen().then(setR);
    obtenerMapaCuentas().then(setMapa);
  }, []);

  const cards = [
    {
      icon: <NotasIcon />,
      color: styles.cViolet,
      t: "Notas de contabilidad",
      d: "Ajustes, provisiones, depreciación y corrección de errores",
      href: "/notas-contabilidad",
    },
    {
      icon: <AsientosIcon />,
      color: styles.cSlate,
      t: "Libro diario",
      d: "Todos los asientos, en orden. Solo lectura",
      count: r?.asientos,
      href: "/libro-diario",
    },
    {
      icon: <ConfigIcon />,
      color: styles.cInfo,
      t: "Mapa de cuentas",
      d: "Qué cuenta del PUC usa cada concepto, y las cuentas de tesorería",
      href: "/configuracion/cuentas",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Contabilidad</h1>
        <p>El plan de cuentas, los ajustes y el libro donde todo aterriza.</p>
      </div>

      {/* Sin mapa de cuentas no se puede contabilizar nada: se dice aquí y no cuando el usuario
          intente emitir y falle. */}
      {mapa && !mapa.configurado && (
        <div className={styles.aviso}>
          Todavía no has configurado el <strong>mapa de cuentas</strong>. Sin él, los comprobantes y
          las notas no pueden proponer una imputación contable.{" "}
          <button className={styles.avisoEnlace} onClick={() => router.push("/configuracion/cuentas")}>
            Configurarlo ahora
          </button>
        </div>
      )}

      <section className={styles.cardsGrid}>
        {cards.map((x) => (
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
