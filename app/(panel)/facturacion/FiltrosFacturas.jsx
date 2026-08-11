"use client";

import { useMemo } from "react";
import { periodosFiscales, rangoMes } from "@/lib/facturaFiltros";
import styles from "./filtros.module.css";

// Filtros del historial de facturación.
//
// Los periodos predefinidos son FISCALES (Art. 600 E.T.), no "últimos 30 días": el trabajo
// real se organiza por bimestre o cuatrimestre de IVA, mes de retención y año gravable.
// Cuál de los dos grupos aplica depende del contribuyente, así que se ofrecen ambos y se
// rotulan; el sistema no adivina la periodicidad.

const ESTADOS = [
  { v: "emitida", t: "Emitidas" },
  { v: "anulada", t: "Anuladas" },
  { v: "todas", t: "Todas" },
];

const TIPOS_IVA = [
  { v: "", t: "Todos los tratamientos" },
  { v: "gravado", t: "Gravado" },
  { v: "exento", t: "Exento (Art. 477)" },
  { v: "excluido", t: "Excluido (Art. 476)" },
  { v: "no_responsable", t: "Emisor no responsable" },
  { v: "sin_clasificar", t: "Sin clasificar (tarifa 0%)" },
];

const RETENCIONES = [
  { v: "", t: "Con o sin retención" },
  { v: "retefuente", t: "Con ReteFuente" },
  { v: "reteiva", t: "Con ReteIVA" },
  { v: "reteica", t: "Con ReteICA" },
];

const NOTAS = [
  { v: "", t: "Con o sin notas" },
  { v: "nc", t: "Con nota crédito" },
  { v: "nd", t: "Con nota débito" },
];

const ETIQUETAS = {
  desde: "Desde",
  hasta: "Hasta",
  estado: "Estado",
  aFecha: "Estado al corte",
  clienteDoc: "Documento",
  prefijo: "Prefijo",
  numeroDesde: "Consecutivo desde",
  numeroHasta: "Consecutivo hasta",
  tipoIva: "Tratamiento IVA",
  retencion: "Retención",
  conNota: "Notas",
  formaPago: "Forma de pago",
  montoMin: "Monto mínimo",
  montoMax: "Monto máximo",
  vencimiento: "Vencimiento",
  q: "Búsqueda",
};

