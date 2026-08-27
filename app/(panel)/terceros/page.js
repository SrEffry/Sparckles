"use client";

// Registro de terceros.
//
// Es la ficha de identidad de proveedores y prestadores: el sitio donde por fin se pueden
// guardar el tipo de documento DIAN, los cuatro campos de nombre separados y los códigos DANE
// que exige la exógena. Los terceros se crean SOLOS al registrar una compra o un documento
// soporte; esta pantalla es para completarlos y corregirlos.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarTerceros,
  crearTercero,
  guardarTercero,
  eliminarTercero,
  consolidarTerceros,
} from "@/lib/tercerosApi";
import { TIPOS_DOCUMENTO_SELECCIONABLES } from "@/lib/data/tiposDocumentoDian";
import { DEPARTAMENTOS, PAISES, municipiosDe, CODIGO_PAIS_COLOMBIA } from "@/lib/data/dane";
import styles from "./terceros.module.css";

const VACIO = {
  tipo: "juridica",
  documento: "",
  dv: "",
  tipoDocumentoDian: "31",
  razonSocial: "",
  primerApellido: "",
  segundoApellido: "",
  primerNombre: "",
  otrosNombres: "",
  direccion: "",
  telefono: "",
  email: "",
  codigoDepartamento: "",
  codigoMunicipio: "",
  codigoPais: CODIGO_PAIS_COLOMBIA,
};

