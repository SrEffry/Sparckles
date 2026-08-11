"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listarPendientes, crearComprobante } from "@/lib/comprobantesApi";
import { listarTesoreria, obtenerMapaCuentas } from "@/lib/mapaCuentasApi";
import { numeroALetras } from "@/lib/numeroALetras";
import { hoyBogota } from "@/lib/fechas";
import styles from "../comprobantes.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const MEDIOS = ["Transferencia", "Efectivo", "Cheque", "Tarjeta", "Consignación"];

export default function NuevoComprobantePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tipo = sp.get("tipo") === "egreso" ? "egreso" : "ingreso";
  const esIngreso = tipo === "ingreso";

  const [pendientes, setPendientes] = useState(null);
  const [tesoreria, setTesoreria] = useState([]);
  const [mapa, setMapa] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    fecha: hoyBogota(),
    ciudad: "",
    terceroNombre: "",
    terceroDocumento: "",
    terceroDireccion: "",
    medioPago: "Transferencia",
    cuentaTesoreriaId: "",
    numTransaccion: "",
    chequeBanco: "",
    chequeFecha: "",
    concepto: "",
    observaciones: "",
  });
  // { [docId]: valorAplicado }
  const [aplicado, setAplicado] = useState({});
  const [retenciones, setRetenciones] = useState([]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cargar = useCallback(async () => {
    const [docs, ctas, m] = await Promise.all([
      listarPendientes({ tipo, q: busqueda }),
      listarTesoreria(),
      obtenerMapaCuentas(),
    ]);
    setPendientes(docs);
    setTesoreria(ctas.filter((c) => c.activa));
    setMapa(m);
    // Preselecciona la cuenta predeterminada si aún no hay una elegida.
    setForm((f) =>
      f.cuentaTesoreriaId ? f : { ...f, cuentaTesoreriaId: ctas.find((c) => c.predeterminada)?.id || "" }
    );
  }, [tipo, busqueda]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const seleccionados = useMemo(
    () => (pendientes || []).filter((d) => Number(aplicado[d.id]) > 0),
    [pendientes, aplicado]
  );

  const bruto = useMemo(
    () => r2(seleccionados.reduce((a, d) => a + Number(aplicado[d.id] || 0), 0)),
    [seleccionados, aplicado]
  );
  const totalRet = useMemo(() => r2(retenciones.reduce((a, r) => a + Number(r.valor || 0), 0)), [retenciones]);
  const neto = r2(bruto - totalRet);

  // Al elegir el primer documento se autocompleta el tercero: en la práctica un comprobante
  // es de un solo tercero, y volver a teclear el NIT es una fuente de errores.
  function aplicar(doc, valor) {
    setAplicado((a) => ({ ...a, [doc.id]: valor }));
    if (Number(valor) > 0 && !form.terceroNombre) {
      setForm((f) => ({
        ...f,
        terceroNombre: esIngreso ? doc.clienteNombre : doc.proveedorNombre,
        terceroDocumento: esIngreso ? doc.clienteNumeroDocumento || "" : doc.proveedorNit || "",
      }));
    }
  }

  function agregarRetencion() {
    setRetenciones((r) => [
      ...r,
      { tipo: "retefuente", concepto: "", base: bruto, tarifa: 0, unidad: "%", valor: 0, municipio: "" },
    ]);
  }
  function setRet(i, campo, valor) {
    setRetenciones((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const nuevo = { ...r, [campo]: valor };
        // El ICA va por mil; el resto en porcentaje.
        if (campo === "tipo") nuevo.unidad = valor === "reteica" ? "‰" : "%";
        if (["base", "tarifa", "tipo"].includes(campo)) {
          const divisor = nuevo.unidad === "‰" ? 1000 : 100;
          nuevo.valor = r2((Number(nuevo.base) || 0) * ((Number(nuevo.tarifa) || 0) / divisor));
        }
        return nuevo;
      })
    );
  }

  async function guardar() {
    setError("");
    if (seleccionados.length === 0) return setError("Selecciona al menos un documento y el valor a aplicar.");
    if (!form.concepto.trim()) return setError("El concepto es obligatorio: explica el movimiento en los libros.");

    setGuardando(true);
    const res = await crearComprobante({
      tipo,
      ...form,
      aplicaciones: seleccionados.map((d) => ({
        [esIngreso ? "facturaId" : "compraId"]: d.id,
        valorAplicado: Number(aplicado[d.id]),
      })),
      retenciones: retenciones.filter((r) => Number(r.valor) > 0),
    });
    setGuardando(false);
    if (res.error) return setError(res.error);
    // Se va a la revisión del asiento: nada se contabiliza hasta confirmar ahí.
    router.push(`/comprobantes/${res.comprobante.id}`);
  }

  const faltaMapa = mapa && !mapa.configurado;

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>{esIngreso ? "Registrar recaudo" : "Registrar pago"}</h1>
          <p>
            {esIngreso
              ? "Dinero recibido y aplicado a facturas de venta."
              : "Dinero pagado y aplicado a compras de proveedores."}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push(`/comprobantes?tipo=${tipo}`)}>
          ← Volver
        </button>
      </header>

      {faltaMapa && (
        <div className={styles.alerta}>
          <strong>Falta el mapa de cuentas.</strong> Sin él el sistema no puede proponer el asiento
          contable.{" "}
          <button className={styles.enlace} onClick={() => router.push("/configuracion/cuentas")}>
            Configurarlo ahora →
          </button>
        </div>
      )}

      <div className={styles.columnas}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitulo}>
            1. {esIngreso ? "Facturas por cobrar" : "Compras por pagar"}
          </h2>
          <input
            className={styles.buscar}
            placeholder={esIngreso ? "Buscar por número o cliente…" : "Buscar por número o proveedor…"}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {pendientes === null ? (
            <p className={styles.vacioChico}>Cargando…</p>
          ) : pendientes.length === 0 ? (
            <p className={styles.vacioChico}>
              No hay {esIngreso ? "facturas por cobrar" : "compras por pagar"}.
            </p>
          ) : (
            <table className={styles.tablaDocs}>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Fecha</th>
                  <th>Saldo</th>
                  <th>Aplicar</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((d) => {
                  const ref = esIngreso ? d.numeroCompleto : d.numFactura;
                  const tercero = esIngreso ? d.clienteNombre : d.proveedorNombre;
                  const val = aplicado[d.id] || "";
                  const excede = Number(val) > d.saldo + 0.005;
                  return (
                    <tr key={d.id} className={Number(val) > 0 ? styles.filaActiva : ""}>
                      <td>
                        <strong>{ref}</strong>
                        <div className={styles.sub}>{tercero}</div>
                      </td>
                      <td>{d.fecha}</td>
                      <td className={styles.monto}>{fmt(d.saldo)}</td>
                      <td>
                        <div className={styles.aplicarCelda}>
                          <input
                            type="number"
                            min="0"
                            max={d.saldo}
                            step="0.01"
                            value={val}
                            onChange={(e) => aplicar(d, e.target.value)}
                            className={excede ? styles.inputError : ""}
                          />
                          <button type="button" onClick={() => aplicar(d, d.saldo)} title="Aplicar todo el saldo">
                            todo
                          </button>
                        </div>
                        {excede && <div className={styles.errorChico}>Excede el saldo</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitulo}>2. Datos del {esIngreso ? "recaudo" : "pago"}</h2>

          <div className={styles.campos}>
            <Campo label="Fecha del movimiento *" ayuda="La fecha real del pago, no la de hoy: define el periodo contable.">
              <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </Campo>
            <Campo label="Ciudad">
              <input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} placeholder="Montería" />
            </Campo>
            <Campo label={esIngreso ? "Recibido de *" : "Pagado a *"}>
              <input value={form.terceroNombre} onChange={(e) => set("terceroNombre", e.target.value)} />
            </Campo>
            <Campo label="NIT / C.C.">
              <input value={form.terceroDocumento} onChange={(e) => set("terceroDocumento", e.target.value)} />
            </Campo>
            {!esIngreso && (
              <Campo label="Dirección del beneficiario" ayuda="Necesaria para el certificado de retención.">
                <input value={form.terceroDireccion} onChange={(e) => set("terceroDireccion", e.target.value)} />
              </Campo>
            )}
            <Campo label="Medio de pago">
              <select value={form.medioPago} onChange={(e) => set("medioPago", e.target.value)}>
                {MEDIOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Campo>
            <Campo label={esIngreso ? "Caja o banco donde entró *" : "Caja o banco de donde salió *"}>
              <select value={form.cuentaTesoreriaId} onChange={(e) => set("cuentaTesoreriaId", e.target.value)}>
                <option value="">Selecciona…</option>
                {tesoreria.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.cuentaPuc})
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="N.º de transacción / consignación">
              <input value={form.numTransaccion} onChange={(e) => set("numTransaccion", e.target.value)} />
            </Campo>
            {form.medioPago === "Cheque" && (
              <>
                <Campo label="Banco del cheque">
                  <input value={form.chequeBanco} onChange={(e) => set("chequeBanco", e.target.value)} />
                </Campo>
                <Campo label="Fecha del cheque">
                  <input type="date" value={form.chequeFecha} onChange={(e) => set("chequeFecha", e.target.value)} />
                </Campo>
              </>
            )}
          </div>

          <Campo label="Concepto *" ayuda="Es lo que explica el movimiento en los libros y se imprime en el comprobante.">
            <textarea
              rows={3}
              value={form.concepto}
              onChange={(e) => set("concepto", e.target.value)}
              placeholder={
                esIngreso
                  ? "Recaudo del abono de la factura FE-0001 por…"
                  : "Cancelación de la factura del proveedor N.º… por…"
              }
            />
          </Campo>

          <div className={styles.retencionesBloque}>
            <div className={styles.retHead}>
              <h3>Retenciones</h3>
              <button type="button" className={styles.enlace} onClick={agregarRetencion}>
                + Agregar
              </button>
            </div>
            <p className={styles.pista}>
              {esIngreso
                ? "Las que el cliente nos practicó. No se prorratean entre abonos: se practican una sola vez."
                : "Las que le practicamos al proveedor. Concepto, base y tarifa alimentan su certificado."}
            </p>
            {retenciones.map((r, i) => (
              <div key={i} className={styles.retFila}>
                <select value={r.tipo} onChange={(e) => setRet(i, "tipo", e.target.value)}>
                  <option value="retefuente">ReteFuente</option>
                  <option value="reteiva">ReteIVA</option>
                  <option value="reteica">ReteICA</option>
                </select>
                <input
                  placeholder="Concepto"
                  value={r.concepto}
                  onChange={(e) => setRet(i, "concepto", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Base"
                  value={r.base}
                  onChange={(e) => setRet(i, "base", e.target.value)}
                />
                <div className={styles.tarifaCelda}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Tarifa"
                    value={r.tarifa}
                    onChange={(e) => setRet(i, "tarifa", e.target.value)}
                  />
                  <span>{r.unidad}</span>
                </div>
                <strong className={styles.retValor}>{fmt(r.valor)}</strong>
                <button
                  type="button"
                  className={styles.del}
                  onClick={() => setRetenciones((rs) => rs.filter((_, x) => x !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className={styles.resumen}>
            <div className={styles.resumenFila}>
              <span>Valor bruto</span>
              <strong>{fmt(bruto)}</strong>
            </div>
            {totalRet > 0 && (
              <div className={styles.resumenFila}>
                <span>Retenciones</span>
                <strong>−{fmt(totalRet)}</strong>
              </div>
            )}
            <div className={`${styles.resumenFila} ${styles.resumenTotal}`}>
              <span>{esIngreso ? "Neto recibido" : "Neto pagado"}</span>
              <strong>{fmt(neto)}</strong>
            </div>
            {neto > 0 && <p className={styles.letras}>{numeroALetras(neto)}</p>}
          </div>

          {error && <div className="mensaje-error">{error}</div>}

          <div className={styles.accionesPie}>
            <button className="btn-primary" onClick={guardar} disabled={guardando || faltaMapa}>
              {guardando ? "Guardando…" : "Continuar y revisar el asiento →"}
            </button>
          </div>
          <p className={styles.pista}>
            El comprobante se crea como <strong>borrador</strong>. No afecta los libros hasta que
            confirmes el asiento en el siguiente paso.
          </p>
        </section>
      </div>
    </div>
  );
}

function Campo({ label, ayuda, children }) {
  return (
    <label className={styles.campo}>
      <span className={styles.campoLabel}>
        {label}
        {ayuda && <span className={styles.ayuda} title={ayuda}>?</span>}
      </span>
      {children}
    </label>
  );
}
