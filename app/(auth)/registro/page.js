"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registrarUsuario } from "@/lib/auth";
import { OjoIcon, OjoOffIcon } from "../icons";
import styles from "../auth.module.css";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombreCompleto: "",
    email: "",
    password: "",
    confirmPassword: "",
    aceptarTerminos: false,
  });
  const [verPass, setVerPass] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [cargando, setCargando] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  const vacio = (v) => intentado && !v;

  async function handleSubmit(e) {
    e.preventDefault();
    setIntentado(true);
    setError("");
    const { nombreCompleto, email, password, confirmPassword, aceptarTerminos } = form;

    if (!nombreCompleto || !email || !password || !confirmPassword) {
      setError("Por favor complete todos los campos.");
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Ingrese un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!aceptarTerminos) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setCargando(true);
    const res = await registrarUsuario({ nombreCompleto, email, password });
    setCargando(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOk("🎉 ¡Cuenta creada! Entrando…");
    setTimeout(() => router.replace("/dashboard"), 1200);
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <h2>Crea tu cuenta</h2>
        <p className={styles.sub}>Completa los datos básicos para empezar</p>
      </div>

      {error && (
        <div className="mensaje-error" role="alert">
          {error}
        </div>
      )}
      {ok && <div className={styles.exito}>{ok}</div>}

      <div className={styles.field}>
        <label htmlFor="nombre">Nombre completo</label>
        <input
          id="nombre"
          className={styles.control}
          type="text"
          placeholder="Ej: Ana Pérez"
          value={form.nombreCompleto}
          onChange={(e) => set("nombreCompleto", e.target.value)}
          autoComplete="name"
          aria-invalid={vacio(form.nombreCompleto) ? "true" : undefined}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          className={styles.control}
          type="email"
          placeholder="tucorreo@empresa.com"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          autoComplete="email"
          aria-invalid={vacio(form.email) ? "true" : undefined}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Contraseña</label>
        <div className={styles.passwordWrap}>
          <input
            id="password"
            className={styles.control}
            type={verPass ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
            aria-invalid={vacio(form.password) ? "true" : undefined}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setVerPass((v) => !v)}
            aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={verPass}
          >
            {verPass ? <OjoOffIcon /> : <OjoIcon />}
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="confirm">Confirmar contraseña</label>
        <input
          id="confirm"
          className={styles.control}
          type={verPass ? "text" : "password"}
          placeholder="Repite la contraseña"
          value={form.confirmPassword}
          onChange={(e) => set("confirmPassword", e.target.value)}
          autoComplete="new-password"
          aria-invalid={vacio(form.confirmPassword) ? "true" : undefined}
        />
      </div>

      <label className={styles.terminos}>
        <input
          type="checkbox"
          checked={form.aceptarTerminos}
          onChange={(e) => set("aceptarTerminos", e.target.checked)}
        />
        Acepto los términos y condiciones
      </label>

      <button type="submit" className={`btn-primary ${styles.submit}`} disabled={cargando}>
        {cargando && <span className={styles.spinner} aria-hidden="true" />}
        {cargando ? "Creando…" : "Crear cuenta"}
      </button>

      <p className={styles.alt}>
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </form>
  );
}
