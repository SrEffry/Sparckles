"use client";

// Editor de la nota de contabilidad. Lo comparten /notas-contabilidad/nueva y el borrador en
// /notas-contabilidad/[id]: es el mismo formulario, cambia solo si guarda creando o editando.

import { useEffect, useMemo, useRef, useState } from "react";
import { buscarCuentas } from "@/lib/asientosApi";
import { TIPOS_AJUSTE } from "@/lib/notaContabilidadValidation";
import { numeroALetras } from "@/lib/numeroALetras";
import { hoyBogota } from "@/lib/fechas";
import styles from "./notas.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const movVacio = () => ({ cuenta: "", nombreCuenta: "", texto: "", debito: "", credito: "", tercero: "" });

/** Mes anterior al de hoy: el ajuste típico corrige el periodo que se acaba de cerrar. */
function periodoPorDefecto() {
  const [a, m] = hoyBogota().split("-").map(Number);
  const mes = m === 1 ? 12 : m - 1;
  const anio = m === 1 ? a - 1 : a;
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export default function NotaEditor({ nota, sector = "comercial", blindadas = [], onGuardar, onCancelar }) {
  const [fecha, setFecha] = useState(nota?.fecha || hoyBogota());
  const [periodoAfectado, setPeriodo] = useState(nota?.periodoAfectado || periodoPorDefecto());
  const [tipoAjuste, setTipoAjuste] = useState(nota?.tipoAjuste || "");
  const [documentoRef, setDocumentoRef] = useState(nota?.documentoRef || "");
  const [concepto, setConcepto] = useState(nota?.concepto || "");
  const [anexos, setAnexos] = useState(nota?.anexos || "");
  const [movs, setMovs] = useState(
    nota?.movimientos?.length
      ? nota.movimientos.map((m) => ({
          cuenta: m.cuenta,
          nombreCuenta: m.nombreCuenta,
          texto: `${m.cuenta} - ${m.nombreCuenta}`,
          debito: Number(m.debito) > 0 ? String(m.debito) : "",
          credito: Number(m.credito) > 0 ? String(m.credito) : "",
          tercero: m.tercero || "",
        }))
      : [movVacio(), movVacio()]
  );
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const bloqueo = useMemo(() => new Map(blindadas.map((b) => [b.cuenta, b.motivo])), [blindadas]);

  const totales = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const m of movs) {
      d += Number(m.debito) || 0;
      c += Number(m.credito) || 0;
    }
    return { d, c, dif: Math.abs(d - c) };
  }, [movs]);
  const balanceado = totales.dif < 0.01 && totales.d > 0;
  // Un formulario recién abierto no está "descuadrado", está vacío. Marcarlo en rojo desde el
  // primer segundo entrena al usuario a ignorar la advertencia.
  const vacio = totales.d === 0 && totales.c === 0;

  const ayuda = TIPOS_AJUSTE.find((t) => t.id === tipoAjuste)?.ayuda;
  const chocan = movs.filter((m) => bloqueo.has(m.cuenta));

  function setMov(idx, campo, valor) {
    setMovs((ms) => ms.map((m, i) => (i === idx ? { ...m, [campo]: valor } : m)));
  }

  function payload(estado) {
    return {
      fecha,
      periodoAfectado,
      tipoAjuste,
      documentoRef,
      concepto,
      anexos,
      estado,
      sector,
      movimientos: movs,
    };
  }

  async function guardar() {
    setOcupado(true);
    setError("");
    const res = await onGuardar(payload("borrador"));
    setOcupado(false);
    if (res?.error) setError(res.error);
  }

  return (
    <>
      <section className={styles.panel}>
        <h2 className={styles.panelTitulo}>Datos de la nota</h2>
        <div className={styles.campos}>
          <label className={styles.campo}>
            <span className={styles.campoLabel}>Fecha de la nota *</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>

          <label className={styles.campo}>
            <span className={styles.campoLabel}>
              Periodo contable afectado *
              <span
                className={styles.ayudaTipo}
                title="Una nota fechada en enero puede estar ajustando diciembre. Este dato decide en qué periodo pesa el ajuste."
              >
                ⓘ
              </span>
            </span>
            <input type="month" value={periodoAfectado} onChange={(e) => setPeriodo(e.target.value)} />
          </label>

          <label className={styles.campo}>
            <span className={styles.campoLabel}>Tipo de ajuste *</span>
            <select value={tipoAjuste} onChange={(e) => setTipoAjuste(e.target.value)}>
              <option value="">Selecciona…</option>
              {TIPOS_AJUSTE.filter((t) => t.id !== "reversion").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {ayuda && <span className={styles.ayudaTipo}>{ayuda}</span>}
          </label>

          <label className={styles.campo}>
            <span className={styles.campoLabel}>Documento de referencia</span>
            <input
              value={documentoRef}
              onChange={(e) => setDocumentoRef(e.target.value)}
              placeholder="DIF-2026-07, contrato, acta…"
            />
          </label>

          <label className={`${styles.campo} ${styles.campoAncho}`}>
            <span className={styles.campoLabel}>Concepto y justificación *</span>
            <textarea
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Explica el ajuste y en qué se soporta. Es lo que un revisor leerá dentro de tres años."
            />
          </label>

          <label className={`${styles.campo} ${styles.campoAncho}`}>
            <span className={styles.campoLabel}>Anexos que lo soportan</span>
            <input
              value={anexos}
              onChange={(e) => setAnexos(e.target.value)}
              placeholder="Tabla de amortización, cálculo actuarial, conciliación…"
            />
          </label>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitulo}>Imputación contable</h2>

        <div className={styles.movHead}>
          <span>Cuenta (PUC)</span>
          <span>Débito</span>
          <span>Crédito</span>
          <span>Tercero</span>
          <span />
        </div>

        {movs.map((m, idx) => {
          const motivo = bloqueo.get(m.cuenta);
          return (
            <div key={idx}>
              <div className={`${styles.movFila} ${motivo ? styles.cuentaBloqueada : ""}`}>
                <CuentaPicker
                  sector={sector}
                  texto={m.texto}
                  onTexto={(v) => setMov(idx, "texto", v)}
                  onSelect={(c) =>
                    setMovs((ms) =>
                      ms.map((x, i) =>
                        i === idx
                          ? { ...x, cuenta: c.codigo, nombreCuenta: c.nombre, texto: `${c.codigo} - ${c.nombre}` }
                          : x
                      )
                    )
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={m.debito}
                  onChange={(e) => setMov(idx, "debito", e.target.value)}
                  placeholder="0"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={m.credito}
                  onChange={(e) => setMov(idx, "credito", e.target.value)}
                  placeholder="0"
                />
                <input
                  value={m.tercero}
                  onChange={(e) => setMov(idx, "tercero", e.target.value)}
                  placeholder="Opcional"
                />
                <button
                  className={styles.rm}
                  onClick={() => setMovs((ms) => ms.filter((_, i) => i !== idx))}
                  disabled={movs.length <= 2}
                  title="Quitar línea"
                >
                  ✕
                </button>
              </div>
              {motivo && (
                <p className={styles.motivoBloqueo}>
                  Esta cuenta no se puede mover con una nota: {motivo}.
                </p>
              )}
            </div>
          );
        })}

        <button className={styles.agregar} onClick={() => setMovs((ms) => [...ms, movVacio()])}>
          + Agregar movimiento
        </button>

        <div className={`${styles.balance} ${balanceado || vacio ? "" : styles.balanceMal}`}>
          <span>
            {vacio ? "Sumas" : balanceado ? "Sumas iguales" : `Descuadre de ${fmt(totales.dif)}`}
          </span>
          <span>{fmt(totales.d)}</span>
          <span>{fmt(totales.c)}</span>
          <span />
        </div>
        {balanceado && <p className={styles.letras}>Son: {numeroALetras(totales.d)}</p>}

        {chocan.length > 0 && (
          <div className={styles.advertencia} style={{ marginTop: 12 }}>
            Hay {chocan.length} {chocan.length === 1 ? "cuenta" : "cuentas"} que otro módulo mantiene. Cámbialas
            antes de emitir: la nota se guardará, pero no se podrá emitir así.
          </div>
        )}

        {error && <div className={styles.advertencia} style={{ marginTop: 12 }}>{error}</div>}

        <div className={styles.accionesPie}>
          {onCancelar && (
            <button className="btn-secondary" onClick={onCancelar} disabled={ocupado}>
              Cancelar
            </button>
          )}
          <button className="btn-primary" onClick={guardar} disabled={ocupado}>
            {ocupado ? "Guardando…" : "Guardar borrador"}
          </button>
        </div>
        <p className={styles.ayudaTipo} style={{ textAlign: "right", marginTop: 6 }}>
          Guardar no mueve los libros. La nota se numera y se contabiliza al emitirla.
        </p>
      </section>
    </>
  );
}

function CuentaPicker({ sector, texto, onTexto, onSelect }) {
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(async () => {
      setResultados(await buscarCuentas(sector, texto.replace(/ - .*/, "")));
    }, 250);
    return () => clearTimeout(t);
  }, [texto, sector, abierto]);

  useEffect(() => {
    function fuera(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  return (
    <div className={styles.picker} ref={boxRef}>
      <input
        value={texto}
        onChange={(e) => {
          onTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar cuenta por código o nombre…"
      />
      {abierto && resultados.length > 0 && (
        <div className={styles.dropdown}>
          {resultados.map((c) => (
            <button
              key={c.id}
              className={styles.opt}
              onClick={() => {
                onSelect(c);
                setAbierto(false);
              }}
            >
              <strong>{c.codigo}</strong>
              {c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