export default function FiltrosFacturas({ filtros, onCambio, abierto, onToggle, hoy }) {
  const anio = Number((filtros.desde || hoy || "2026").slice(0, 4)) || 2026;
  const periodos = useMemo(() => periodosFiscales(anio), [anio]);

  const set = (campo, valor) => onCambio({ ...filtros, [campo]: valor, page: 1 });

  function aplicarPeriodo(clave) {
    if (!clave) return onCambio({ ...filtros, desde: "", hasta: "", page: 1 });
    if (clave === "mes-actual" || clave === "mes-anterior") {
      const [a, m] = (hoy || "").split("-").map(Number);
      const desplazado = clave === "mes-anterior" ? (m === 1 ? [a - 1, 12] : [a, m - 1]) : [a, m];
      const r = rangoMes(desplazado[0], desplazado[1]);
      return onCambio({ ...filtros, desde: r.desde, hasta: r.hasta, page: 1 });
    }
    const p = periodos.find((x) => x.clave === clave);
    if (p) onCambio({ ...filtros, desde: p.desde, hasta: p.hasta, page: 1 });
  }

  // Chips de lo que está filtrando ahora mismo. El estado por defecto es "emitidas", y tiene
  // que verse: un filtro activo e invisible hace creer que se está viendo todo.
  const legible = (k, v) => {
    const tabla = { estado: ESTADOS, tipoIva: TIPOS_IVA, retencion: RETENCIONES, conNota: NOTAS };
    if (tabla[k]) return tabla[k].find((o) => o.v === v)?.t || v;
    if (k === "vencimiento") return v === "vencidas" ? "Vencidas a hoy" : "Aún vigentes";
    return String(v);
  };

  const activos = Object.entries(filtros)
    .filter(([k, v]) => ETIQUETAS[k] && v !== "" && v != null)
    .map(([k, v]) => [k, legible(k, v)]);

  const periodoActual =
    periodos.find((p) => p.desde === filtros.desde && p.hasta === filtros.hasta)?.clave || "";

  return (
    <section className={styles.wrap}>
      <div className={styles.barra}>
        <input
          className={styles.busqueda}
          placeholder="Buscar por número, cliente o documento…"
          value={filtros.q || ""}
          onChange={(e) => set("q", e.target.value)}
          aria-label="Buscar facturas"
        />

        <select
          className={styles.select}
          value={periodoActual}
          onChange={(e) => aplicarPeriodo(e.target.value)}
          aria-label="Periodo fiscal"
        >
          <option value="">Periodo…</option>
          <optgroup label="Mes (retención · Art. 604)">
            <option value="mes-actual">Mes actual</option>
            <option value="mes-anterior">Mes anterior</option>
          </optgroup>
          <optgroup label="Bimestres de IVA (Art. 600 num. 1)">
            {periodos.filter((p) => p.grupo === "bimestre").map((p) => (
              <option key={p.clave} value={p.clave}>{p.etiqueta}</option>
            ))}
          </optgroup>
          <optgroup label="Cuatrimestres de IVA (Art. 600 num. 2)">
            {periodos.filter((p) => p.grupo === "cuatrimestre").map((p) => (
              <option key={p.clave} value={p.clave}>{p.etiqueta}</option>
            ))}
          </optgroup>
          <optgroup label="Anual (renta · exógena)">
            {periodos.filter((p) => p.grupo === "anual").map((p) => (
              <option key={p.clave} value={p.clave}>{p.etiqueta}</option>
            ))}
          </optgroup>
        </select>

        <div className={styles.segmento} role="group" aria-label="Estado">
          {ESTADOS.map((e) => (
            <button
              key={e.v}
              type="button"
              className={`${styles.seg} ${filtros.estado === e.v ? styles.segActivo : ""}`}
              onClick={() => set("estado", e.v)}
              aria-pressed={filtros.estado === e.v}
            >
              {e.t}
            </button>
          ))}
        </div>

        <button type="button" className={styles.masFiltros} onClick={onToggle} aria-expanded={abierto}>
          {abierto ? "Menos filtros" : "Más filtros"}
        </button>
      </div>

      {abierto && (
        <div className={styles.panel}>
          <Campo label="Desde">
            <input type="date" value={filtros.desde || ""} onChange={(e) => set("desde", e.target.value)} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={filtros.hasta || ""} onChange={(e) => set("hasta", e.target.value)} />
          </Campo>
          <Campo
            label="Estado a la fecha de corte"
            ayuda="Muestra el estado que tenían al cierre, no el de hoy. Una factura anulada después del corte seguía siendo emitida cuando se declaró."
          >
            <input type="date" value={filtros.aFecha || ""} onChange={(e) => set("aFecha", e.target.value)} />
          </Campo>

          <Campo label="Documento del cliente" ayuda="NIT o cédula. La exógena se reporta por identificación, no por nombre.">
            <input
              inputMode="numeric"
              placeholder="901987654"
              value={filtros.clienteDoc || ""}
              onChange={(e) => set("clienteDoc", e.target.value)}
            />
          </Campo>

          <Campo label="Prefijo">
            <input placeholder="FE" value={filtros.prefijo || ""} onChange={(e) => set("prefijo", e.target.value)} />
          </Campo>
          <Campo label="Consecutivo" ayuda="Para verificar la continuidad de la numeración autorizada por la resolución DIAN.">
            <div className={styles.rango}>
              <input
                type="number"
                placeholder="desde"
                value={filtros.numeroDesde || ""}
                onChange={(e) => set("numeroDesde", e.target.value)}
              />
              <input
                type="number"
                placeholder="hasta"
                value={filtros.numeroHasta || ""}
                onChange={(e) => set("numeroHasta", e.target.value)}
              />
            </div>
          </Campo>

          <Campo
            label="Tratamiento de IVA"
            ayuda="Devuelve facturas que contienen al menos un renglón de ese tipo. Para los renglones de la declaración, usa el desglose de bases del pie."
          >
            <select value={filtros.tipoIva || ""} onChange={(e) => set("tipoIva", e.target.value)}>
              {TIPOS_IVA.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
            </select>
          </Campo>

          <Campo label="Retención practicada" ayuda="Separadas: cada una tiene su propio certificado y su propia cuenta.">
            <select value={filtros.retencion || ""} onChange={(e) => set("retencion", e.target.value)}>
              {RETENCIONES.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
            </select>
          </Campo>

          <Campo label="Notas aplicadas">
            <select value={filtros.conNota || ""} onChange={(e) => set("conNota", e.target.value)}>
              {NOTAS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
            </select>
          </Campo>

          <Campo label="Forma de pago">
            <select value={filtros.formaPago || ""} onChange={(e) => set("formaPago", e.target.value)}>
              <option value="">Todas</option>
              <option value="Contado">Contado</option>
              <option value="Crédito">Crédito</option>
            </select>
          </Campo>

          <Campo label="Monto del documento">
            <div className={styles.rango}>
              <input
                type="number"
                placeholder="mínimo"
                value={filtros.montoMin || ""}
                onChange={(e) => set("montoMin", e.target.value)}
              />
              <input
                type="number"
                placeholder="máximo"
                value={filtros.montoMax || ""}
                onChange={(e) => set("montoMax", e.target.value)}
              />
            </div>
          </Campo>

          <Campo
            label="Vencimiento"
            ayuda="NO considera pagos: el sistema todavía no registra recaudos. Una factura vencida puede estar cobrada."
          >
            <select value={filtros.vencimiento || ""} onChange={(e) => set("vencimiento", e.target.value)}>
              <option value="">Cualquiera</option>
              <option value="vencidas">Vencidas a hoy</option>
              <option value="vigentes">Aún vigentes</option>
            </select>
          </Campo>
        </div>
      )}

      {activos.length > 0 && (
        <div className={styles.chips}>
          {activos.map(([k, v]) => (
            <span key={k} className={styles.chip}>
              <span className={styles.chipK}>{ETIQUETAS[k]}:</span> {v}
              <button
                type="button"
                onClick={() => set(k, k === "estado" ? "todas" : "")}
                aria-label={`Quitar filtro ${ETIQUETAS[k]}`}
              >
                ✕
              </button>
            </span>
          ))}
          <button type="button" className={styles.limpiar} onClick={() => onCambio({ estado: "todas", page: 1 })}>
            Limpiar todo
          </button>
        </div>
      )}
    </section>
  );
}

function Campo({ label, ayuda, children }) {
  return (
    <label className={styles.campo}>
      <span className={styles.campoLabel}>
        {label}
        {ayuda && (
          <span className={styles.ayuda} title={ayuda} aria-label={ayuda}>
            ?
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
