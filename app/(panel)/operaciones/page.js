"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import {
  FacturaIcon,
  NotasIcon,
  ComprasIcon,
  AsientosIcon,
  ConfigIcon,
  ChevronIcon,
} from "../moduleIcons";
import styles from "../hubs.module.css";

export default function OperacionesPage() {
  const router = useRouter();
  const [r, setR] = useState(null);

  useEffect(() => {
    obtenerResumen().then(setR);
  }, []);

  const cards = [
    { icon: <FacturaIcon />, color: styles.cPrimary, t: "Nueva factura", d: "Emitir una factura de venta", href: "/facturacion/nueva" },
    { icon: <FacturaIcon />, color: styles.cPrimary, t: "Facturas", d: "Historial de facturación", count: r?.facturas, href: "/facturacion" },
    { icon: <NotasIcon />, color: styles.cTeal, t: "Notas D/C", d: "Notas débito y crédito (DIAN)", count: r?.notas, href: "/notas" },
    { icon: <ComprasIcon />, color: styles.cWarning, t: "Compras", d: "Facturas de proveedores", count: r?.compras, href: "/compras" },
    { icon: <AsientosIcon />, color: styles.cViolet, t: "Asientos contables", d: "Registro de partida doble sobre el PUC", count: r?.asientos, href: "/asientos-contables" },
    { icon: <ConfigIcon />, color: styles.cSlate, t: "Config. Facturación", d: "Emisor y resolución DIAN", href: "/facturacion/configurar" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Operaciones</h1>
        <p>Facturación, compras y contabilidad.</p>
      </div>
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
