"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CAMPOS_MAPA } from "@/lib/data/mapaCuentasDefecto";
import {
  obtenerMapaCuentas,
  guardarMapaCuentas,
  sembrarMapaCuentas,
  crearCuentaTesoreria,
  desactivarCuentaTesoreria,
} from "@/lib/mapaCuentasApi";
import { buscarCuentas } from "@/lib/asientosApi";
import styles from "./cuentas.module.css";

// Mapa de cuentas: qué cuenta del PUC usa este usuario para cada concepto.
//
// El generador de comprobantes necesita saberlo, y no puede adivinarlo: el catálogo cargado
// es un modelo de referencia con auxiliares de ejemplo, así que el sistema propone y el
// usuario confirma. Cada cuenta se valida contra el catálogo al guardar.

export default function MapaCuentasPage() {
  const router = useRouter();
  const [datos, setDatos] = useState(null);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [notif, setNotif] = useState(null);

  const recargar = useCallback(async () => {
    const d = await obtenerMapaCuentas();
    setDatos(d);
    setForm(d.mapa || { sector: "comercial", retencionesEnCausacion: true });
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function avisar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 4000);
  }

  async function sembrar() {
    const res = await sembrarMapaCuentas(form.sector || "comercial");
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar(
      `Sugerencias cargadas${res.tesoreriaCreada ? ` · ${res.tesoreriaCreada} cuentas de tesorería` : ""}. Revísalas antes de emitir comprobantes.`
    );
  }

  async function guardar() {
    setGuardando(true);
    const res = await guardarMapaCuentas(form);
    setGuardando(false);
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar("Mapa de cuentas guardado");
  }

  if (!datos) return <div className={styles.cargando}>Cargando…</div>;

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Mapa de cuentas</h1>
          <p>Qué cuenta contable usa cada concepto al generar comprobantes y asientos.</p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/configuracion")}>
          ← Configuración
        </button>
      </header>

      {!datos.configurado && (
        <div className={styles.arranque}>
          <div>
            <strong>Aún no has configurado el mapa de cuentas.</strong>
            <p>
              Puedo proponerte un punto de partida con cuentas del catálogo cargado. Son
              sugerencias: revísalas contra tu plan de cuentas antes de emitir comprobantes.
            </p>
          </div>
          <button className="btn-primary" onClick={sembrar}>
            Cargar sugerencias
          </button>
        </div>
      )}

      {datos.faltantes.length > 0 && datos.configurado && (
        <div className={styles.alerta}>
          <strong>Falta configurar para poder emitir comprobantes:</strong>{" "}
          {datos.faltantes.join(", ")}.
        </div>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Cuentas por concepto</h2>
          <label className={styles.sectorSel}>
            Catálogo
            <select
              value={form.sector || "comercial"}
              onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
            >
              <option value="comercial">Comercial</option>
              <option value="esal">ESAL</option>
            </select>
          </label>
        </div>

        {CAMPOS_MAPA.map((grupo) => (
          <div key={grupo.grupo} className={styles.grupo}>
            <h3>{grupo.grupo}</h3>
            <div className={styles.grid}>
              {grupo.campos.map((campo) => (
                <SelectorCuenta
                  key={campo.clave}
                  campo={campo}
                  sector={form.sector || "comercial"}
                  valor={form[campo.clave] || ""}
                  onChange={(v) => setForm((f) => ({ ...f, [campo.clave]: v }))}
                />
              ))}
            </div>
          </div>
        ))}

        <div className={styles.politica}>
          <label>
            <input
              type="checkbox"
              checked={form.retencionesEnCausacion !== false}
              onChange={(e) => setForm((f) => ({ ...f, retencionesEnCausacion: e.target.checked }))}
            />
            <span>
              <strong>Las retenciones se registran al causar el documento</strong> (lo estándar).
              <small>
                Si está marcado, el comprobante de pago o recaudo NO vuelve a moverlas: ya están
                registradas. Desmarcarlo cuando en realidad sí se causan duplica el activo por
                retenciones y descuadra la declaración.
              </small>
            </span>
          </label>
        </div>

        <div className={styles.acciones}>
          <button className="btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar mapa"}
          </button>
        </div>
      </section>

      <Tesoreria
        cuentas={datos.tesoreria}
        sector={form.sector || "comercial"}
        onCambio={recargar}
        onAviso={avisar}
      />

      {notif && <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>}
    </div>
  );
}

