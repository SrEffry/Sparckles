"use client";

// Modal de creación/edición de cliente.
//
// Vive en `components/` y NO en la pantalla de clientes porque se usa en DOS sitios: allí y en
// la de nueva factura, donde permite crear un cliente sin salir del borrador que se está
// armando. Duplicar el formulario habría dejado dos juegos de campos que se desincronizan a la
// primera regla nueva — y aquí se decide si el cliente es agente retenedor o autorretenedor,
// que es lo que dirige la retención de la factura.

import { useState } from "react";
import colombia from "@/lib/data/colombia.json";
import styles from "./clienteModal.module.css";


function estadoInicial(c) {
  return {
    tipo: c?.tipo || "natural",
    nombres: c?.nombres || "",
    apellidos: c?.apellidos || "",
    tipoDocumento: c?.tipoDocumento || "CC",
    numeroDocumento: c?.numeroDocumento || "",
    razonSocial: c?.razonSocial || "",
    nombreComercial: c?.nombreComercial || "",
    nit: c?.nit || "",
    dv: c?.dv || "",
    personaContacto: c?.personaContacto || "",
    telefono: c?.telefono || "",
    email: c?.email || "",
    departamento: c?.departamento || "",
    ciudad: c?.ciudad || "",
    direccion: c?.direccion || "",
    esAgenteRetenedor:
      c?.esAgenteRetenedor ?? (c?.tipo === "empresa" ? true : false),
    esAutorretenedor: c?.esAutorretenedor || false,
  };
}

export default function ClienteModal({ inicial, onGuardar, onClose }) {
  const [form, setForm] = useState(() => estadoInicial(inicial));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const esNatural = form.tipo === "natural";
  const ciudades = form.departamento ? colombia[form.departamento] || [] : [];

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  function cambiarTipo(tipo) {
    setForm((f) => ({
      ...f,
      tipo,
      esAgenteRetenedor: tipo === "empresa",
      esAutorretenedor: false,
    }));
  }
  function setDepartamento(dep) {
    setForm((f) => ({ ...f, departamento: dep, ciudad: "" }));
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
          <h2>{inicial ? "Editar Cliente" : "Nuevo Cliente"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={styles.tipoToggle}>
            <label className={esNatural ? styles.tipoOn : ""}>
              <input type="radio" checked={esNatural} onChange={() => cambiarTipo("natural")} />
              Persona Natural
            </label>
            <label className={!esNatural ? styles.tipoOn : ""}>
              <input type="radio" checked={!esNatural} onChange={() => cambiarTipo("empresa")} />
              Empresa
            </label>
          </div>

          {esNatural ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombres *</label>
                  <input value={form.nombres} onChange={(e) => set("nombres", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Documento *</label>
                  <select value={form.tipoDocumento} onChange={(e) => set("tipoDocumento", e.target.value)}>
                    {TIPOS_DOC.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Número de Documento *</label>
                  <input value={form.numeroDocumento} onChange={(e) => set("numeroDocumento", e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Razón Social *</label>
                <input value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre Comercial</label>
                  <input value={form.nombreComercial} onChange={(e) => set("nombreComercial", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Persona de Contacto</label>
                  <input value={form.personaContacto} onChange={(e) => set("personaContacto", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>NIT *</label>
                  <input value={form.nit} onChange={(e) => set("nit", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>DV *</label>
                  <input value={form.dv} maxLength={1} onChange={(e) => set("dv", e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Departamento</label>
              <select value={form.departamento} onChange={(e) => setDepartamento(e.target.value)}>
                <option value="">Seleccione</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ciudad</label>
              <select value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} disabled={!form.departamento}>
                <option value="">Seleccione</option>
                {ciudades.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
          </div>

          <div className={styles.retBox}>
            <strong>Configuración de retención</strong>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.esAgenteRetenedor}
                onChange={(e) => set("esAgenteRetenedor", e.target.checked)}
              />
              Es agente de retención
            </label>
            {!esNatural && (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={form.esAutorretenedor}
                  onChange={(e) => set("esAutorretenedor", e.target.checked)}
                />
                Es autorretenedor (Gran Contribuyente)
              </label>
            )}
            <small className={styles.retHint}>
              Determina si se aplican retenciones cuando este cliente aparece en una factura.
            </small>
          </div>

          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={guardando}>
            {guardando ? "Guardando..." : inicial ? "Actualizar" : "Guardar Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
