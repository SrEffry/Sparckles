"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarTercerosRetenidos,
  previsualizarCertificado,
  expedirCertificado,
  anularCertificado,
} from "@/lib/certificadosApi";
import { generarCertificadoPDF } from "@/lib/pdf/certificadoPdf";
import { hoyBogota } from "@/lib/fechas";
import styles from "./certificados.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const TIPOS = [
  { id: "retefuente", label: "ReteFuente" },
  { id: "reteiva", label: "ReteIVA" },
  { id: "reteica", label: "ReteICA" },
];

export default function CertificadosRetencionPage() {
  const router = useRouter();
  const anioActual = Number(hoyBogota().slice(0, 4));

  const [anio, setAnio] = useState(anioActual);
  const [tipo, setTipo] = useState("retefuente");
  const [periodo, setPeriodo] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [datos, setDatos] = useState(null);
  const [busca, setBusca] = useState("");
  const [seleccion, setSeleccion] = useState(null); // documento del tercero
  const [detalle, setDetalle] = useState(null);
  const [ciudad, setCiudad] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [notif, setNotif] = useState(null);

  useEffect(() => {
    setDatos(null);
    setSeleccion(null);
    setDetalle(null);
    listarTercerosRetenidos(anio).then(setDatos);
  }, [anio]);

  // Cambiar de tipo invalida el periodo y el municipio del tipo anterior.
  useEffect(() => {
    setPeriodo("");
    setMunicipio("");
  }, [tipo]);

  const cargarDetalle = useCallback(async () => {
    if (!seleccion) return setDetalle(null);
    const d = await previsualizarCertificado({ anio, terceroDoc: seleccion, tipo, periodo, municipio });
    setDetalle(d);
    if (!d.error) setCiudad((c) => c || d.emisor?.ciudad || "");
  }, [anio, seleccion, tipo, periodo, municipio]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  function avisar(mensaje, clase = "success") {
    setNotif({ mensaje, clase });
    setTimeout(() => setNotif(null), 7000);
  }

  const terceros = datos?.terceros || [];
  const visibles = useMemo(() => {
    const lista = terceros.filter((t) => Number(t[tipo]) > 0);
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((t) => t.nombre.toLowerCase().includes(q) || (t.documento || "").includes(q));
  }, [terceros, tipo, busca]);

  async function expedir() {
    setOcupado(true);
    const res = await expedirCertificado({
      anio,
      terceroDoc: seleccion,
      tipo,
      periodo,
      municipio,
      ciudadConsignacion: ciudad,
    });
    setOcupado(false);
    if (res.error) return avisar(res.error, "error");
    await Promise.all([cargarDetalle(), listarTercerosRetenidos(anio).then(setDatos)]);
    avisar(`Certificado ${res.certificado.numero} expedido`);
    generarCertificadoPDF(res.certificado);
  }

  async function anular(c) {
    const motivo = prompt(
      `Anular ${c.numero}. El número queda ocupado y el certificado se conserva marcado como anulado. Después expide uno nuevo con los datos corregidos.\n\nMotivo:`
    );
    if (!motivo?.trim()) return;
    const res = await anularCertificado(c.id, motivo);
    if (res.error) return avisar(res.error, "error");
    await Promise.all([cargarDetalle(), listarTercerosRetenidos(anio).then(setDatos)]);
    avisar(`Certificado ${c.numero} anulado`);
  }

  const conceptos = detalle?.conceptos || [];
  const faltantes = detalle?.faltantes || [];
  const plazo = detalle?.plazo;
  const puedeExpedir = !detalle?.error && conceptos.length > 0 && faltantes.length === 0 && !ocupado;
  const esIva = tipo === "reteiva";
  const municipiosIca = (detalle?.municipios || []).filter(Boolean);

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Certificados de retención</h1>
          <p>
            Lo que le retuviste a cada tercero, listo para certificar. Sale de las retenciones
            practicadas en compras, documentos soporte y comprobantes de egreso.
          </p>
        </div>
      </header>

      <div className={styles.controles}>
        {TIPOS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tipo === t.id ? styles.tabActivo : ""}`}
            onClick={() => setTipo(t.id)}
          >
            {t.label}
          </button>
        ))}
        <select className={styles.anio} value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n} value={anioActual - n}>
              Año gravable {anioActual - n}
            </option>
          ))}
        </select>
      </div>

      {/* El Art. 667 sanciona con el 5% de los PAGOS, no de lo retenido. Se dice antes de que
          se venza el plazo, no después. */}
      {datos?.pendientes?.terceros > 0 && (
        <div className={styles.alertaPlazo}>
          <strong>
            {datos.pendientes.terceros}{" "}
            {datos.pendientes.terceros === 1 ? "tercero pendiente" : "terceros pendientes"} por certificar en{" "}
            {anio}.
          </strong>{" "}
          Son {fmt(datos.pendientes.pagosExpuestos)} en pagos: no expedir el certificado cuesta el 5%
          (≈ {fmt(datos.pendientes.sancionEstimada)}) según el Art. 667 E.T.
        </div>
      )}

      {tipo === "retefuente" && (
        <div className={styles.aviso}>
          Este certificado cubre el <strong>Art. 381 E.T.</strong> (retenciones distintas a las de
          rentas de trabajo). El certificado de <strong>ingresos y retenciones laborales</strong>{" "}
          (Arts. 378-379) usa el Formulario 220 de la DIAN y no se genera aquí.
        </div>
      )}
      {tipo === "reteica" && (
        <div className={styles.aviso}>
          El ICA se declara en el <strong>municipio donde se practicó</strong>, y cada municipio fija
          su propio plazo. Si retuviste en varios, expide un certificado por cada uno.
        </div>
      )}

      <div className={styles.columnas}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitulo}>Terceros con retención</h2>
          <input
            className={styles.buscar}
            placeholder="Buscar por nombre o documento…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {datos === null ? (
            <div className={styles.vacio}>Cargando…</div>
          ) : visibles.length === 0 ? (
            <div className={styles.vacio}>
              No hay {TIPOS.find((t) => t.id === tipo).label} practicada en {anio}.
            </div>
          ) : (
            <div className={styles.terceros}>
              {visibles.map((t) => {
                const pendiente = t.pendientes?.includes(tipo);
                return (
                  <button
                    key={t.documento || "sin-doc"}
                    className={`${styles.tercero} ${seleccion === t.documento ? styles.terceroActivo : ""} ${
                      t.documento ? "" : styles.sinDoc
                    }`}
                    disabled={!t.documento}
                    title={
                      t.documento
                        ? undefined
                        : "Sin número de documento no se puede certificar: el Art. 381 lit. d exige el NIT o cédula del retenido. Corrige el tercero en la compra o el documento soporte."
                    }
                    onClick={() => t.documento && setSeleccion(t.documento)}
                  >
                    <span>
                      <span className={styles.terceroNombre}>{t.nombre}</span>
                      <span className={styles.terceroDoc}>
                        {t.documento
                          ? `${t.tipoDocumento || "NIT/C.C."} ${t.documento}`
                          : "⚠ Sin documento — no certificable"}
                      </span>
                    </span>
                    <span className={styles.terceroDerecha}>
                      <span className={styles.terceroMonto}>{fmt(t[tipo])}</span>
                      {t.documento && (
                        <span className={pendiente ? styles.pendiente : styles.hecho}>
                          {pendiente ? "pendiente" : "certificado"}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.panel}>
          {!seleccion ? (
            <div className={styles.vacio}>
              Elige un tercero de la lista para ver lo retenido y expedir su certificado.
            </div>
          ) : detalle === null ? (
            <div className={styles.vacio}>Cargando…</div>
          ) : detalle.error ? (
            <div className={styles.vacio}>{detalle.error}</div>
          ) : (
            <>
              <h2 className={styles.panelTitulo}>
                {detalle.tercero?.nombre || "Tercero"}{" "}
                <span className={styles.terceroDoc}>
                  {detalle.tercero?.tipoDocumento || "NIT/C.C."} {seleccion}
                </span>
              </h2>

              {/* ReteIVA se certifica por periodo gravable (art. 600 E.T.), no por año: el
                  selector filtra las cifras de verdad, no solo la etiqueta del papel. */}
              {(esIva || municipiosIca.length > 0) && (
                <div className={styles.campos} style={{ marginTop: 0, marginBottom: 14 }}>
                  {esIva && (
                    <label className={styles.campo}>
                      <span className={styles.campoLabel}>Periodo gravable del retenido *</span>
                      <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                        <option value="">Elige el periodo…</option>
                        {(detalle.periodos || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.etiqueta}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {municipiosIca.length > 0 && (
                    <label className={styles.campo}>
                      <span className={styles.campoLabel}>
                        Municipio {municipiosIca.length > 1 ? "*" : ""}
                      </span>
                      <select value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
                        <option value="">{municipiosIca.length > 1 ? "Elige el municipio…" : "Todos"}</option>
                        {municipiosIca.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}

              {plazo && (
                <div className={plazo.vencido ? styles.alertaPlazo : styles.aviso}>
                  {plazo.vencido ? (
                    <>
                      <strong>Plazo vencido el {plazo.fecha}.</strong> Expídelo igual: subsanar antes de
                      la resolución sanción reduce la multa del Art. 667 al 30%.
                    </>
                  ) : (
                    <>
                      Plazo para expedir: <strong>{plazo.fecha}</strong> ({plazo.diasRestantes} días).{" "}
                      {plazo.norma}
                    </>
                  )}
                </div>
              )}

              {detalle.laborales?.lineas > 0 && (
                <div className={styles.aviso}>
                  Se apartaron {detalle.laborales.lineas} retenciones por{" "}
                  {fmt(detalle.laborales.valor)} sobre <strong>rentas de trabajo</strong>. Esas van en el
                  Formulario 220 de la DIAN (Arts. 378-379), no en este certificado.
                </div>
              )}

              {faltantes.length > 0 && (
                <div className={styles.alerta}>
                  <strong>No se puede expedir todavía.</strong>
                  <ul>
                    {faltantes.map((f) => (
                      <li key={f.texto}>
                        {f.texto}
                        {f.arreglarEn && (
                          <>
                            {" — "}
                            <button className={styles.enlace} onClick={() => router.push(f.arreglarEn)}>
                              {f.arreglarTexto}
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Tarifa</th>
                    <th>{esIva ? "Operación gravada" : "Base"}</th>
                    {esIva && <th>IVA generado</th>}
                    <th>Retenido</th>
                  </tr>
                </thead>
                <tbody>
                  {conceptos.map((c) => (
                    <tr key={`${c.tipo}-${c.conceptoCodigo || "sin"}-${c.tarifa}-${c.municipio || ""}`}>
                      <td>
                        {c.conceptoNombre}
                        <div className={styles.sub}>
                          {c.operaciones} {c.operaciones === 1 ? "operación" : "operaciones"}
                          {c.municipio && ` · ${c.municipio}`}
                        </div>
                      </td>
                      <td>
                        {c.tarifa}
                        {c.unidad}
                      </td>
                      <td className={styles.monto}>{fmt(esIva ? c.baseOperacion : c.base)}</td>
                      {esIva && <td className={styles.monto}>{fmt(c.base)}</td>}
                      <td className={styles.monto}>
                        <strong>{fmt(c.valor)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.total}>
                <span>Total retenido</span>
                <span>{fmt(detalle.totales?.valor)}</span>
              </div>

              <div className={styles.campos}>
                <label className={styles.campo}>
                  <span className={styles.campoLabel}>Ciudad donde se consignó (Art. 381 lit. a)</span>
                  <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Bogotá D.C." />
                </label>
              </div>

              <div className={styles.accionesPie}>
                <button className="btn-primary" disabled={!puedeExpedir} onClick={expedir}>
                  {ocupado ? "Expidiendo…" : "Expedir certificado"}
                </button>
              </div>

              {detalle.expedidos?.length > 0 && (
                <>
                  <h3 className={styles.subTitulo}>Ya expedidos</h3>
                  <div className={styles.expedidos}>
                    {detalle.expedidos.map((c) => (
                      <div key={c.id} className={`${styles.expedido} ${c.anulado ? styles.expedidoAnulado : ""}`}>
                        <span className={styles.expedidoNum}>{c.numero}</span>
                        <span className={styles.expedidoFecha}>
                          {new Date(c.expedidoEn).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
                          {c.anulado && " · anulado"}
                        </span>
                        <span className={styles.expedidoMonto}>{fmt(c.totalValor)}</span>
                        <button onClick={() => generarCertificadoPDF(c)}>PDF</button>
                        {!c.anulado && (
                          <button className={styles.del} onClick={() => anular(c)}>
                            Anular
                          </button>
                        )}
                        {c.anulado && c.motivoAnulacion && (
                          <span className={styles.motivoAnulacion}>
                            {c.motivoAnulacion} — {c.anuladoPor}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className={styles.sub} style={{ marginTop: 8 }}>
                    Reimprimir un certificado usa los datos con que se expidió, no los actuales. Si
                    cambiaron, anúlalo y expide uno nuevo.
                  </p>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {notif && <div className={`${styles.toast} ${styles[notif.clase]}`}>{notif.mensaje}</div>}
    </div>
  );
}
