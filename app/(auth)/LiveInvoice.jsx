"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "./icons";
import styles from "./auth.module.css";

/**
 * Firma del login: una mini-factura que se "liquida" al cargar.
 * Los montos suben desde 0 y cuadran (subtotal + IVA − ReteFuente = total),
 * encarnando el lema "siempre en orden". Es decorativa (aria-hidden) y respeta
 * prefers-reduced-motion (muestra los valores finales sin animar).
 *
 * Aritmética real: 850.000 + 161.500 (IVA 19%) − 21.250 (ReteFuente 2,5%) = 990.250
 */
const LINES = [
  { label: "Subtotal", value: 850000 },
  { label: "IVA 19%", value: 161500 },
  { label: "ReteFuente 2,5%", value: -21250 },
];
const TOTAL = 990250;

function formatCOP(n) {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toLocaleString("es-CO");
  return (neg ? "−" : "") + "$" + s;
}

export default function LiveInvoice() {
  const [p, setP] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setP(1);
      return;
    }
    let raf = 0;
    let start = 0;
    const dur = 1300; // liquidación (cuenta de 0 → total)
    const hold = 3200; // pausa mostrando el total cuadrado
    const cycle = dur + hold;
    function tick(t) {
      if (!start) start = t;
      const elapsed = (t - start) % cycle; // bucle: se re-liquida
      if (elapsed < dur) {
        const k = elapsed / dur;
        setP(1 - Math.pow(1 - k, 3)); // easeOutCubic
      } else {
        setP(1);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const done = p >= 1;

  return (
    <div className={styles.invoice} aria-hidden>
      <div className={styles.invoiceHead}>
        <span className={styles.invoiceTitle}>Factura de venta</span>
        <span className={styles.invoiceTag}>#0142</span>
      </div>

      {LINES.map((l) => (
        <div className={styles.invoiceRow} key={l.label}>
          <span>{l.label}</span>
          <span>{formatCOP(l.value * p)}</span>
        </div>
      ))}

      <div className={styles.invoiceDivider} />

      <div className={styles.invoiceTotal}>
        <span className={styles.invoiceTotalLabel}>Total a cobrar</span>
        <span className={styles.invoiceTotalAmount}>{formatCOP(TOTAL * p)}</span>
      </div>

      <div className={styles.cuadra} data-done={done ? "true" : undefined}>
        <CheckIcon />
        Cuadra
      </div>
    </div>
  );
}
