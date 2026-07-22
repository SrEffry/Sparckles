"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import {
  ClientesIcon,
  ProductoIcon,
  ConfigIcon,
  EmpresaIcon,
  ChevronIcon,
} from "../moduleIcons";
import styles from "../hubs.module.css";

export default function ConfiguracionPage() {
  const router = useRouter();
  const [r, setR] = useState(null);

  useEffect(() => {
    obtenerResumen().then(setR);
  }, []);

  const cards = [
    { icon: <ClientesIcon />, color: styles.cInfo, t: "Clientes", d: "Tus clientes y su configuración de retención", count: r?.clientes, href: "/clientes" },
    { icon: <ProductoIcon />, color: styles.cViolet, t: "Mis productos", d: "Catálogo de productos y servicios con IVA y retención", count: r?.productos, href: "/productos" },
    { icon: <ConfigIcon />, color: styles.cSlate, t: "Config. Facturación", d: "Datos del emisor y resolución DIAN", href: "/facturacion/configurar" },
    { icon: <EmpresaIcon />, color: styles.cSuccess, t: "Empresas", d: "Empresas registradas en tu cuenta", count: r?.empresas, href: "/empresas" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Configuración</h1>
        <p>Datos maestros de tu operación.</p>
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
