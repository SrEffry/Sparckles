"use client";

import { useEffect, useState } from "react";
import { obtenerConfig, guardarConfig, olvidarLogoEmisor } from "@/lib/configFacturacionApi";
import styles from "./config.module.css";

// Términos vigentes (los antiguos "Común"/"Simplificado" ya no se usan en la norma).
const REGIMENES = [
  "Responsable de IVA",
  "No responsable de IVA",
  "Régimen Simple de Tributación (RST)",
];

const VACIO = {
  logo: "",
  razonSocial: "",
  nit: "",
  regimen: "",
  responsableIva: true,
  exoneradoParafiscales: false,
  direccion: "",
  ciudad: "",
  telefono: "",
  email: "",
  actividadEconomica: "",
  resNumero: "",
  resFecha: "",
  prefijo: "",
  numeracionDesde: "",
  numeracionHasta: "",
  resVencimiento: "",
  pieFact: "",
  observaciones: "",
};

export default function ConfigurarFacturacionPage() {
  const [form, setForm] = useState(VACIO);
  const [numeracionActual, setNumeracionActual] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    obtenerConfig().then((config) => {
      if (config) {
        setForm({
          logo: config.logo || "",
          razonSocial: config.razonSocial || "",
          nit: config.nit || "",
          regimen: config.regimen || "",
          responsableIva: config.responsableIva ?? true,
          exoneradoParafiscales: config.exoneradoParafiscales ?? false,
          direccion: config.direccion || "",
          ciudad: config.ciudad || "",
          telefono: config.telefono || "",
          email: config.email || "",
          actividadEconomica: config.actividadEconomica || "",
          resNumero: config.resNumero || "",
          resFecha: config.resFecha || "",
          prefijo: config.prefijo || "",
          numeracionDesde: config.numeracionDesde ?? "",
          numeracionHasta: config.numeracionHasta ?? "",
          resVencimiento: config.resVencimiento || "",
          pieFact: config.pieFact || "",
          observaciones: config.observaciones || "",
        });
        setNumeracionActual(config.numeracionActual ?? null);
      }
      setCargando(false);
    });
  }, []);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  // Al elegir régimen se ajusta "responsable de IVA"; en RST queda a criterio del contribuyente.
  function cambiarRegimen(regimen) {
    setForm((f) => ({
      ...f,
      regimen,
      responsableIva:
        regimen === "Responsable de IVA"
          ? true
          : regimen === "No responsable de IVA"
          ? false
          : f.responsableIva,
    }));
  }

  function cargarLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("logo", reader.result);
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError("");
    setOk(false);
    setGuardando(true);
    const res = await guardarConfig(form);
    // El logo pudo cambiar: se invalida la caché para que los PDF usen el nuevo.
    olvidarLogoEmisor();
    setGuardando(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNumeracionActual(res.config.numeracionActual ?? null);
    setOk(true);
    setTimeout(() => setOk(false), 3000);
  }

  if (cargando) return null;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Configuración de Facturación</h1>
          <p>Datos del emisor y resolución DIAN para tus facturas</p>
        </div>
      </header>

      {error && <div className="mensaje-error">{error}</div>}
      {ok && <div className={styles.exito}>✅ Configuración guardada correctamente.</div>}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Datos del Emisor</h2>
        <div className={styles.logoRow}>
          <div className={styles.logoBox}>
            {form.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo} alt="Logo" />
            ) : (
              <span>Sin logo</span>
            )}
          </div>
          <div>
            <label className="empresa-field-label">Logo de la empresa</label>
            <input type="file" accept="image/*" onChange={cargarLogo} />
            {form.logo && (
              <button className={styles.linkBtn} onClick={() => set("logo", "")}>
                Quitar logo
              </button>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Razón Social *</label>
          <input value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>NIT *</label>
            <input value={form.nit} onChange={(e) => set("nit", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Régimen *</label>
            <select value={form.regimen} onChange={(e) => cambiarRegimen(e.target.value)}>
              <option value="">Seleccione régimen</option>
              {REGIMENES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.ivaBox}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={form.responsableIva}
              onChange={(e) => set("responsableIva", e.target.checked)}
            />
            Soy <strong>responsable de IVA</strong>
          </label>
          <small className={styles.hint}>
            Si no eres responsable de IVA no puedes cobrarlo: tus facturas se emitirán con IVA en
            cero, aunque los productos tengan tarifa.
          </small>
        </div>

        {/* Art. 114-1 E.T. Cambia el costo de CADA nómina, así que se declara aquí y no se
            deduce: quién califica es criterio del contador, no del software. */}
        <div className={styles.ivaBox}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={form.exoneradoParafiscales}
              onChange={(e) => set("exoneradoParafiscales", e.target.checked)}
            />
            Estoy <strong>exonerado de aportes</strong> (Art. 114-1 E.T.)
          </label>
          <small className={styles.hint}>
            Exonera de salud patronal (8,5%), SENA (2%) e ICBF (3%) por los trabajadores que
            devenguen menos de 10 SMLMV. La caja de compensación (4%) y la pensión (12%) se pagan
            igual. Aplica a sociedades y personas jurídicas declarantes de renta, y a personas
            naturales con dos o más trabajadores: <strong>confírmalo con tu contador</strong>.
          </small>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Dirección *</label>
            <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Ciudad *</label>
            <input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Teléfono *</label>
            <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Correo Electrónico *</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Actividad Económica (CIIU)</label>
          <input value={form.actividadEconomica} onChange={(e) => set("actividadEconomica", e.target.value)} placeholder="Ej: 6201 - Desarrollo de software" />
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Resolución DIAN</h2>
        {numeracionActual != null && (
          <div className={styles.info}>
            Próximo número a facturar:{" "}
            <strong>
              {form.prefijo ? `${form.prefijo}-` : ""}
              {String(numeracionActual).padStart(5, "0")}
            </strong>
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label>Número de Resolución *</label>
            <input value={form.resNumero} onChange={(e) => set("resNumero", e.target.value)} placeholder="18764000000000" />
          </div>
          <div className="form-group">
            <label>Fecha de Resolución *</label>
            <input type="date" value={form.resFecha} onChange={(e) => set("resFecha", e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Prefijo</label>
            <input value={form.prefijo} onChange={(e) => set("prefijo", e.target.value)} placeholder="FACT" />
          </div>
          <div className="form-group">
            <label>Fecha de Vencimiento *</label>
            <input type="date" value={form.resVencimiento} onChange={(e) => set("resVencimiento", e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Numeración Desde *</label>
            <input type="number" value={form.numeracionDesde} onChange={(e) => set("numeracionDesde", e.target.value)} placeholder="1" />
          </div>
          <div className="form-group">
            <label>Numeración Hasta *</label>
            <input type="number" value={form.numeracionHasta} onChange={(e) => set("numeracionHasta", e.target.value)} placeholder="5000" />
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Pie de Factura</h2>
        <div className="form-group">
          <label>Texto del pie de factura</label>
          <textarea
            className={styles.textarea}
            value={form.pieFact}
            onChange={(e) => set("pieFact", e.target.value)}
            rows={2}
            placeholder="Gracias por su compra..."
          />
        </div>
        <div className="form-group">
          <label>Observaciones</label>
          <textarea
            className={styles.textarea}
            value={form.observaciones}
            onChange={(e) => set("observaciones", e.target.value)}
            rows={2}
          />
        </div>
      </section>

      <div className={styles.footer}>
        <button className="btn-primary" onClick={submit} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>
    </div>
  );
}
