"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { obtenerComprobante, obtenerPropuesta, emitirComprobante } from "@/lib/comprobantesApi";
import { generarComprobantePDF } from "@/lib/pdf/comprobantePdf";
import { buscarCuentas } from "@/lib/asientosApi";
import { obtenerMapaCuentas } from "@/lib/mapaCuentasApi";
import { numeroALetras } from "@/lib/numeroALetras";
import { previsualizarSoporte, generarSoporte } from "@/lib/soporteDesdeComprobanteApi";
import styles from "../comprobantes.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(
    Number(v) || 0
  );
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Revisión del comprobante. El asiento se muestra EDITABLE antes de contabilizar: el sistema
// propone, el contador decide. Nada afecta los libros hasta pulsar "Contabilizar".
export default function ComprobanteDetallePage() {
  const router = useRouter();
  const { id } = useParams();

  const [datos, setDatos] = useState(null);
  const [sector, setSector] = useState("comercial");
  const [movimientos, setMovimientos] = useState([]);
  const [advertencias, setAdvertencias] = useState([]);
  const [errorPropuesta, setErrorPropuesta] = useState("");
  const [error, setError] = useState("");
  const [emitiendo, setEmitiendo] = useState(false);
  // Legalización del pago con un documento soporte (solo egresos emitidos).
  const [legalizacion, setLegalizacion] = useState(null);
  const [formSoporte, setFormSoporte] = useState(null);
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    const [d, m] = await Promise.all([obtenerComprobante(id), obtenerMapaCuentas()]);
    if (!d) return;
    setDatos(d);
    setSector(m?.mapa?.sector || "comercial");

    if (d.comprobante.estado === "borrador") {
      const p = await obtenerPropuesta(id);
      if (p.error) setErrorPropuesta(p.error);
      else {
        setMovimientos(p.movimientos);
        setAdvertencias(p.advertencias || []);
      }
      // No se consulta la legalización de un borrador: todavía no hay pago que legalizar.
    } else if (d.asiento) {
      setMovimientos(
        d.asiento.movimientos.map((m) => ({
          cuenta: m.cuenta,
          nombreCuenta: m.nombreCuenta,
          debito: Number(m.debito),
          credito: Number(m.credito),
        }))
      );
    }

    // Solo un EGRESO emitido puede legalizarse con un documento soporte. En el ingreso no
    // aplica: el espejo sería emitir una factura de venta, y esa se emite por la operación,
    // no por el cobro (Art. 616-1 E.T.), así que fecharla en el recaudo sería incorrecto.
    if (d.comprobante.tipo === "egreso" && d.comprobante.estado === "emitido") {
      setLegalizacion(await previsualizarSoporte(id));
    }
  }, [id]);

  async function crearSoporte() {
    setGenerando(true);
    const res = await generarSoporte(id, formSoporte);
    setGenerando(false);
    if (res.error) return setError(res.error);
    setFormSoporte(null);
    await cargar();
  }

  useEffect(() => {
    cargar();
  }, [cargar]);

  const balance = useMemo(() => {
    const debitos = r2(movimientos.reduce((a, m) => a + Number(m.debito || 0), 0));
    const creditos = r2(movimientos.reduce((a, m) => a + Number(m.credito || 0), 0));
    return { debitos, creditos, diferencia: r2(Math.abs(debitos - creditos)) };
  }, [movimientos]);

  async function contabilizar() {
    setError("");
    if (balance.diferencia > 0.01) {
      return setError(`El asiento no cuadra: débitos ${fmt(balance.debitos)} vs créditos ${fmt(balance.creditos)}.`);
    }
    if (!confirm("Al contabilizar se asigna el consecutivo y se crea el asiento. Ya no se podrá editar, solo reversar.\n\n¿Continuar?")) return;

    setEmitiendo(true);
    const res = await emitirComprobante(id, movimientos);
    setEmitiendo(false);
    if (res.error) return setError(res.error);
    await cargar();
  }

  if (!datos) return <div className={styles.vacio}>Cargando…</div>;

  const c = datos.comprobante;
  const esBorrador = c.estado === "borrador";
  const esIngreso = c.tipo === "ingreso";

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>
            {esIngreso ? "Comprobante de ingreso" : "Comprobante de egreso"}
            {c.numero && <span className={styles.numeroGrande}> {c.numero}</span>}
          </h1>
          <p>
            {esBorrador
              ? "Borrador. Todavía no afecta los libros."
              : `${c.estado === "reversado" ? "Reversado" : "Contabilizado"} · asiento ${c.numero}`}
          </p>
        </div>
        <div className={styles.headAcciones}>
          {/* Se pasa el asiento: sin él el impreso no lleva la imputación contable ni el
              número de asiento, que es justo lo que reemplaza al bloque de firma
              "Contabilizado" y da la trazabilidad que exige el art. 124. */}
          {!esBorrador && !esIngreso && legalizacion?.soporteExistente && (
            <button
              className="btn-secondary"
              onClick={() => router.push("/documentos-soportes")}
            >
              Ver {legalizacion.soporteExistente.numero}
            </button>
          )}
          {!esBorrador && !esIngreso && !legalizacion?.soporteExistente && legalizacion?.propuesta && (
            <button
              className="btn-primary"
              onClick={() =>
                setFormSoporte({
                  fechaOperacion: legalizacion.propuesta.fecha,
                  concepto: legalizacion.propuesta.concepto,
                  proveedorTipoDocumento: "CC",
                })
              }
            >
              Generar documento soporte
            </button>
          )}
          {!esBorrador && (
            <button
              className="btn-secondary"
              onClick={() => generarComprobantePDF(c, { asiento: datos.asiento })}
            >
              Descargar PDF
            </button>
          )}
          <button className="btn-secondary" onClick={() => router.push(`/comprobantes?tipo=${c.tipo}`)}>
            ← Volver
          </button>
        </div>
      </header>

      <div className={styles.columnas}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitulo}>Datos del comprobante</h2>
          <dl className={styles.datos}>
            <Dato k="Fecha" v={c.fecha} />
            <Dato k={esIngreso ? "Recibido de" : "Pagado a"} v={c.terceroNombre} />
            <Dato k="NIT / C.C." v={c.terceroDocumento} />
            <Dato k="Medio de pago" v={c.medioPago} />
            <Dato k="Caja o banco" v={c.cuentaTesoreriaNombre} />
            <Dato k="N.º transacción" v={c.numTransaccion} />
            <Dato k="Ciudad" v={c.ciudad} />
          </dl>

          <div className={styles.conceptoBox}>
            <span className={styles.campoLabel}>Concepto</span>
            <p>{c.concepto}</p>
          </div>

          <h3 className={styles.subTitulo}>Documentos aplicados</h3>
          <table className={styles.tablaDocs}>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Valor</th>
                <th>Saldo antes</th>
                <th>Aplicado</th>
                <th>Saldo después</th>
              </tr>
            </thead>
            <tbody>
              {c.aplicaciones?.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.docRef}</strong></td>
                  <td className={styles.monto}>{fmt(a.valorDocumento)}</td>
                  <td className={styles.monto}>{fmt(a.saldoAnterior)}</td>
                  <td className={styles.monto}>{fmt(a.valorAplicado)}</td>
                  <td className={styles.monto}>{fmt(a.saldoNuevo)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {c.retenciones?.length > 0 && (
            <>
              <h3 className={styles.subTitulo}>Retenciones</h3>
              <table className={styles.tablaDocs}>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Base</th>
                    <th>Tarifa</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {c.retenciones.map((r) => (
                    <tr key={r.id}>
                      <td>{{ retefuente: "ReteFuente", reteiva: "ReteIVA", reteica: "ReteICA" }[r.tipo]}</td>
                      <td>{r.concepto || "—"}</td>
                      <td className={styles.monto}>{fmt(r.base)}</td>
                      <td className={styles.monto}>{Number(r.tarifa)}{r.unidad}</td>
                      <td className={styles.monto}>{fmt(r.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className={styles.resumen}>
            <div className={styles.resumenFila}>
              <span>Valor bruto</span>
              <strong>{fmt(c.valorBruto)}</strong>
            </div>
            {Number(c.totalRetenciones) > 0 && (
              <div className={styles.resumenFila}>
                <span>Retenciones</span>
                <strong>−{fmt(c.totalRetenciones)}</strong>
              </div>
            )}
            <div className={`${styles.resumenFila} ${styles.resumenTotal}`}>
              <span>{esIngreso ? "Neto recibido" : "Neto pagado"}</span>
              <strong>{fmt(c.neto)}</strong>
            </div>
            <p className={styles.letras}>{numeroALetras(c.neto)}</p>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitulo}>
            {esBorrador ? "Asiento propuesto" : "Asiento contabilizado"}
          </h2>

          {esBorrador && (
            <p className={styles.pista}>
              El sistema propone este asiento desde tu mapa de cuentas. <strong>Revísalo y
              ajústalo</strong> si hace falta: una vez contabilizado solo se corrige por reversión.
            </p>
          )}

          {errorPropuesta ? (
            <div className={styles.alerta}>
              <strong>No se pudo proponer el asiento.</strong> {errorPropuesta}
              <button className={styles.enlace} onClick={() => router.push("/configuracion/cuentas")}>
                Ir al mapa de cuentas →
              </button>
            </div>
          ) : (
            <>
              {advertencias.map((a, i) => (
                <div key={i} className={styles.advertencia}>
                  <span>!</span>
                  <span>{a}</span>
                </div>
              ))}

              {/* El sector sale del mapa de cuentas: un borrador no tiene asiento todavía, y
                  cablear "comercial" hacía que un usuario ESAL buscara en el catálogo
                  equivocado y la emisión le rechazara las cuentas. */}
              <TablaMovimientos
                movimientos={movimientos}
                editable={esBorrador}
                sector={sector}
                onCambio={setMovimientos}
              />

              <div className={`${styles.balance} ${balance.diferencia > 0.01 ? styles.balanceMal : ""}`}>
                <span>Sumas iguales</span>
                <span>{fmt(balance.debitos)}</span>
                <span>{fmt(balance.creditos)}</span>
              </div>
              {balance.diferencia > 0.01 && (
                <p className={styles.errorChico}>Diferencia de {fmt(balance.diferencia)}. El asiento debe cuadrar.</p>
              )}

              {error && <div className="mensaje-error">{error}</div>}

              {esBorrador && (
                <div className={styles.accionesPie}>
                  <button
                    className="btn-primary"
                    onClick={contabilizar}
                    disabled={emitiendo || balance.diferencia > 0.01 || movimientos.length < 2}
                  >
                    {emitiendo ? "Contabilizando…" : "Contabilizar comprobante"}
                  </button>
                </div>
              )}
            </>
          )}

          {!esBorrador && (
            <div className={styles.firmas}>
              <div>
                <span className={styles.campoLabel}>Elaborado por</span>
                <strong>{c.elaboradoPor || "—"}</strong>
              </div>
              <div>
                <span className={styles.campoLabel}>Autorizado por</span>
                <strong>{c.autorizadoPor || "—"}</strong>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Legalizar el pago: no convierte el comprobante, CREA un documento soporte con la
          información de la operación. El comprobante sigue siendo la prueba del pago. */}
      {formSoporte && (
        <div className="modal-overlay" onClick={() => setFormSoporte(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2>Generar documento soporte</h2>
              <button className="modal-close" onClick={() => setFormSoporte(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className={styles.avisoAlcance}>
                El comprobante <strong>{c.numero}</strong> no se transforma: sigue siendo la prueba
                del pago. Se crea un documento soporte con la información de la operación, y los dos
                quedan enlazados.
              </div>

              {(legalizacion?.avisos || []).map((a) => (
                <div key={a} className={styles.advertencia}>
                  <span>!</span>
                  <span>{a}</span>
                </div>
              ))}

              <div className={styles.campo}>
                <label className={styles.campoLabel}>
                  Fecha de la operación *
                  <span className={styles.ayuda} title="No es la fecha del pago: es cuándo se recibió el bien o el servicio. El art. 1.6.1.4.12 del DUT la exige, y de ella sale la fecha del asiento.">
                    ?
                  </span>
                </label>
                <input
                  type="date"
                  value={formSoporte.fechaOperacion}
                  max={c.fecha}
                  onChange={(e) => setFormSoporte((f) => ({ ...f, fechaOperacion: e.target.value }))}
                />
              </div>

              <div className={styles.campo}>
                <label className={styles.campoLabel}>Tipo de documento del proveedor</label>
                <select
                  value={formSoporte.proveedorTipoDocumento}
                  onChange={(e) => setFormSoporte((f) => ({ ...f, proveedorTipoDocumento: e.target.value }))}
                >
                  {["CC", "NIT", "CE", "PA", "TI"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>

              <div className={styles.campo}>
                <label className={styles.campoLabel}>
                  Descripción del bien o servicio *
                  <span className={styles.ayuda} title="El concepto del pago explica el movimiento de dinero; el documento soporte necesita saber QUÉ se adquirió.">
                    ?
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={formSoporte.concepto}
                  onChange={(e) => setFormSoporte((f) => ({ ...f, concepto: e.target.value }))}
                  placeholder="Transporte de mercancía Montería–Cereté, 12 de marzo"
                />
              </div>

              <div className={styles.resumen}>
                <div className={styles.resumenFila}>
                  <span>Valor de la operación</span>
                  <strong>{fmt(legalizacion?.propuesta?.bruto)}</strong>
                </div>
                {Number(legalizacion?.propuesta?.reteFuente) > 0 && (
                  <div className={styles.resumenFila}>
                    <span>(−) ReteFuente ya practicada</span>
                    <strong>{fmt(legalizacion.propuesta.reteFuente)}</strong>
                  </div>
                )}
                {Number(legalizacion?.propuesta?.reteIca) > 0 && (
                  <div className={styles.resumenFila}>
                    <span>(−) ReteICA ya practicada</span>
                    <strong>{fmt(legalizacion.propuesta.reteIca)}</strong>
                  </div>
                )}
                <div className={`${styles.resumenFila} ${styles.resumenTotal}`}>
                  <span>Neto pagado</span>
                  <strong>{fmt(legalizacion?.propuesta?.neto)}</strong>
                </div>
                <p className={styles.pista}>
                  Las retenciones se copian del comprobante, no se vuelven a liquidar. Ya se
                  certificaron con el pago, así que en el soporte quedan informativas: certificarlas
                  dos veces le daría al proveedor el doble de lo que se le retuvo.
                </p>
              </div>

              {error && <div className="mensaje-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setFormSoporte(null)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={crearSoporte} disabled={generando}>
                {generando ? "Generando…" : "Generar documento soporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TablaMovimientos({ movimientos, editable, sector, onCambio }) {
  return (
    <table className={styles.tablaAsiento}>
      <thead>
        <tr>
          <th>Cuenta</th>
          <th>Detalle</th>
          <th>Débito</th>
          <th>Crédito</th>
          {editable && <th></th>}
        </tr>
      </thead>
      <tbody>
        {movimientos.map((m, i) => (
          <tr key={i}>
            <td>
              <code>{m.cuenta}</code>
              <div className={styles.sub}>{m.nombreCuenta}</div>
            </td>
            <td className={styles.sub}>{m.detalle || "—"}</td>
            <td>
              {editable ? (
                <input
                  type="number"
                  step="0.01"
                  value={m.debito || ""}
                  onChange={(e) =>
                    onCambio(movimientos.map((x, j) => (j === i ? { ...x, debito: Number(e.target.value) || 0 } : x)))
                  }
                />
              ) : (
                <span className={styles.monto}>{m.debito ? fmt(m.debito) : "—"}</span>
              )}
            </td>
            <td>
              {editable ? (
                <input
                  type="number"
                  step="0.01"
                  value={m.credito || ""}
                  onChange={(e) =>
                    onCambio(movimientos.map((x, j) => (j === i ? { ...x, credito: Number(e.target.value) || 0 } : x)))
                  }
                />
              ) : (
                <span className={styles.monto}>{m.credito ? fmt(m.credito) : "—"}</span>
              )}
            </td>
            {editable && (
              <td>
                <button className={styles.del} onClick={() => onCambio(movimientos.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
      {editable && (
        <tfoot>
          <tr>
            <td colSpan={5}>
              <AgregarLinea sector={sector} onAgregar={(m) => onCambio([...movimientos, m])} />
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function AgregarLinea({ sector, onAgregar }) {
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState([]);

  useEffect(() => {
    if (q.trim().length < 2) return setOpciones([]);
    const t = setTimeout(() => buscarCuentas(sector, q).then((cs) => setOpciones(cs.slice(0, 12))), 220);
    return () => clearTimeout(t);
  }, [q, sector]);

  return (
    <div className={styles.agregarLinea}>
      <input placeholder="Agregar cuenta: busca por código o nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
      {opciones.length > 0 && (
        <div className={styles.opciones}>
          {opciones.map((c) => (
            <button
              key={c.codigo}
              type="button"
              onClick={() => {
                onAgregar({ cuenta: c.codigo, nombreCuenta: c.nombre, debito: 0, credito: 0, detalle: "" });
                setQ("");
                setOpciones([]);
              }}
            >
              <code>{c.codigo}</code> {c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Dato({ k, v }) {
  if (!v) return null;
  return (
    <div className={styles.dato}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
