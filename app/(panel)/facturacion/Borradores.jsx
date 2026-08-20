"use client";

// Lista de borradores de factura.
//
// Va en su PROPIA pestaña, separada del historial fiscal, y no es un adorno de navegación: son
// dos poblaciones distintas. Aquí hay trabajo en curso que no existe para la DIAN; allá,
// documentos con número de resolución. Mezclarlos en una sola tabla haría que los totales del
// pie sumaran facturas que nunca se emitieron.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listarBorradores, eliminarBorrador } from "@/lib/borradoresFacturaApi";
import styles from "./facturacion.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

export default function Borradores({ onNotificar }) {
  const router = useRouter();
  const [estado, setEstado] = useState("");
  const [borradores, setBorradores] = useState(null);

  const recargar = useCallback(async () => {
    const { borradores } = await listarBorradores(estado || undefined);
    setBorradores(borradores);
  }, [estado]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function eliminar(b) {
    if (!confirm("¿Eliminar este borrador? No es un documento fiscal, así que se borra del todo."))
      return;
    const res = await eliminarBorrador(b.id);
    if (res.error) return onNotificar?.(res.error, "error");
    await recargar();
    onNotificar?.("Borrador eliminado");
  }

  if (borradores === null) return <div className={styles.empty}>Cargando...</div>;

  return (
    <>
      <div className={styles.subfiltros}>
        {[
          ["", "Activos"],
          ["borrador", "Sin revisar"],
          ["revisado", "Revisados"],
          ["emitido", "Ya emitidos"],
        ].map(([v, etiqueta]) => (
          <button
            key={v}
            className={estado === v ? styles.chipActivo : styles.chip}
            onClick={() => setEstado(v)}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {borradores.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {estado === "emitido"
              ? "Ningún borrador se ha emitido todavía."
              : "No hay borradores. Toda factura empieza aquí."}
          </p>
          <button className="btn-secondary" onClick={() => router.push("/facturacion/nueva")}>
            Crear un borrador
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Pendientes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {borradores.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.clienteNombre || "(sin cliente)"}</strong>
                    <div className={styles.sub}>
                      {(b.items || []).length} línea{(b.items || []).length === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td>{b.fecha || "—"}</td>
                  <td>
                    {b.estado === "emitido" ? (
                      <span className="badge-estado inactivo">
                        Emitido → {b.factura?.numeroCompleto}
                      </span>
                    ) : (
                      <span
                        className={`badge-estado ${b.estado === "revisado" ? "activo" : "inactivo"}`}
                      >
                        {b.estado === "revisado" ? "Revisado" : "Borrador"}
                      </span>
                    )}
                    {b.estado === "revisado" && b.totalRevisado != null && (
                      <div className={styles.sub}>Revisado por {fmt(b.totalRevisado)}</div>
                    )}
                  </td>
                  <td>
                    {/* Lo que falta NO es un error: es una tarea. Se muestra para que se pueda
                        ver de un vistazo cuál está listo para revisar y cuál no. */}
                    {b.estado === "emitido" ? (
                      <span className={styles.sub}>—</span>
                    ) : b.pendientes?.length ? (
                      <span className={styles.sub}>{b.pendientes.join(" · ")}</span>
                    ) : (
                      <span className={styles.sub}>Listo para emitir</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      <button onClick={() => router.push(`/facturacion/nueva?borrador=${b.id}`)}>
                        {b.estado === "emitido" ? "Ver" : "Abrir"}
                      </button>
                      {b.estado !== "emitido" && (
                        <button className={styles.del} onClick={() => eliminar(b)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
