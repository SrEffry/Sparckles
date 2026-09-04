"use client";

import { useEffect, useMemo, useState } from "react";
import { TABLA_RETEFUENTE_2026 } from "@/lib/data/tablaRetefuente";
import { TRATAMIENTOS_IVA } from "@/lib/data/impuestos";
import { listarImpuestos } from "@/lib/impuestosApi";
import { hoyBogota } from "@/lib/fechas";
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "@/lib/productosApi";
import ImportExport from "@/components/ImportExport";
import ProductoModal from "@/components/ProductoModal";
import styles from "./productos.module.css";

const UNIDADES = ["Unidad", "Kilogramo", "Gramo", "Libra", "Metro", "Litro", "Hora", "Servicio"];
const COMO_COMPRA = ["Compras", "Productos Terminados", "Materia Prima", "No Aplica"];
const COMO_VENDE = ["Productos", "Servicios", "Activos Fijos", "No Aplica"];
// Los impuestos vienen del catálogo (tabla `Impuesto`), no de una lista en código: las
// tarifas cambian por ley y no deben requerir un despliegue.
const LINEAS = ["", "Línea A", "Línea B", "Línea C"];

// Categorías que efectivamente tienen conceptos en la tabla
const CATEGORIAS_RET = [...new Set(TABLA_RETEFUENTE_2026.conceptos.map((c) => c.categoria))];

const fmtCOP = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

// Un producto "tiene IVA" solo si su tratamiento es gravado Y tiene algún impuesto de tipo
// IVA asignado. Exento liquida al 0% y excluido no lleva impuesto en absoluto.
function tieneIva(p) {
  return (
    p.tratamientoIva === "gravado" &&
    (p.impuestos || []).some((pi) => pi.impuesto?.tipo === "IVA" && Number(pi.impuesto.tarifa) > 0)
  );
}

/** Etiqueta compacta de los impuestos del producto, para la tabla. */
function etiquetaImpuestos(p) {
  const lista = (p.impuestos || []).map((pi) => pi.impuesto).filter(Boolean);
  if (p.tratamientoIva === "excluido") return "Excluido";
  if (p.tratamientoIva === "no_gravado") return "No gravado";
  if (lista.length === 0) return "—";
  return lista.map((i) => `${i.tipo} ${Number(i.tarifa)}%`).join(" + ");
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
                      {etiquetaImpuestos(p)}
                    </span>
                    {p.tratamientoIva === "no_gravado" && p.tarifaIva && (
                      <div
                        className={styles.sub}
                        title={`Venía con la tarifa heredada "${p.tarifaIva}", que no es una categoría del régimen. Defínelo como Exento (Art. 477, da derecho a IVA descontable) o Excluido (Art. 476, no lo da).`}
                      >
                        ⚠ Por clasificar
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

