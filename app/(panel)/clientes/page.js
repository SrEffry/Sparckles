"use client";

import { useEffect, useMemo, useState } from "react";
import colombia from "@/lib/data/colombia.json";
import {
  listarClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} from "@/lib/clientesApi";
import ImportExport from "@/components/ImportExport";
import ClienteModal from "@/components/ClienteModal";
import styles from "./clientes.module.css";

const TIPOS_DOC = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de Identidad" },
];

const DEPARTAMENTOS = Object.keys(colombia);

function documento(c) {
  return c.tipo === "natural"
    ? `${c.tipoDocumento || "CC"}: ${c.numeroDocumento || "N/A"}`
    : `NIT: ${c.nit || "N/A"}-${c.dv || ""}`;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modal, setModal] = useState(null); // { cliente } | { cliente: null }
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setClientes(await listarClientes());
  }
  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const l = clientes || [];
    return {
      total: l.length,
      naturales: l.filter((c) => c.tipo === "natural").length,
      empresas: l.filter((c) => c.tipo === "empresa").length,
    };
  }, [clientes]);

  const filtrados = useMemo(() => {
    let l = clientes || [];
    const q = search.toLowerCase();
    if (q) {
      l = l.filter((c) =>
        [c.nombreCompleto, c.nit, c.numeroDocumento, c.email]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    if (filtroTipo) l = l.filter((c) => c.tipo === filtroTipo);
    return l;
  }, [clientes, search, filtroTipo]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function guardar(payload, id) {
    const res = id
      ? await actualizarCliente(id, payload)
      : await crearCliente(payload);
    if (res.error) return res;
    await recargar();
    setModal(null);
    notificar(id ? "Cliente actualizado exitosamente" : "Cliente registrado exitosamente");
    return {};
  }

  async function eliminar(c) {
    if (!confirm("¿Está seguro de que desea eliminar este cliente?")) return;
    const ok = await eliminarCliente(c.id);
    if (ok) {
      await recargar();
      notificar("Cliente eliminado exitosamente");
    } else {
      notificar("No se pudo eliminar el cliente", "error");
    }
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Clientes</h1>
          <p>Gestiona tus clientes y su información de retención</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ImportExport modulo="clientes" soportaImport onImported={recargar} />
          <button className="btn-primary" onClick={() => setModal({ cliente: null })}>
            + Nuevo cliente
          </button>
        </div>
      </header>

      <section className={styles.stats}>
        <StatCard label="Total" valor={stats.total} />
        <StatCard label="Personas Naturales" valor={stats.naturales} />
        <StatCard label="Empresas" valor={stats.empresas} />
      </section>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="text"
          placeholder="Buscar por nombre o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filtro}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="natural">Persona Natural</option>
          <option value="empresa">Empresa</option>
        </select>
      </div>

      {clientes === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay clientes registrados.</p>
          <button className="btn-secondary" onClick={() => setModal({ cliente: null })}>
            Registrar el primero
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Retención</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className={styles.cell}>
                      <div className={styles.avatar}>
                        {(c.nombreCompleto || "?")
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.nombre}>{c.nombreCompleto}</div>
                        {c.email && <div className={styles.sub}>{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge-regimen ${c.tipo === "empresa" ? "comun" : "simplificado"}`}>
                      {c.tipo === "natural" ? "Natural" : "Empresa"}
                    </span>
                  </td>
                  <td>{documento(c)}</td>
                  <td>{c.telefono || "N/A"}</td>
                  <td>
                    <div className={styles.retChips}>
                      {c.esAgenteRetenedor ? (
                        <span className="badge-estado activo">Agente ret.</span>
                      ) : (
                        <span className={styles.noRet}>No</span>
                      )}
                      {c.esAutorretenedor && (
                        <span className={styles.autorret}>Autorret.</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => setModal({ cliente: c, ver: true })} title="Ver">Ver</button>
                      <button onClick={() => setModal({ cliente: c })} title="Editar">Editar</button>
                      <button className={styles.del} onClick={() => eliminar(c)} title="Eliminar">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && modal.ver && (
        <DetalleModal cliente={modal.cliente} onClose={() => setModal(null)} />
      )}
      {modal && !modal.ver && (
        <ClienteModal
          inicial={modal.cliente}
          onGuardar={(payload) => guardar(payload, modal.cliente?.id)}
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

function DetalleModal({ cliente: c, onClose }) {
  const filas = [
    ["Tipo", c.tipo === "natural" ? "Persona Natural" : "Empresa"],
    ["Documento", documento(c)],
    c.tipo === "empresa" && c.nombreComercial !== c.razonSocial
      ? ["Nombre Comercial", c.nombreComercial]
      : null,
    c.tipo === "empresa" ? ["Persona de Contacto", c.personaContacto] : null,
    ["Teléfono", c.telefono],
    ["Email", c.email],
    ["Dirección", c.direccion],
    ["Ciudad", c.ciudad],
    ["Departamento", c.departamento],
    ["Agente de retención", c.esAgenteRetenedor ? "Sí" : "No"],
    c.esAutorretenedor ? ["Autorretenedor", "Sí (Gran Contribuyente)"] : null,
  ].filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{c.nombreCompleto}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {filas.map(([k, v]) => (
            <div key={k} className={styles.detalleFila}>
              <span>{k}</span>
              <strong>{v || "N/A"}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
