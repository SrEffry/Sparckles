"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import colombia from "@/lib/data/colombia.json";
import styles from "./EmpresaWizard.module.css";

const TIPOS_DOC = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de Identidad" },
];

const TARIFAS_IVA = ["No aplica", "15%", "50%", "75%", "100%"];

const CARACTERISTICAS = [
  { value: "autoretenedora", label: "La empresa es autoretenedora" },
  { value: "exentoRetencion", label: "Exento a retención" },
  { value: "agenteRetenedor", label: "La empresa es agente retenedor" },
  { value: "industriaComercio", label: "Industria y comercio" },
  { value: "entidadAnimoLucro", label: "Entidad ánimo de lucro" },
  { value: "unionTemporal", label: "Unión temporal" },
  { value: "granContribuyente", label: "La empresa es gran contribuyente" },
  { value: "autorretenedorRenta", label: "Autorretenedor de renta" },
  { value: "autorretenedorIca", label: "Autorretenedor de ICA" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function estadoInicial(inicial) {
  return {
    tipoEntidad: inicial?.tipoEntidad || "juridica",
    estado: inicial?.estado || "Activo",
    razonSocial: inicial?.razonSocial || "",
    nit: inicial?.nit || "",
    dv: inicial?.dv || "",
    repNombres: inicial?.repNombres || "",
    repApellidos: inicial?.repApellidos || "",
    repTipoDocumento: inicial?.repTipoDocumento || "",
    repNumeroDocumento: inicial?.repNumeroDocumento || "",
    repTelefono: inicial?.repTelefono || "",
    repEmail: inicial?.repEmail || "",
    nombres: inicial?.nombres || "",
    apellidos: inicial?.apellidos || "",
    tipoDocumento: inicial?.tipoDocumento || "",
    numeroDocumento: inicial?.numeroDocumento || "",
    telefono: inicial?.telefono || "",
    email: inicial?.email || "",
    pais: inicial?.pais || "Colombia",
    departamento: inicial?.departamento || "",
    ciudad: inicial?.ciudad || "",
    direccion: inicial?.direccion || "",
    codigoPostal: inicial?.codigoPostal || "",
    tarifaIvaRetenido: inicial?.tarifaIvaRetenido || "",
    aplicaIva: inicial?.aplicaIva || false,
    caracteristicasTributarias: inicial?.caracteristicasTributarias || [],
  };
}

export default function EmpresaWizard({ inicial = null, onGuardar, titulo }) {
  const router = useRouter();
  const [form, setForm] = useState(() => estadoInicial(inicial));
  const [paso, setPaso] = useState(1);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const esJuridica = form.tipoEntidad === "juridica";
  const departamentos = useMemo(() => Object.keys(colombia), []);
  const ciudades = form.departamento ? colombia[form.departamento] || [] : [];

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function setDepartamento(dep) {
    setForm((f) => ({ ...f, departamento: dep, ciudad: "" }));
  }

  function toggleCaracteristica(value) {
    setForm((f) => {
      const tiene = f.caracteristicasTributarias.includes(value);
      return {
        ...f,
        caracteristicasTributarias: tiene
          ? f.caracteristicasTributarias.filter((c) => c !== value)
          : [...f.caracteristicasTributarias, value],
      };
    });
  }

  const labelPaso2 = esJuridica ? "Representante" : "Confirmación";
  const labels = ["Info Básica", labelPaso2, "Ubicación", "Tributaria"];

  function mostrarError(msg) {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  }

  function validarPaso(p) {
    if (p === 1) {
      if (esJuridica) {
        if (!form.razonSocial.trim()) return "Ingrese la razón social.";
        if (!form.nit.trim()) return "Ingrese el NIT.";
        if (form.dv.trim().length !== 1) return "El dígito de verificación debe ser 1 carácter.";
        if (!form.telefono.trim()) return "Ingrese el teléfono de la empresa.";
        if (!EMAIL_RE.test(form.email.trim())) return "Ingrese un correo válido.";
      } else {
        if (!form.nombres.trim()) return "Ingrese los nombres.";
        if (!form.apellidos.trim()) return "Ingrese los apellidos.";
        if (!form.tipoDocumento) return "Seleccione el tipo de documento.";
        if (!form.numeroDocumento.trim()) return "Ingrese el número de documento.";
        if (!form.telefono.trim()) return "Ingrese el teléfono.";
        if (!EMAIL_RE.test(form.email.trim())) return "Ingrese un correo válido.";
      }
    }
    if (p === 2 && esJuridica) {
      if (!form.repNombres.trim()) return "Ingrese los nombres del representante legal.";
      if (!form.repApellidos.trim()) return "Ingrese los apellidos del representante legal.";
      if (!form.repTipoDocumento) return "Seleccione el tipo de documento del representante.";
      if (!form.repNumeroDocumento.trim()) return "Ingrese el número de documento del representante.";
    }
    if (p === 3) {
      if (!form.pais) return "Seleccione el país.";
      if (!form.departamento) return "Seleccione el departamento.";
      if (!form.ciudad) return "Seleccione la ciudad.";
      if (!form.direccion.trim()) return "Ingrese la dirección.";
    }
    return null;
  }

  function siguiente() {
    const err = validarPaso(paso);
    if (err) return mostrarError(err);
    setError("");
    setPaso((p) => Math.min(4, p + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function anterior() {
    setError("");
    setPaso((p) => Math.max(1, p - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar() {
    for (const p of [1, 2, 3]) {
      const err = validarPaso(p);
      if (err) {
        setPaso(p);
        return mostrarError(err);
      }
    }
    if (!form.tarifaIvaRetenido) return mostrarError("Seleccione la tarifa de IVA retenido.");

    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res?.error) return mostrarError(res.error);
    router.push("/empresas");
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.pageHead}>
        <button className={styles.back} onClick={() => router.push("/empresas")} aria-label="Volver">
          ←
        </button>
        <div>
          <h1>{titulo}</h1>
          <p>Complete la información de la empresa</p>
        </div>
      </div>

      {/* Progreso */}
      <div className={styles.progress}>
        <div className={styles.progressHead}>
          <span>Paso {paso} de 4</span>
          <strong>{labels[paso - 1]}</strong>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${(paso / 4) * 100}%` }} />
        </div>
        <div className={styles.stepLabels}>
          {labels.map((l, i) => (
            <span key={l} className={i + 1 <= paso ? styles.stepActive : ""}>
              {l}
            </span>
          ))}
        </div>
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      {/* Paso 1 */}
      {paso === 1 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Información Básica</h2>
          <div className={styles.tipoCards}>
            <label className={`${styles.tipoCard} ${esJuridica ? styles.tipoSel : ""}`}>
              <input
                type="radio"
                name="tipoEntidad"
                checked={esJuridica}
                onChange={() => set("tipoEntidad", "juridica")}
              />
              <strong>Persona Jurídica</strong>
              <span>Empresa u organización con NIT</span>
            </label>
            <label className={`${styles.tipoCard} ${!esJuridica ? styles.tipoSel : ""}`}>
              <input
                type="radio"
                name="tipoEntidad"
                checked={!esJuridica}
                onChange={() => set("tipoEntidad", "natural")}
              />
              <strong>Persona Natural</strong>
              <span>Individuo con documento de identidad</span>
            </label>
          </div>

          {esJuridica ? (
            <div className={styles.grid}>
              <Field className={styles.full} label="Razón Social *">
                <input value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} placeholder="Empresa S.A.S." />
              </Field>
              <Field label="NIT *">
                <input value={form.nit} onChange={(e) => set("nit", e.target.value)} placeholder="900123456" />
              </Field>
              <Field label="Dígito de Verificación *">
                <input value={form.dv} maxLength={1} onChange={(e) => set("dv", e.target.value)} placeholder="1" />
              </Field>
              <Field label="Teléfono *">
                <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="3001234567" />
              </Field>
              <Field label="Correo Electrónico *">
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contacto@empresa.com" />
              </Field>
            </div>
          ) : (
            <div className={styles.grid}>
              <Field label="Nombres *">
                <input value={form.nombres} onChange={(e) => set("nombres", e.target.value)} placeholder="Juan Carlos" />
              </Field>
              <Field label="Apellidos *">
                <input value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} placeholder="García Rodríguez" />
              </Field>
              <Field label="Tipo de Documento *">
                <select value={form.tipoDocumento} onChange={(e) => set("tipoDocumento", e.target.value)}>
                  <option value="">Seleccione tipo</option>
                  {TIPOS_DOC.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Número de Documento *">
                <input value={form.numeroDocumento} onChange={(e) => set("numeroDocumento", e.target.value)} placeholder="1234567890" />
              </Field>
              <Field label="Teléfono *">
                <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="3001234567" />
              </Field>
              <Field label="Correo Electrónico *">
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="juan@example.com" />
              </Field>
            </div>
          )}
          <Acciones alFinal onNext={siguiente} />
        </section>
      )}

      {/* Paso 2 */}
      {paso === 2 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {esJuridica ? "Datos del Representante Legal" : "Confirmación de Datos"}
          </h2>
          {esJuridica ? (
            <div className={styles.grid}>
              <Field label="Nombres *">
                <input value={form.repNombres} onChange={(e) => set("repNombres", e.target.value)} placeholder="María José" />
              </Field>
              <Field label="Apellidos *">
                <input value={form.repApellidos} onChange={(e) => set("repApellidos", e.target.value)} placeholder="Martínez López" />
              </Field>
              <Field label="Tipo de Documento *">
                <select value={form.repTipoDocumento} onChange={(e) => set("repTipoDocumento", e.target.value)}>
                  <option value="">Seleccione tipo</option>
                  {TIPOS_DOC.filter((t) => t.value !== "TI").map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Número de Documento *">
                <input value={form.repNumeroDocumento} onChange={(e) => set("repNumeroDocumento", e.target.value)} placeholder="1234567890" />
              </Field>
              <Field label="Teléfono">
                <input value={form.repTelefono} onChange={(e) => set("repTelefono", e.target.value)} placeholder="3001234567" />
              </Field>
              <Field label="Correo Electrónico">
                <input type="email" value={form.repEmail} onChange={(e) => set("repEmail", e.target.value)} placeholder="maria@example.com" />
              </Field>
            </div>
          ) : (
            <div className={styles.info}>
              <strong>Datos personales completos ✓</strong>
              <p>Como Persona Natural, tus datos ya están registrados. Continúa al siguiente paso.</p>
            </div>
          )}
          <Acciones onPrev={anterior} onNext={siguiente} />
        </section>
      )}

      {/* Paso 3 */}
      {paso === 3 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ubicación</h2>
          <div className={styles.grid}>
            <Field label="País *">
              <select value={form.pais} onChange={(e) => set("pais", e.target.value)}>
                <option value="">Seleccione un país</option>
                <option value="Colombia">Colombia</option>
              </select>
            </Field>
            <Field label="Departamento *">
              <select value={form.departamento} onChange={(e) => setDepartamento(e.target.value)}>
                <option value="">Seleccione departamento</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Ciudad *">
              <select value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} disabled={!form.departamento}>
                <option value="">Seleccione ciudad</option>
                {ciudades.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field className={styles.full} label="Dirección *">
              <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle 123 #45-67" />
            </Field>
            <Field label="Código Postal">
              <input value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value)} placeholder="110111" />
            </Field>
          </div>
          <Acciones onPrev={anterior} onNext={siguiente} />
        </section>
      )}

      {/* Paso 4 */}
      {paso === 4 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Configuración Tributaria</h2>
          <div className={styles.grid}>
            <Field className={styles.full} label="Tarifa de IVA Retenido *">
              <select value={form.tarifaIvaRetenido} onChange={(e) => set("tarifaIvaRetenido", e.target.value)}>
                <option value="">Seleccione tarifa</option>
                {TARIFAS_IVA.map((t) => (
                  <option key={t} value={t}>{t === "No aplica" ? "No aplica (0%)" : t}</option>
                ))}
              </select>
              <small className={styles.hint}>Retención en la Fuente sobre IVA según normativa DIAN</small>
            </Field>

            <Field className={styles.full} label="¿La empresa está sujeta a IVA? *">
              <div className={styles.radioRow}>
                <label>
                  <input type="radio" name="aplicaIva" checked={form.aplicaIva === true} onChange={() => set("aplicaIva", true)} /> Sí, aplica
                </label>
                <label>
                  <input type="radio" name="aplicaIva" checked={form.aplicaIva === false} onChange={() => set("aplicaIva", false)} /> No aplica
                </label>
              </div>
            </Field>

            {form.aplicaIva && (
              <div className={styles.full}>
                <label className={styles.blockLabel}>Seleccione las características tributarias que aplican:</label>
                <div className={styles.checkGrid}>
                  {CARACTERISTICAS.map((c) => (
                    <label key={c.value} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={form.caracteristicasTributarias.includes(c.value)}
                        onChange={() => toggleCaracteristica(c.value)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Field className={styles.full} label="Estado">
              <select value={form.estado} onChange={(e) => set("estado", e.target.value)}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </Field>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnPrev} onClick={anterior}>← Anterior</button>
            <button className="btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar Empresa"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, className = "", children }) {
  return (
    <div className={`${className}`}>
      <label className="empresa-field-label">{label}</label>
      {children}
    </div>
  );
}

function Acciones({ onPrev, onNext, alFinal }) {
  return (
    <div className={styles.actions}>
      {onPrev ? (
        <button className={styles.btnPrev} onClick={onPrev}>← Anterior</button>
      ) : (
        <span />
      )}
      <button className="btn-primary" onClick={onNext}>Siguiente →</button>
    </div>
  );
}
