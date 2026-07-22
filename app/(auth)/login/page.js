"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/lib/auth";
import { OjoIcon, OjoOffIcon } from "../icons";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIntentado(true);
    setError("");
    if (!email || !password) {
      setError("Por favor complete todos los campos.");
      return;
    }
    setCargando(true);
    const res = await iniciarSesion(email, password);
    setCargando(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <h2>Iniciar sesión</h2>
        <p className={styles.sub}>Accede a tu cuenta para continuar</p>
      </div>

      {error && (
        <div className="mensaje-error" role="alert">
          {error}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          className={styles.control}
          type="email"
          placeholder="tucorreo@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          aria-invalid={intentado && !email ? "true" : undefined}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Contraseña</label>
        <div className={styles.passwordWrap}>
          <input
            id="password"
            className={styles.control}
            type={verPass ? "text" : "password"}
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={intentado && !password ? "true" : undefined}
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

      <button type="submit" className={`btn-primary ${styles.submit}`} disabled={cargando}>
        {cargando && <span className={styles.spinner} aria-hidden="true" />}
        {cargando ? "Entrando…" : "Entrar"}
      </button>

      <p className={styles.alt}>
        ¿Primera vez en Sparkles? <Link href="/registro">Crea tu cuenta</Link>
      </p>
    </form>
  );
}
