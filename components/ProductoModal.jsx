"use client";

// Modal de creación/edición de producto.
//
// Vive en `components/` porque se usa en DOS sitios: la pantalla de productos y la de nueva
// factura, donde permite crear un producto sin salir del borrador. Duplicar el formulario habría
// dejado dos juegos de reglas fiscales que se desincronizan — y aquí se decide el tratamiento de
// IVA, los impuestos asignados y el concepto de retención, que es lo que después liquida la
// factura.

import { useEffect, useState } from "react";
import { TABLA_RETEFUENTE_2026 } from "@/lib/data/tablaRetefuente";
import { TRATAMIENTOS_IVA } from "@/lib/data/impuestos";
import { listarImpuestos } from "@/lib/impuestosApi";
import { hoyBogota } from "@/lib/fechas";
import styles from "./productoModal.module.css";


function estadoInicial(p) {
  return {
    codigo: p?.codigo || "",
    descripcion: p?.descripcion || "",
    unidad: p?.unidad || "Unidad",
    comoCompra: p?.comoCompra || "Compras",
    comoVende: p?.comoVende || "Productos",
    tratamientoIva: p?.tratamientoIva || "gravado",
    impuestoIds: (p?.impuestos || []).map((pi) => pi.impuestoId),
    precioVenta: p?.precioVenta != null ? String(p.precioVenta) : "",
    linea: p?.linea || "",
    retAplica: p?.retAplica || false,
    retCategoria: p?.retCategoria || "",
    retConcepto: p?.retConcepto || "",
    retNombre: p?.retNombre || "",
    retTarifa: p?.retTarifa != null ? Number(p.retTarifa) : null,
  };
}

export default function ProductoModal({ inicial, onGuardar, onClose }) {
  const [form, setForm] = useState(() => estadoInicial(inicial));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [impuestos, setImpuestos] = useState([]);

  // Solo los vigentes hoy: una tarifa derogada no debe poder asignarse a un producto que se
  // va a facturar. Las históricas siguen en el catálogo para consultar documentos viejos.
  useEffect(() => {
    listarImpuestos({ fecha: hoyBogota() }).then(setImpuestos);
  }, []);

  const conceptos = form.retCategoria
    ? TABLA_RETEFUENTE_2026.conceptos.filter((c) => c.categoria === form.retCategoria)
    : [];

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function cambiarCategoria(cat) {
    setForm((f) => ({ ...f, retCategoria: cat, retConcepto: "", retNombre: "", retTarifa: null }));
  }

  function seleccionarConcepto(conceptoId) {
    const c = TABLA_RETEFUENTE_2026.conceptos.find((x) => x.id === conceptoId);
    setForm((f) => ({
      ...f,
      retConcepto: conceptoId,
      retNombre: c ? c.nombre : "",
      retTarifa: c ? c.tarifa : null,
    }));
  }

  async function submit() {
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setTimeout(() => setError(""), 4000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{inicial ? "Editar Producto" : "Nuevo Producto"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Código *</label>
            <input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Ej: PRD-001" />
          </div>
          <div className="form-group">
            <label>Descripción *</label>
            <input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Descripción del producto" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Unidad de Medida *</label>
              <select value={form.unidad} onChange={(e) => set("unidad", e.target.value)}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              {/* El TRATAMIENTO va primero y es una categoría, no un porcentaje: decide si el
                  producto causa IVA y si da derecho a descontable. La tarifa viene después. */}
              <label>Tratamiento de IVA *</label>
              <select
                value={form.tratamientoIva}
                onChange={(e) => {
                  const v = e.target.value;
                  // Un excluido no lleva impuestos: el anexo técnico de la DIAN lo prohíbe.
                  setForm((f) => ({
                    ...f,
                    tratamientoIva: v,
                    impuestoIds: v === "excluido" || v === "no_gravado" ? [] : f.impuestoIds,
                  }));
                }}
              >
                {TRATAMIENTOS_IVA.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                ))}
              </select>
              <small className={styles.ayudaTratamiento}>
                {TRATAMIENTOS_IVA.find((t) => t.valor === form.tratamientoIva)?.ayuda}
              </small>
            </div>
          </div>

          {/* Un producto puede llevar VARIOS impuestos: un licor lleva IVA e impuesto al
              consumo a la vez, y un solo campo de tarifa no podía representarlo. */}
          {form.tratamientoIva !== "excluido" && form.tratamientoIva !== "no_gravado" && (
            <div className="form-group">
              <label>Impuestos que aplica *</label>
              <div className={styles.impuestosGrid}>
                {impuestos.length === 0 ? (
                  <p className={styles.sub}>Cargando catálogo de impuestos…</p>
                ) : (
                  impuestos.map((imp) => (
                    <label key={imp.id} className={styles.impuestoOpcion}>
                      <input
                        type="checkbox"
                        checked={form.impuestoIds.includes(imp.id)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            impuestoIds: e.target.checked
                              ? [...f.impuestoIds, imp.id]
                              : f.impuestoIds.filter((x) => x !== imp.id),
                          }))
                        }
                      />
                      <span>
                        <strong>{imp.nombre}</strong>
                        <span className={`${styles.tipoTag} ${imp.tipo === "INC" ? styles.tipoInc : ""}`}>
                          {imp.tipo}
                        </span>
                        {imp.notas && <span className={styles.impuestoNota}>{imp.notas}</span>}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {form.impuestoIds.some(
                (id) => impuestos.find((i) => i.id === id)?.tipo === "INC"
              ) && (
                <small className={styles.avisoTarifa}>
                  El Impuesto al Consumo <strong>no es IVA</strong>: se declara en su propio
                  formulario y no es descontable para el comprador. Se liquida y se reporta
                  aparte del IVA.
                </small>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Cómo se Compra *</label>
              <select value={form.comoCompra} onChange={(e) => set("comoCompra", e.target.value)}>
                {COMO_COMPRA.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cómo se Vende *</label>
              <select value={form.comoVende} onChange={(e) => set("comoVende", e.target.value)}>
                {COMO_VENDE.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Precio de Venta *</label>
              <input type="number" min="0" step="0.01" value={form.precioVenta} onChange={(e) => set("precioVenta", e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Pertenece a la Línea</label>
              <select value={form.linea} onChange={(e) => set("linea", e.target.value)}>
                {LINEAS.map((l) => <option key={l} value={l}>{l || "Sin línea"}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.retBox}>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={form.retAplica} onChange={(e) => set("retAplica", e.target.checked)} />
              Este producto aplica Retención en la Fuente automática
            </label>
            {form.retAplica && (
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label>Categoría de Retención *</label>
                  <select value={form.retCategoria} onChange={(e) => cambiarCategoria(e.target.value)}>
                    <option value="">-- Seleccione --</option>
                    {CATEGORIAS_RET.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Concepto *</label>
                  <select value={form.retConcepto} onChange={(e) => seleccionarConcepto(e.target.value)} disabled={!form.retCategoria}>
                    <option value="">-- Seleccione --</option>
                    {conceptos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre} ({c.tarifa}%)</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {form.retAplica && form.retTarifa != null && (
              <div className={styles.retInfo}>
                Tarifa aplicada: <strong>{Number(form.retTarifa)}%</strong>
              </div>
            )}
          </div>

          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={guardando}>
            {guardando ? "Guardando..." : inicial ? "Actualizar" : "Guardar Producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
