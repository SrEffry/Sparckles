"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/lib/auth";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
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
    <form className={styles.card} onSubmit={handleSubmit}>
      <h2>Iniciar sesión</h2>
      <p className={styles.sub}>Accede a tu cuenta para continuar</p>
      {error && <div className="mensaje-error">{error}</div>}
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando ? "Entrando..." : "Entrar"}
      </button>
      <p className={styles.alt}>
        ¿Primera vez? <Link href="/registro">Crea tu cuenta</Link>
      </p>
    </form>
  );
}
