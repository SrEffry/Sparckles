"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registrarUsuario } from "@/lib/auth";
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
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [cargando, setCargando] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
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
    setOk("🎉 ¡Cuenta creada! Entrando...");
    setTimeout(() => router.replace("/dashboard"), 1200);
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h2>Crea tu cuenta</h2>
      <p className={styles.sub}>Completa los datos básicos para empezar</p>
      {error && <div className="mensaje-error">{error}</div>}
      {ok && <div className={styles.exito}>{ok}</div>}
      <input
        type="text"
        placeholder="Nombre completo"
        value={form.nombreCompleto}
        onChange={(e) => set("nombreCompleto", e.target.value)}
        autoComplete="name"
      />
      <input
        type="email"
        placeholder="Correo electrónico"
        value={form.email}
        onChange={(e) => set("email", e.target.value)}
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Contraseña (mínimo 6 caracteres)"
        value={form.password}
        onChange={(e) => set("password", e.target.value)}
        autoComplete="new-password"
      />
      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={form.confirmPassword}
        onChange={(e) => set("confirmPassword", e.target.value)}
        autoComplete="new-password"
      />
      <label className={styles.terminos}>
        <input
          type="checkbox"
          checked={form.aceptarTerminos}
          onChange={(e) => set("aceptarTerminos", e.target.checked)}
        />
        Acepto los términos y condiciones
      </label>
      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando ? "Creando..." : "Crear cuenta"}
      </button>
      <p className={styles.alt}>
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </form>
  );
}
