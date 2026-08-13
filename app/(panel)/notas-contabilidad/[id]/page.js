"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NotaEditor from "../NotaEditor";
import {
  obtenerNotaContabilidad,
  guardarNotaContabilidad,
  emitirNotaContabilidad,
  reversarNotaContabilidad,
  descartarNotaContabilidad,
} from "@/lib/notasContabilidadApi";
import { generarNotaContabilidadPDF } from "@/lib/pdf/notaContabilidadPdf";
import { nombreTipoAjuste } from "@/lib/notaContabilidadValidation";
import { numeroALetras } from "@/lib/numeroALetras";
import styles from "../notas.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function periodoLargo(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(p || "");
  return m ? `${MESES[Number(m[2]) - 1]} de ${m[1]}` : p || "—";
}

export default function NotaContabilidadPage() {
  const router = useRouter();
  const { id } = useParams();
  const [datos, setDatos] = useState(undefined);
  const [ocupado, setOcupado] = useState(false);
  const [notif, setNotif] = useState(null);

  const recargar = useCallback(async () => {
    setDatos(await obtenerNotaContabilidad(id));
  }, [id]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function avisar(mensaje, clase = "success") {
    setNotif({ mensaje, clase });
    setTimeout(() => setNotif(null), 6000);
  }

  if (datos === undefined) return <div className={styles.vacio}>Cargando…</div>;
  if (!datos) return <div className={styles.vacio}>Nota no encontrada.</div>;

  const { nota, asiento, blindadas } = datos;
  const esBorrador = nota.estado === "borrador";

  async function emitir() {
    if (
      !confirm(
        "Al emitir, la nota toma su número consecutivo y genera el asiento en el libro diario. A partir de ahí no se edita: si hay un error se reversa con un contraasiento.\n\n¿Emitir?"
      )
    )
      return;
    setOcupado(true);
    const res = await emitirNotaContabilidad(id);
    setOcupado(false);
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar(`Nota ${res.nota.numero} emitida`);
  }

  async function reversar() {
    const motivo = prompt(
      `Reversar ${nota.numero}. Se emite otra nota que invierte los movimientos; ambas quedan en el libro.\n\nMotivo:`
    );
    if (!motivo?.trim()) return;
    const res = await reversarNotaContabilidad(id, motivo);
    if (res.error) return avisar(res.error, "error");
    avisar(`Reversada con ${res.nota.numero}`);
    router.push(`/notas-contabilidad/${res.nota.id}`);
  }

  async function descartar() {
    if (!confirm("¿Descartar este borrador? No ha afectado los libros.")) return;
    const res = await descartarNotaContabilidad(id);
    if (res.error) return avisar(res.error, "error");
    router.push("/notas-contabilidad");
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>
            {esBorrador ? "Borrador de nota" : "Nota "}
            {nota.numero && <span className={styles.numeroGrande}>{nota.numero}</span>}
          </h1>
          <p>
            {esBorrador
              ? "Revisa la imputación antes de emitir. Todavía no ha tocado los libros."
              : `${nombreTipoAjuste(nota.tipoAjuste) || "Ajuste"} sobre ${periodoLargo(nota.periodoAfectado)}.`}
          </p>
        </div>
        <div className={styles.headAcciones}>
          <button className="btn-secondary" onClick={() => router.push("/notas-contabilidad")}>
            Volver
          </button>
          {!esBorrador && (
            <button className="btn-secondary" onClick={() => generarNotaContabilidadPDF(nota, { asiento })}>
              Descargar PDF
            </button>
          )}
        </div>
      </header>

      {nota.estado === "reversado" && (
        <div className={styles.advertencia}>
          Esta nota fue reversada{nota.motivoReversion ? `: ${nota.motivoReversion}` : "."} Sus movimientos siguen en
          el libro junto con el contraasiento que los anula.
        </div>
      )}
      {nota.reversaAId && (
        <div className={styles.alerta}>
          Esta nota es la reversión de otra: invierte sus débitos y créditos.
        </div>
      )}

      {esBorrador ? (
        <>
          <NotaEditor
            nota={nota}
            sector={nota.sector}
            blindadas={blindadas}
            onGuardar={async (payload) => {
              const res = await guardarNotaContabilidad(id, payload);
              if (res.error) return res;
              await recargar();
              avisar("Borrador guardado");
              return {};
            }}
          />
          <div className={styles.accionesPie}>
            <button className={styles.del} onClick={descartar} disabled={ocupado}>
              Descartar borrador
            </button>
            <button className="btn-primary" onClick={emitir} disabled={ocupado}>
              {ocupado ? "Emitiendo…" : "Emitir y contabilizar"}
            </button>
          </div>
        </>
      ) : (
        <>
          <section className={styles.panel}>
            <h2 className={styles.panelTitulo}>Datos de la nota</h2>
            <dl className={styles.datos}>
              <div className={styles.dato}>
                <dt>Fecha</dt>
                <dd>{nota.fecha}</dd>
              </div>
              <div className={styles.dato}>
                <dt>Periodo afectado</dt>
                <dd>{periodoLargo(nota.periodoAfectado)}</dd>
              </div>
              <div className={styles.dato}>
                <dt>Tipo de ajuste</dt>
                <dd>{nombreTipoAjuste(nota.tipoAjuste) || "—"}</dd>
              </div>
              <div className={styles.dato}>
                <dt>Documento de referencia</dt>
                <dd>{nota.documentoRef || "—"}</dd>
              </div>
              <div className={styles.dato}>
                <dt>Asiento</dt>
                <dd>{asiento?.numero || "—"}</dd>
              </div>
            </dl>
            <p className={styles.conceptoBox}>{nota.concepto}</p>
            {nota.anexos && (
              <p className={styles.ayudaTipo} style={{ marginTop: 8 }}>
                Anexos que lo soportan: {nota.anexos}
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitulo}>Imputación contable</h2>
            <div className={styles.tablaWrap} style={{ border: "none" }}>
              <table className={styles.tabla} style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th>Tercero</th>
                    <th style={{ textAlign: "right" }}>Débito</th>
                    <th style={{ textAlign: "right" }}>Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {nota.movimientos.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.cuenta}</strong>
                        <div className={styles.sub}>{m.nombreCuenta}</div>
                      </td>
                      <td>{m.tercero || "—"}</td>
                      <td className={styles.monto}>{Number(m.debito) > 0 ? fmt(m.debito) : "—"}</td>
                      <td className={styles.monto}>{Number(m.credito) > 0 ? fmt(m.credito) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>
                      <strong>Sumas iguales</strong>
                    </td>
                    <td className={styles.monto}>
                      <strong>{fmt(nota.totalDebitos)}</strong>
                    </td>
                    <td className={styles.monto}>
                      <strong>{fmt(nota.totalCreditos)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className={styles.letras}>Son: {numeroALetras(nota.totalDebitos)}</p>

            <div className={styles.accionesPie}>
              {nota.estado === "emitido" && (
                <button className={styles.del} onClick={reversar}>
                  Reversar
                </button>
              )}
            </div>
            <p className={styles.ayudaTipo} style={{ textAlign: "right" }}>
              Elaborada por {nota.elaboradoPor || "—"}
              {nota.autorizadoPor ? ` · autorizada por ${nota.autorizadoPor}` : ""}
            </p>
          </section>
        </>
      )}

      {notif && <div className={`${styles.toast} ${styles[notif.clase]}`}>{notif.mensaje}</div>}
    </div>
  );
}
