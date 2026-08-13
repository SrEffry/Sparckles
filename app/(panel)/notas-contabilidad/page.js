"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarNotasContabilidad,
  obtenerNotaContabilidad,
  reversarNotaContabilidad,
  descartarNotaContabilidad,
} from "@/lib/notasContabilidadApi";
import { generarNotaContabilidadPDF } from "@/lib/pdf/notaContabilidadPdf";
import { TIPOS_AJUSTE, nombreTipoAjuste } from "@/lib/notaContabilidadValidation";
import styles from "./notas.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const BADGE = {
  borrador: { texto: "Borrador", clase: "borrador" },
  emitido: { texto: "Emitida", clase: "emitido" },
  reversado: { texto: "Reversada", clase: "reversado" },
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function periodoLargo(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(p || "");
  return m ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : p || "—";
}

export default function NotasContabilidadPage() {
  const router = useRouter();
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tipoAjuste, setTipoAjuste] = useState("");
  const [q, setQ] = useState("");
  const [notif, setNotif] = useState(null);

  const recargar = useCallback(async () => {
    setDatos(await listarNotasContabilidad({ estado, periodo, tipoAjuste, q }));
  }, [estado, periodo, tipoAjuste, q]);

  useEffect(() => {
    const t = setTimeout(recargar, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [recargar, q]);

  function avisar(mensaje, clase = "success") {
    setNotif({ mensaje, clase });
    setTimeout(() => setNotif(null), 5000);
  }

  async function descargarPDF(n) {
    // El detalle trae el asiento, que la lista no carga y el pie del PDF necesita.
    const d = await obtenerNotaContabilidad(n.id);
    if (!d) return avisar("No se pudo cargar la nota.", "error");
    generarNotaContabilidadPDF(d.nota, { asiento: d.asiento });
  }

  async function reversar(n) {
    const motivo = prompt(
      `Reversar ${n.numero}. La nota no se borra: se emite otra que invierte los movimientos y ambas quedan en el libro.\n\nMotivo:`
    );
    if (!motivo?.trim()) return;
    const res = await reversarNotaContabilidad(n.id, motivo);
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar(`Reversada con ${res.nota.numero}`);
  }

  async function descartar(n) {
    if (!confirm("¿Descartar este borrador? No ha afectado los libros.")) return;
    const res = await descartarNotaContabilidad(n.id);
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar("Borrador descartado");
  }

  const lista = datos?.notas || [];
  const t = datos?.totales;

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Notas de contabilidad</h1>
          <p>
            El comprobante con el que se registran los ajustes: reclasificaciones, provisiones,
            depreciación y amortización, causación de diferidos, cierres y corrección de errores.
          </p>
        </div>
        <button className="btn-primary" onClick={() => router.push("/notas-contabilidad/nueva")}>
          + Nueva nota
        </button>
      </header>

      <div className={styles.avisoAlcance}>
        <strong>No uses una nota para lo que ya tiene documento propio.</strong> Las ventas van en
        Facturación, las compras en Compras, los recaudos y pagos en Comprobantes de tesorería y la
        nómina en su módulo. La nota es solo para ajustes sin documento externo.
      </div>

      {t && (
        <section className={styles.stats}>
          <Stat label="Borradores" valor={t.borradores} />
          <Stat label="Emitidas" valor={t.emitidas} />
          <Stat label="Reversadas" valor={t.reversadas} />
        </section>
      )}

      <div className={styles.filtros}>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borradores</option>
          <option value="emitido">Emitidas</option>
          <option value="reversado">Reversadas</option>
        </select>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="">Todos los periodos</option>
          {(datos?.periodos || []).map((p) => (
            <option key={p} value={p}>
              {periodoLargo(p)}
            </option>
          ))}
        </select>
        <select value={tipoAjuste} onChange={(e) => setTipoAjuste(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS_AJUSTE.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre}
            </option>
          ))}
        </select>
        <input placeholder="Buscar por número, concepto o referencia…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {datos === null ? (
        <div className={styles.vacio}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div className={styles.vacio}>
          <p>No hay notas de contabilidad con esos filtros.</p>
          <button className="btn-secondary" onClick={() => router.push("/notas-contabilidad/nueva")}>
            Crear la primera
          </button>
        </div>
      ) : (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Periodo</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((n) => {
                const badge = BADGE[n.estado] || BADGE.borrador;
                return (
                  <tr key={n.id} className={n.estado === "reversado" ? styles.inactivo : ""}>
                    <td>
                      <strong>{n.numero || "—"}</strong>
                      {n.reversaAId && <div className={styles.sub}>reversión</div>}
                    </td>
                    <td>{n.fecha}</td>
                    <td>{periodoLargo(n.periodoAfectado)}</td>
                    <td>{nombreTipoAjuste(n.tipoAjuste) || "—"}</td>
                    <td className={styles.concepto}>{n.concepto}</td>
                    <td className={styles.monto}>{fmt(n.totalDebitos)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[badge.clase]}`}>{badge.texto}</span>
                    </td>
                    <td>
                      <div className={styles.acciones}>
                        <button onClick={() => router.push(`/notas-contabilidad/${n.id}`)}>
                          {n.estado === "borrador" ? "Revisar" : "Ver"}
                        </button>
                        {n.estado === "borrador" ? (
                          <button className={styles.del} onClick={() => descartar(n)}>
                            Descartar
                          </button>
                        ) : (
                          <>
                            <button onClick={() => descargarPDF(n)}>PDF</button>
                            {n.estado === "emitido" && (
                              <button className={styles.del} onClick={() => reversar(n)}>
                                Reversar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {notif && <div className={`${styles.toast} ${styles[notif.clase]}`}>{notif.mensaje}</div>}
    </div>
  );
}

function Stat({ label, valor }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
