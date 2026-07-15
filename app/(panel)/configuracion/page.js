"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import styles from "../hubs.module.css";

export default function ConfiguracionPage() {
  const router = useRouter();
  const [r, setR] = useState(null);

  useEffect(() => {
    obtenerResumen().then(setR);
  }, []);

  const cards = [
    { t: "Clientes", d: "Tus clientes y su configuración de retención", c: r?.clientes, href: "/clientes" },
    { t: "Mis productos", d: "Catálogo de productos y servicios con IVA y retención", c: r?.productos, href: "/productos" },
    { t: "Config. Facturación", d: "Datos del emisor y resolución DIAN", href: "/facturacion/configurar" },
    { t: "Empresas", d: "Empresas registradas en tu cuenta", c: r?.empresas, href: "/empresas" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Configuración</h1>
        <p>Datos maestros de tu operación.</p>
      </div>
      <section className={styles.cardsGrid}>
        {cards.map((x) => (
          <button key={x.t} className={styles.linkCard} onClick={() => router.push(x.href)}>
            <h3>{x.t}</h3>
            <p>{x.d}</p>
            {x.c != null && <span className={styles.linkCount}>{x.c}</span>}
          </button>
        ))}
      </section>
    </div>
  );
}
