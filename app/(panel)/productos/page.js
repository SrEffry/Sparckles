"use client";

import { useEffect, useMemo, useState } from "react";
import { TABLA_RETEFUENTE_2026 } from "@/lib/data/tablaRetefuente";
import { TARIFAS_IVA, GRUPOS_TARIFA, tratamientoIva } from "@/lib/data/tarifasIva";
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "@/lib/productosApi";
import ImportExport from "@/components/ImportExport";
import styles from "./productos.module.css";

const UNIDADES = ["Unidad", "Kilogramo", "Gramo", "Libra", "Metro", "Litro", "Hora", "Servicio"];
const COMO_COMPRA = ["Compras", "Productos Terminados", "Materia Prima", "No Aplica"];
const COMO_VENDE = ["Productos", "Servicios", "Activos Fijos", "No Aplica"];
// La lista vive en lib/data/tarifasIva.js: la comparten la validación del servidor, el
// cálculo de la factura y el importador de Excel.
const LINEAS = ["", "Línea A", "Línea B", "Línea C"];

// Categorías que efectivamente tienen conceptos en la tabla
const CATEGORIAS_RET = [...new Set(TABLA_RETEFUENTE_2026.conceptos.map((c) => c.categoria))];

const fmtCOP = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

// Un producto "tiene IVA" solo si su tratamiento es gravado. Exento y excluido liquidan en 0,
// y "0%" (heredado) está sin clasificar: ninguno de los tres cobra IVA.
function tieneIva(p) {
  return tratamientoIva(p.tarifaIva) === "gravado";
}

export default function ProductosPage() {
  const [productos, setProductos] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setProductos(await listarProductos());
  }
  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const l = productos || [];
    return {
      total: l.length,
      conIva: l.filter(tieneIva).length,
      conRet: l.filter((p) => p.retAplica).length,
    };
  }, [productos]);

  const filtrados = useMemo(() => {
    const l = productos || [];
    const q = search.toLowerCase();
    return l.filter((p) =>
      [p.codigo, p.descripcion, p.linea].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [productos, search]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function guardar(payload, id) {
    const res = id ? await actualizarProducto(id, payload) : await crearProducto(payload);
    if (res.error) return res;
    await recargar();
    setModal(null);
    notificar(id ? "Producto actualizado" : "Producto creado");
    return {};
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar el producto "${p.descripcion}"?`)) return;
    const ok = await eliminarProducto(p.id);
    if (ok) {
      await recargar();
      notificar("Producto eliminado");
    } else notificar("No se pudo eliminar", "error");
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Mis Productos</h1>
          <p>Catálogo de productos y servicios</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ImportExport modulo="productos" soportaImport onImported={recargar} />
          <button className="btn-primary" onClick={() => setModal({ producto: null })}>
            + Nuevo producto
          </button>
        </div>
      </header>

      <section className={styles.stats}>
        <StatCard label="Total" valor={stats.total} />
        <StatCard label="Con IVA" valor={stats.conIva} />
        <StatCard label="Con retención" valor={stats.conRet} />
      </section>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {productos === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay productos registrados.</p>
          <button className="btn-secondary" onClick={() => setModal({ producto: null })}>
            Crear el primero
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Unidad</th>
                <th>IVA</th>
                <th>Precio</th>
                <th>Retención</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td><code className={styles.codigo}>{p.codigo}</code></td>
                  <td>
                    <div className={styles.nombre}>{p.descripcion}</div>
                    {p.linea && <div className={styles.sub}>{p.linea}</div>}
                  </td>
                  <td>{p.unidad}</td>
                  <td>
                    <span className={`badge-regimen ${tieneIva(p) ? "comun" : "simplificado"}`}>
                      {p.tarifaIva}
                    </span>
                    {tratamientoIva(p.tarifaIva) === "sin_clasificar" && (
                      <div
                        className={styles.sub}
                        title="La tarifa 0% no es una categoría del régimen de IVA. Defínelo como Exento (Art. 477, da derecho a IVA descontable) o Excluido (Art. 476, no lo da)."
                      >
                        ⚠ Sin clasificar
                      </div>
                    )}
                  </td>
                  <td className={styles.precio}>{fmtCOP(p.precioVenta)}</td>
                  <td>
                    {p.retAplica ? (
                      <span className="badge-estado activo" title={p.retNombre || ""}>
                        {p.retTarifa != null ? `${Number(p.retTarifa)}%` : "Sí"}
                      </span>
                    ) : (
                      <span className={styles.noRet}>—</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => setModal({ producto: p })}>Editar</button>
                      <button className={styles.del} onClick={() => eliminar(p)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ProductoModal
          inicial={modal.producto}
          onGuardar={(payload) => guardar(payload, modal.producto?.id)}
          onClose={() => setModal(null)}
        />
      )}

      {notif && <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>}
    </div>
  );
}

function StatCard({ label, valor }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function estadoInicial(p) {
  return {
    codigo: p?.codigo || "",
    descripcion: p?.descripcion || "",
    unidad: p?.unidad || "Unidad",
    comoCompra: p?.comoCompra || "Compras",
    comoVende: p?.comoVende || "Productos",
    tarifaIva: p?.tarifaIva || "19%",
    precioVenta: p?.precioVenta != null ? String(p.precioVenta) : "",
    linea: p?.linea || "",
    retAplica: p?.retAplica || false,
    retCategoria: p?.retCategoria || "",
    retConcepto: p?.retConcepto || "",
    retNombre: p?.retNombre || "",
    retTarifa: p?.retTarifa != null ? Number(p.retTarifa) : null,
  };
}

function ProductoModal({ inicial, onGuardar, onClose }) {
  const [form, setForm] = useState(() => estadoInicial(inicial));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

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
              <label>Tarifa de IVA *</label>
              {/* Agrupadas para que se distinga de un vistazo la tarifa vigente de la que no
                  lo es: varias de estas son históricas o de otro impuesto. */}
              <select value={form.tarifaIva} onChange={(e) => set("tarifaIva", e.target.value)}>
                {GRUPOS_TARIFA.map((g) => (
                  <optgroup key={g.clave} label={g.etiqueta}>
                    {TARIFAS_IVA.filter((t) => t.grupo === g.clave).map((t) => (
                      <option key={t.valor} value={t.valor}>{t.valor}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {form.tarifaIva && TARIFAS_IVA.find((t) => t.valor === form.tarifaIva)?.grupo === "otras" && (
                <small className={styles.avisoTarifa}>
                  No es una tarifa de IVA vigente en Colombia (hoy son 5% y 19%). Se liquidará y
                  se reportará como IVA.
                </small>
              )}
            </div>
          </div>
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
