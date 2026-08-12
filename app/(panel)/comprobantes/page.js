"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  listarComprobantes,
  reversarComprobante,
  anularComprobante,
  obtenerComprobante,
} from "@/lib/comprobantesApi";
import { generarComprobantePDF } from "@/lib/pdf/comprobantePdf";
import styles from "./comprobantes.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const ETIQUETA = {
  ingreso: { titulo: "Comprobantes de ingreso", singular: "Comprobante de ingreso", accion: "Registrar recaudo" },
  egreso: { titulo: "Comprobantes de egreso", singular: "Comprobante de egreso", accion: "Registrar pago" },
};

const BADGE = {
  borrador: { texto: "Borrador", clase: "borrador" },
  emitido: { texto: "Emitido", clase: "emitido" },
  anulado: { texto: "Anulado", clase: "anulado" },
  reversado: { texto: "Reversado", clase: "reversado" },
};

export default function ComprobantesPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tipo = sp.get("tipo") === "egreso" ? "egreso" : "ingreso";

  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState("");
  const [notif, setNotif] = useState(null);

  const recargar = useCallback(async () => {
    setDatos(await listarComprobantes({ tipo, estado }));
  }, [tipo, estado]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function avisar(mensaje, clase = "success") {
    setNotif({ mensaje, clase });
    setTimeout(() => setNotif(null), 5000);
  }

  async function reversar(c) {
    const motivo = prompt(
      `Reversar ${c.numero}. El comprobante no se borra: se emite otro que invierte los movimientos.\n\nMotivo:`
    );
    if (!motivo?.trim()) return;
    const res = await reversarComprobante(c.id, motivo);
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar(`Reversado con ${res.comprobante.numero}`);
  }

  // Se pide el detalle antes de imprimir: la lista no trae el asiento, y sin él el PDF
  // saldría sin la imputación contable ni el número de asiento del pie.
  async function descargarPDF(c) {
    const d = await obtenerComprobante(c.id);
    if (!d) return avisar("No se pudo cargar el comprobante.", "error");
    generarComprobantePDF(d.comprobante, { asiento: d.asiento, duplicado: true });
  }

  async function descartar(c) {
    if (!confirm("¿Descartar este borrador? No ha afectado los libros.")) return;
    const res = await anularComprobante(c.id, "Borrador descartado");
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar("Borrador descartado");
  }

  const lista = datos?.comprobantes || [];
  const t = datos?.totales;

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>{ETIQUETA[tipo].titulo}</h1>
          <p>
            {tipo === "ingreso"
              ? "Recaudos aplicados a facturas de venta."
              : "Pagos aplicados a compras de proveedores."}
          </p>
        </div>
        <button className="btn-primary" onClick={() => router.push(`/comprobantes/nuevo?tipo=${tipo}`)}>
          + {ETIQUETA[tipo].accion}
        </button>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tipo === "ingreso" ? styles.tabActivo : ""}`}
          onClick={() => router.push("/comprobantes?tipo=ingreso")}
        >
          Ingresos
        </button>
        <button
          className={`${styles.tab} ${tipo === "egreso" ? styles.tabActivo : ""}`}
          onClick={() => router.push("/comprobantes?tipo=egreso")}
        >
          Egresos
        </button>
        <select className={styles.filtro} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borradores</option>
          <option value="emitido">Emitidos</option>
          <option value="reversado">Reversados</option>
          <option value="anulado">Anulados</option>
        </select>
      </div>

      {t && (
        <section className={styles.stats}>
          <Stat label="Emitidos" valor={t.emitidos} />
          <Stat label="Valor bruto" valor={fmt(t.bruto)} chico />
          <Stat label="Retenciones" valor={fmt(t.retenciones)} chico />
          <Stat label={tipo === "ingreso" ? "Neto recibido" : "Neto pagado"} valor={fmt(t.neto)} chico destacado />
        </section>
      )}

      {datos === null ? (
        <div className={styles.vacio}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div className={styles.vacio}>
          <p>Todavía no hay {tipo === "ingreso" ? "recaudos" : "pagos"} registrados.</p>
          <button className="btn-secondary" onClick={() => router.push(`/comprobantes/nuevo?tipo=${tipo}`)}>
            {ETIQUETA[tipo].accion}
          </button>
        </div>
      ) : (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Tercero</th>
                <th>Documentos</th>
                <th>Bruto</th>
                <th>Retenc.</th>
                <th>Neto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const badge = BADGE[c.estado] || BADGE.borrador;
                return (
                  <tr key={c.id} className={c.estado === "reversado" || c.estado === "anulado" ? styles.inactivo : ""}>
                    <td>
                      <strong>{c.numero || "—"}</strong>
                      {c.reversaAId && <div className={styles.sub}>reversión</div>}
                    </td>
                    <td>{c.fecha}</td>
                    <td>
                      {c.terceroNombre}
                      {c.terceroDocumento && <div className={styles.sub}>{c.terceroDocumento}</div>}
                    </td>
                    <td className={styles.docs}>
                      {c.aplicaciones?.map((a) => a.docRef).join(", ") || "—"}
                    </td>
                    <td className={styles.monto}>{fmt(c.valorBruto)}</td>
                    <td className={styles.monto}>{Number(c.totalRetenciones) > 0 ? fmt(c.totalRetenciones) : "—"}</td>
                    <td className={`${styles.monto} ${styles.neto}`}>{fmt(c.neto)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[badge.clase]}`}>{badge.texto}</span>
                    </td>
                    <td>
                      <div className={styles.acciones}>
                        {c.estado === "borrador" && (
                          <>
                            <button onClick={() => router.push(`/comprobantes/${c.id}`)}>Revisar</button>
                            <button className={styles.del} onClick={() => descartar(c)}>Descartar</button>
                          </>
                        )}
                        {c.estado === "emitido" && (
                          <>
                            <button onClick={() => descargarPDF(c)}>PDF</button>
                            <button className={styles.del} onClick={() => reversar(c)}>Reversar</button>
                          </>
                        )}
                        {(c.estado === "reversado" || c.estado === "anulado") && (
                          <button onClick={() => descargarPDF(c)}>PDF</button>
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

function Stat({ label, valor, chico, destacado }) {
  return (
    <div className={`${styles.stat} ${destacado ? styles.statDestacado : ""}`}>
      <span className={chico ? styles.statValorChico : styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
