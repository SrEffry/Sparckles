"use client";

// Hub de Contabilidad: lo que sostiene los libros, separado de lo que los mueve.
//
// Facturación y compras viven en Operaciones porque son operaciones del negocio. Lo de aquí es
// el aparato contable: el plan de cuentas, el mapa que traduce conceptos a cuentas, las notas
// de ajuste y el libro donde todo aterriza.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerResumen } from "@/lib/resumenApi";
import { obtenerMapaCuentas } from "@/lib/mapaCuentasApi";
import { listarPendientes, contabilizarPendientes } from "@/lib/contabilizarApi";
import { AsientosIcon, NotasIcon, ConfigIcon, ChevronIcon } from "../moduleIcons";
import styles from "../hubs.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function ContabilidadPage() {
  const router = useRouter();
  const [r, setR] = useState(null);
  const [mapa, setMapa] = useState(null);
  const [pendientes, setPendientes] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);

  const recargar = useCallback(async () => {
    const [resumen, m, p] = await Promise.all([obtenerResumen(), obtenerMapaCuentas(), listarPendientes()]);
    setR(resumen);
    setMapa(m);
    setPendientes(p);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function contabilizar() {
    setOcupado(true);
    const res = await contabilizarPendientes();
    setOcupado(false);
    if (res.error) return setAviso({ clase: "error", texto: res.error });
    await recargar();
    const detalle = Object.entries(res.porTipo || {})
      .map(([k, v]) => `${v} ${k.toLowerCase()}`)
      .join(", ");
    setAviso({
      clase: res.pendientes > 0 ? "parcial" : "ok",
      texto:
        res.contabilizados === 0
          ? "No se pudo contabilizar nada todavía."
          : `Se contabilizaron ${res.contabilizados} documentos${detalle ? ` (${detalle})` : ""}.`,
      faltantes: res.faltantes,
      pendientes: res.pendientes,
    });
  }

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

      {/* El hueco tiene que verse. Antes las ventas, las compras y la nómina no llegaban al
          libro por ninguna vía y nada lo decía; ahora, cuando no llegan, se dice aquí. */}
      {pendientes?.total > 0 && (
        <div className={styles.pendientes}>
          <div className={styles.pendientesTexto}>
            <strong>
              {pendientes.total} {pendientes.total === 1 ? "documento" : "documentos"} sin contabilizar.
            </strong>{" "}
            No están en el libro diario, casi siempre porque al emitirlos faltaba una cuenta del
            mapa.
            <ul className={styles.pendientesLista}>
              {pendientes.grupos.map((g) => (
                <li key={g.tipo}>
                  <strong>{g.cantidad}</strong> {g.etiqueta.toLowerCase()} —{" "}
                  <span className={styles.pendientesMuestra}>
                    {g.muestra.map((m) => `${m.ref} (${fmt(m.valor)})`).join(", ")}
                    {g.cantidad > g.muestra.length ? ` y ${g.cantidad - g.muestra.length} más` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button className="btn-primary" onClick={contabilizar} disabled={ocupado}>
            {ocupado ? "Contabilizando…" : "Contabilizar todo"}
          </button>
        </div>
      )}

      {aviso && (
        <div className={aviso.clase === "error" ? styles.avisoError : styles.aviso}>
          {aviso.texto}
          {aviso.pendientes > 0 && (
            <>
              {" "}
              Quedan {aviso.pendientes} sin contabilizar porque falta:{" "}
              <strong>{(aviso.faltantes || []).join(", ")}</strong>.{" "}
              <button className={styles.avisoEnlace} onClick={() => router.push("/configuracion/cuentas")}>
                Completar el mapa
              </button>
            </>
          )}
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
