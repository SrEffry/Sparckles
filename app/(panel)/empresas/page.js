"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listarEmpresas, eliminarEmpresa } from "@/lib/empresasApi";
import styles from "./empresas.module.css";

function nombreEmpresa(e) {
  return e.tipoEntidad === "juridica"
    ? e.razonSocial || "Sin nombre"
    : e.nombreCompleto || `${e.nombres || ""} ${e.apellidos || ""}`.trim();
}

function documentoEmpresa(e) {
  if (e.tipoEntidad === "juridica") return e.nit ? `NIT: ${e.nit}-${e.dv || ""}` : "N/A";
  return e.numeroDocumento ? `${e.tipoDocumento || "Doc"}: ${e.numeroDocumento}` : "N/A";
}

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState(null); // null = cargando
  const [search, setSearch] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [notif, setNotif] = useState(null);

  async function recargar() {
    setEmpresas(await listarEmpresas());
  }

  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const lista = empresas || [];
    return {
      total: lista.length,
      activas: lista.filter((e) => e.estado === "Activo").length,
      juridicas: lista.filter((e) => e.tipoEntidad === "juridica").length,
      naturales: lista.filter((e) => e.tipoEntidad === "natural").length,
    };
  }, [empresas]);

  const filtradas = useMemo(() => {
    const lista = empresas || [];
    const q = search.toLowerCase();
    return lista.filter((e) =>
      [nombreEmpresa(e), documentoEmpresa(e), e.ciudad, e.estado]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [empresas, search]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function eliminar(e) {
    if (
      !confirm(
        `¿Está seguro de eliminar la empresa "${nombreEmpresa(e)}"?\n\nEsta acción no se puede deshacer.`
      )
    )
      return;
    const ok = await eliminarEmpresa(e.id);
    if (ok) {
      await recargar();
      notificar("Empresa eliminada exitosamente");
    } else {
      notificar("No se pudo eliminar la empresa", "error");
    }
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Empresas</h1>
          <p>Gestiona las empresas de tu cuenta</p>
        </div>
        <button className="btn-primary" onClick={() => router.push("/empresas/nueva")}>
          + Nueva empresa
        </button>
      </header>

      <section className={styles.stats}>
        <StatCard label="Total" valor={stats.total} />
        <StatCard label="Activas" valor={stats.activas} />
        <StatCard label="Personas Jurídicas" valor={stats.juridicas} />
        <StatCard label="Personas Naturales" valor={stats.naturales} />
      </section>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="text"
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {empresas === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay empresas registradas.</p>
          <button className="btn-secondary" onClick={() => router.push("/empresas/nueva")}>
            Crear la primera
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((e) => {
                const nombre = nombreEmpresa(e);
                return (
                  <tr key={e.id}>
                    <td>
                      <div className={styles.empresaCell}>
                        <div className={styles.empresaAvatar}>
                          {nombre.split(" ").map((p) => p[0]).join("").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.empresaNombre}>{nombre}</div>
                          {e.email && <div className={styles.empresaSub}>{e.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{documentoEmpresa(e)}</td>
                    <td>
                      <span className={`badge-regimen ${e.tipoEntidad === "natural" ? "simplificado" : "comun"}`}>
                        {e.tipoEntidad === "juridica" ? "Jurídica" : "Natural"}
                      </span>
                    </td>
                    <td>{e.ciudad || "N/A"}</td>
                    <td>
                      <span className={`badge-estado ${e.estado === "Inactivo" ? "inactivo" : "activo"}`}>
                        {e.estado || "Activo"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => setDetalle(e)} title="Ver detalles">Ver</button>
                        <button onClick={() => router.push(`/empresas/${e.id}/editar`)} title="Editar">Editar</button>
                        <button className={styles.del} onClick={() => eliminar(e)} title="Eliminar">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detalle && <DetalleModal empresa={detalle} onClose={() => setDetalle(null)} />}

      {notif && (
        <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>
      )}
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

function DetalleModal({ empresa: e, onClose }) {
  const filas = [
    ["Tipo", e.tipoEntidad === "juridica" ? "Persona Jurídica" : "Persona Natural"],
    ["Documento", documentoEmpresa(e)],
    ["Teléfono", e.telefono],
    ["Email", e.email],
    ["Dirección", e.direccion],
    ["Ciudad", e.ciudad],
    ["Departamento", e.departamento],
    ["Estado", e.estado],
    ["Tarifa IVA retenido", e.tarifaIvaRetenido],
    ["Sujeta a IVA", e.aplicaIva ? "Sí" : "No"],
  ];
  if (e.tipoEntidad === "juridica" && e.repNombres) {
    filas.push(["Representante legal", `${e.repNombres} ${e.repApellidos || ""}`]);
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-header">
          <h2>{nombreEmpresa(e)}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {filas.map(([k, v]) => (
            <div key={k} className={styles.detalleFila}>
              <span>{k}</span>
              <strong>{v || "N/A"}</strong>
            </div>
          ))}
          {e.aplicaIva && e.caracteristicasTributarias?.length > 0 && (
            <div className={styles.detalleFila}>
              <span>Características</span>
              <strong>{e.caracteristicasTributarias.join(", ")}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
