"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion } from "@/lib/auth";
import styles from "./Sidebar.module.css";

// Navegación de nivel 1 (hubs). Los submódulos viven DENTRO de cada hub, no aquí.
// `rutas` = prefijos que marcan este hub como activo (incluye sus submódulos).
const NAV = [
  { label: "Inicio", href: "/dashboard", ready: true, rutas: ["/dashboard"] },
  { label: "Empresas", href: "/empresas", ready: true, rutas: ["/empresas"] },
  {
    label: "Operaciones",
    href: "/operaciones",
    ready: true,
    rutas: ["/operaciones", "/facturacion", "/notas", "/compras", "/asientos-contables"],
  },
  {
    label: "Finanzas",
    href: "/finanzas",
    ready: true,
    rutas: ["/finanzas", "/documentos-soportes"],
  },
  { label: "Recursos", href: "/recursos", ready: true, rutas: ["/recursos", "/nomina"] },
  {
    label: "Configuración",
    href: "/configuracion",
    ready: true,
    rutas: ["/configuracion", "/clientes", "/productos"],
  },
  { label: "Reportes", href: "/reportes", ready: false, rutas: ["/reportes"] },
];

export default function Sidebar({ usuario }) {
  const pathname = usePathname();
  const router = useRouter();

  const iniciales = (
    (usuario?.nombre?.[0] || "") + (usuario?.apellido?.[0] || "")
  ).toUpperCase();

  async function handleLogout() {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      await cerrarSesion();
      router.replace("/login");
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Image src="/img/Logo.png" alt="Sparkles" width={38} height={38} className={styles.logo} priority />
        <div className={styles.brandText}>
          <strong>Sparkles</strong>
          <span>Software Contable</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV.map((item) => {
          // El hub queda activo también cuando estás en uno de sus submódulos
          const active = (item.rutas || [item.href]).some(
            (r) => pathname === r || pathname.startsWith(r + "/")
          );
          if (!item.ready) {
            return (
              <span
                key={item.href}
                className={`${styles.navItem} ${styles.disabled}`}
                title="Módulo en migración"
              >
                {item.label}
                <small className={styles.soon}>pronto</small>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>{iniciales || "US"}</div>
          <div className={styles.userDetails}>
            <strong>
              {usuario?.nombre} {usuario?.apellido}
            </strong>
            <span>{usuario?.email}</span>
          </div>
        </div>
        <button className={styles.logout} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