/** Buscador de cuentas del PUC con autocompletado. */
function SelectorCuenta({ campo, sector, valor, onChange }) {
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");

  // Resuelve el nombre de la cuenta ya elegida, para no mostrar solo el código.
  useEffect(() => {
    if (!valor) return setNombre("");
    buscarCuentas(sector, valor).then((cs) => {
      setNombre(cs.find((c) => c.codigo === valor)?.nombre || "");
    });
  }, [valor, sector]);

  useEffect(() => {
    if (!abierto || q.trim().length < 2) return setOpciones([]);
    const t = setTimeout(() => {
      buscarCuentas(sector, q).then((cs) => setOpciones(cs.slice(0, 25)));
    }, 220);
    return () => clearTimeout(t);
  }, [q, sector, abierto]);

  return (
    <div className={styles.campo}>
      <span className={styles.campoLabel}>
        {campo.etiqueta}
        <span className={styles.ayuda} title={campo.ayuda} aria-label={campo.ayuda}>?</span>
      </span>

      {valor && !abierto ? (
        <button type="button" className={styles.elegida} onClick={() => { setAbierto(true); setQ(""); }}>
          <code>{valor}</code>
          <span>{nombre || "…"}</span>
          <em>cambiar</em>
        </button>
      ) : (
        <div className={styles.buscador}>
          <input
            autoFocus={abierto}
            placeholder="Buscar por código o nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setAbierto(true)}
          />
          {abierto && (
            <div className={styles.opciones}>
              {valor && (
                <button type="button" className={styles.quitar} onClick={() => { onChange(""); setAbierto(false); }}>
                  Quitar cuenta
                </button>
              )}
              {q.trim().length < 2 ? (
                <p className={styles.pista}>Escribe al menos 2 caracteres.</p>
              ) : opciones.length === 0 ? (
                <p className={styles.pista}>Sin coincidencias imputables.</p>
              ) : (
                opciones.map((c) => (
                  <button
                    key={c.codigo}
                    type="button"
                    className={styles.opcion}
                    onClick={() => { onChange(c.codigo); setAbierto(false); setQ(""); }}
                  >
                    <code>{c.codigo}</code> {c.nombre}
                  </button>
                ))
              )}
              <button type="button" className={styles.cerrar} onClick={() => setAbierto(false)}>
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tesoreria({ cuentas, sector, onCambio, onAviso }) {
  const [nueva, setNueva] = useState(null);

  async function crear(payload) {
    const res = await crearCuentaTesoreria(payload);
    if (res.error) return onAviso(res.error, "error");
    setNueva(null);
    await onCambio();
    onAviso("Cuenta de tesorería creada");
  }

  async function desactivar(c) {
    if (!confirm(`¿Desactivar "${c.nombre}"? Los comprobantes ya emitidos la seguirán mostrando.`)) return;
    const res = await desactivarCuentaTesoreria(c.id);
    if (res.error) return onAviso(res.error, "error");
    await onCambio();
    onAviso("Cuenta desactivada");
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2>Cajas y bancos</h2>
          <p className={styles.sub}>
            De dónde entra o sale el dinero. El comprobante propone una según el medio de pago,
            pero la cuenta concreta la eliges tú.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => setNueva({})}>+ Agregar</button>
      </div>

      {cuentas.length === 0 ? (
        <p className={styles.vacio}>Aún no hay cajas ni bancos configurados.</p>
      ) : (
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cuenta</th>
              <th>Tipo</th>
              <th>Medio de pago</th>
              <th>GMF</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.nombre}</strong>
                  {c.predeterminada && <span className={styles.pred}>predeterminada</span>}
                </td>
                <td><code>{c.cuentaPuc}</code></td>
                <td>{c.tipo === "caja" ? "Caja" : "Banco"}</td>
                <td>{c.medioPago || "—"}</td>
                <td>{c.gravadaGmf ? "4x1000" : "No"}</td>
                <td>
                  <button className={styles.del} onClick={() => desactivar(c)}>Desactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {nueva && <ModalTesoreria sector={sector} onGuardar={crear} onClose={() => setNueva(null)} />}
    </section>
  );
}

function ModalTesoreria({ sector, onGuardar, onClose }) {
  const [form, setForm] = useState({
    nombre: "",
    cuentaPuc: "",
    tipo: "banco",
    medioPago: "",
    gravadaGmf: true,
    predeterminada: false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>Nueva caja o banco</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Nombre *</label>
            <input
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Bancolombia — Cta. Corriente 123"
            />
          </div>
          <SelectorCuenta
            campo={{ etiqueta: "Cuenta contable *", ayuda: "Debe ser una cuenta imputable del catálogo." }}
            sector={sector}
            valor={form.cuentaPuc}
            onChange={(v) => set("cuentaPuc", v)}
          />
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => {
                  const t = e.target.value;
                  // Una caja no causa 4x1000.
                  setForm((f) => ({ ...f, tipo: t, gravadaGmf: t === "banco" ? f.gravadaGmf : false }));
                }}
              >
                <option value="banco">Banco</option>
                <option value="caja">Caja</option>
              </select>
            </div>
            <div className="form-group">
              <label>Medio de pago que la sugiere</label>
              <select value={form.medioPago} onChange={(e) => set("medioPago", e.target.value)}>
                <option value="">Ninguno</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Cheque">Cheque</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>
          {form.tipo === "banco" && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={form.gravadaGmf}
                onChange={(e) => set("gravadaGmf", e.target.checked)}
              />
              Gravada con el 4x1000 (el egreso propondrá el GMF)
            </label>
          )}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.predeterminada}
              onChange={(e) => set("predeterminada", e.target.checked)}
            />
            Usar como cuenta predeterminada
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onGuardar(form)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
