"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import styles from "../hubs.module.css";

export default function OperacionesPage() {
  const router = useRouter();
  const [r, setR] = useState(null);

  useEffect(() => {
    obtenerResumen().then(setR);
  }, []);

  const cards = [
    { t: "Nueva factura", d: "Emitir una factura de venta", href: "/facturacion/nueva" },
    { t: "Facturas", d: "Historial de facturación", c: r?.facturas, href: "/facturacion" },
    { t: "Notas D/C", d: "Notas débito y crédito (DIAN)", c: r?.notas, href: "/notas" },
    { t: "Compras", d: "Facturas de proveedores", c: r?.compras, href: "/compras" },
    { t: "Asientos contables", d: "Registro de partida doble sobre el PUC", c: r?.asientos, href: "/asientos-contables" },
    { t: "Config. Facturación", d: "Emisor y resolución DIAN", href: "/facturacion/configurar" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <h1>Operaciones</h1>
        <p>Facturación, compras y contabilidad.</p>
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
