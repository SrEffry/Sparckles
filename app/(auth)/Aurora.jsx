"use client";

import { useEffect, useRef } from "react";
import styles from "./auth.module.css";

/**
 * Aurora ambiente reactiva al puntero.
 * Los orbes flotan (CSS keyframes) y además hacen parallax siguiendo el cursor
 * con suavizado tipo resorte (rAF, sin librerías). Es puramente decorativo:
 * el contenido de la tarjeta nunca se mueve. Se desactiva en táctil y en
 * prefers-reduced-motion.
 */
export default function Aurora() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    const orbits = Array.from(el.querySelectorAll("[data-depth]"));
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;

    function onMove(e) {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    }
    function tick() {
      // suavizado exponencial ≈ resorte sin rebote: da inercia/lag natural
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      for (const o of orbits) {
        const d = parseFloat(o.dataset.depth);
        o.style.transform = `translate3d(${cur.x * d}px, ${cur.y * d}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.ambient} aria-hidden ref={ref}>
      <div className={styles.orbit} data-depth="46">
        <span className={styles.blob1} />
      </div>
      <div className={styles.orbit} data-depth="-58">
        <span className={styles.blob2} />
      </div>
      <div className={styles.orbit} data-depth="74">
        <span className={styles.blob3} />
      </div>
    </div>
  );
}