export default function TercerosPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [terceros, setTerceros] = useState(null);
  const [edit, setEdit] = useState(null);
  const [notif, setNotif] = useState(null);

  const recargar = useCallback(async () => {
    const { terceros } = await listarTerceros({ q, pendientes: soloPendientes });
    setTerceros(terceros);
  }, [q, soloPendientes]);

  useEffect(() => {
    const t = setTimeout(recargar, 200);
    return () => clearTimeout(t);
  }, [recargar]);

  function avisar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 4000);
  }

  async function consolidar() {
    const res = await consolidarTerceros();
    if (res.error) return avisar(res.error, "error");
    const r = res.resumen;
    await recargar();
    avisar(
      `${r.tercerosCreados} ficha(s) creada(s) · ${r.comprasEnlazadas} compra(s), ${r.soportesEnlazados} soporte(s) y ${r.clientesEnlazados} cliente(s) enlazados` +
        (r.sinDocumento ? ` · ${r.sinDocumento} sin documento, no se pudieron enlazar` : "")
    );
  }

  async function borrar(t) {
    if (!confirm(`¿Eliminar a ${t.nombre}?`)) return;
    const res = await eliminarTercero(t.id);
    if (res.error) return avisar(res.error, "error");
    await recargar();
    avisar(res.mensaje || "Tercero eliminado");
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Terceros</h1>
          <p>Proveedores y prestadores, con los datos que exige la información exógena.</p>
        </div>
        <div className={styles.headAcciones}>
          <button className="btn-secondary" onClick={consolidar} title="Enlaza compras y documentos soporte que todavía no tienen ficha de tercero">
            Consolidar existentes
          </button>
          <button className="btn-primary" onClick={() => setEdit({ ...VACIO })}>
            + Nuevo tercero
          </button>
        </div>
      </header>

      <div className={styles.filtros}>
        <input
          className={styles.buscar}
          placeholder="Buscar por nombre o documento..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
          />
          Solo los que tienen datos pendientes
        </label>
      </div>

      {terceros === null ? (
        <div className={styles.empty}>Cargando...</div>
      ) : terceros.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {q || soloPendientes
              ? "Ningún tercero coincide."
              : "Todavía no hay terceros. Se crean solos al registrar compras o documentos soporte."}
          </p>
          <button className="btn-secondary" onClick={consolidar}>
            Consolidar los que ya tienen documentos
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tercero</th>
                <th>Documento</th>
                <th>Rol</th>
                <th>Ubicación</th>
                <th>Documentos</th>
                <th>Estado exógena</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {terceros.map((t) => (
                <tr key={t.id} className={t.activo ? "" : styles.inactivo}>
                  <td>
                    <strong>{t.nombre}</strong>
                    <div className={styles.sub}>
                      {t.tipo === "natural" ? "Persona natural" : "Persona jurídica"}
                      {!t.activo && " · inactivo"}
                    </div>
                  </td>
                  <td>
                    {t.documento}
                    {t.dv ? `-${t.dv}` : ""}
                    <div className={styles.sub}>
                      {t.tipoDocumentoDian
                        ? `Tipo ${t.tipoDocumentoDian}`
                        : <span className={styles.falta}>sin tipo DIAN</span>}
                    </div>
                  </td>
                  {/* EL PUNTO DE LA UNIFICACIÓN: un mismo NIT que nos vende y nos compra es UN
                      tercero con dos roles, no dos fichas. La DIAN cruza el 1007 del receptor
                      contra el 1001 del pagador, así que dos identidades no cuadran. */}
                  <td>
                    <div className={styles.roles}>
                      {t._count.clientes > 0 && <span className={styles.rol}>Cliente</span>}
                      {t._count.compras + t._count.soportes > 0 && (
                        <span className={styles.rol}>Proveedor</span>
                      )}
                      {t._count.clientes === 0 && t._count.compras + t._count.soportes === 0 && (
                        <span className={styles.sub}>—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {t.codigoDepartamento && t.codigoMunicipio ? (
                      `${t.codigoDepartamento}${t.codigoMunicipio}`
                    ) : (
                      <span className={styles.falta}>—</span>
                    )}
                  </td>
                  <td>{t._count.compras + t._count.soportes + t._count.clientes}</td>
                  <td>
                    {t.criticos?.length ? (
                      <span className={styles.pill} data-t="critico">
                        {t.criticos.length} bloqueante{t.criticos.length === 1 ? "" : "s"}
                      </span>
                    ) : t.faltantes?.length ? (
                      <span className={styles.pill} data-t="falta">
                        {t.faltantes.length} por completar
                      </span>
                    ) : (
                      <span className={styles.pill} data-t="ok">
                        Listo
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      <button onClick={() => setEdit(t)}>Editar</button>
                      <button className={styles.del} onClick={() => borrar(t)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <Ficha
          inicial={edit}
          onCerrar={() => setEdit(null)}
          onGuardado={async (mensaje) => {
            setEdit(null);
            await recargar();
            avisar(mensaje);
          }}
          onError={(e) => avisar(e, "error")}
        />
      )}

      {notif && <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>}
    </div>
  );
}

function Ficha({ inicial, onCerrar, onGuardado, onError }) {
  const [f, setF] = useState({ ...VACIO, ...inicial });
  const [guardando, setGuardando] = useState(false);
  const esNuevo = !inicial.id;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const municipios = f.codigoDepartamento ? municipiosDe(f.codigoDepartamento) : [];

  async function guardar() {
    setGuardando(true);
    const res = esNuevo ? await crearTercero(f) : await guardarTercero(inicial.id, f);
    setGuardando(false);
    if (res.error) return onError(res.error);
    onGuardado(esNuevo ? "Tercero creado" : "Tercero actualizado");
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h2>{esNuevo ? "Nuevo tercero" : f.nombre || "Editar tercero"}</h2>
          <button className="modal-close" onClick={onCerrar}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de persona</label>
              <select value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="juridica">Persona jurídica</option>
                <option value="natural">Persona natural</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de documento (DIAN)</label>
              <select
                value={f.tipoDocumentoDian || ""}
                onChange={(e) => set("tipoDocumentoDian", e.target.value)}
              >
                <option value="">Sin definir</option>
                {TIPOS_DOCUMENTO_SELECCIONABLES.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.codigo} — {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Número de identificación</label>
              <input value={f.documento} onChange={(e) => set("documento", e.target.value)} />
            </div>
            <div className="form-group">
              <label>DV</label>
              <input value={f.dv || ""} onChange={(e) => set("dv", e.target.value)} maxLength={1} />
            </div>
          </div>

          {f.tipo === "juridica" ? (
            <div className="form-group">
              <label>Razón social</label>
              <input value={f.razonSocial || ""} onChange={(e) => set("razonSocial", e.target.value)} />
            </div>
          ) : (
            <>
              {/* Los cuatro campos van SEPARADOS porque así los pide la DIAN, y no se deducen
                  partiendo el nombre completo: un apellido mal partido es información errónea. */}
              <p className={styles.ayuda}>
                La DIAN pide apellidos y nombres en cuatro campos separados. No se deducen del
                nombre completo: un apellido mal partido cuenta como información errónea.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label>Primer apellido</label>
                  <input value={f.primerApellido || ""} onChange={(e) => set("primerApellido", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Segundo apellido</label>
                  <input value={f.segundoApellido || ""} onChange={(e) => set("segundoApellido", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Primer nombre</label>
                  <input value={f.primerNombre || ""} onChange={(e) => set("primerNombre", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Otros nombres</label>
                  <input value={f.otrosNombres || ""} onChange={(e) => set("otrosNombres", e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Dirección</label>
            <input value={f.direccion || ""} onChange={(e) => set("direccion", e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Departamento</label>
              <select
                value={f.codigoDepartamento || ""}
                onChange={(e) => {
                  set("codigoDepartamento", e.target.value);
                  // Al cambiar de departamento el municipio deja de ser válido: se limpia en vez
                  // de dejar una combinación que el validador del servidor va a rechazar.
                  set("codigoMunicipio", "");
                }}
              >
                <option value="">Sin definir</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d.codigo} value={d.codigo}>
                    {d.codigo} — {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Municipio</label>
              <select
                value={f.codigoMunicipio || ""}
                onChange={(e) => set("codigoMunicipio", e.target.value)}
                disabled={!f.codigoDepartamento}
              >
                <option value="">{f.codigoDepartamento ? "Sin definir" : "Elige departamento"}</option>
                {municipios.map((m) => (
                  <option key={m.codigo} value={m.codigo.slice(2)}>
                    {m.codigo} — {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>País</label>
              <select value={f.codigoPais || ""} onChange={(e) => set("codigoPais", e.target.value)}>
                <option value="">Sin definir</option>
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} — {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={f.telefono || ""} onChange={(e) => set("telefono", e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input value={f.email || ""} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
