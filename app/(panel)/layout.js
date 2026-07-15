"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/auth";
import { UsuarioProvider } from "@/lib/UsuarioContext";
import Sidebar from "@/components/Sidebar";
import styles from "./panel.module.css";

// Layout compartido del panel: valida la sesión (contra la API) UNA sola vez y expone el
// usuario a todos los módulos vía contexto. Reemplaza la duplicación de las 18 páginas viejas.
export default function PanelLayout({ children }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState(undefined); // undefined = cargando

  useEffect(() => {
    let activo = true;
    obtenerUsuarioActual().then((u) => {
      if (!activo) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUsuario(u);
    });
    return () => {
      activo = false;
    };
  }, [router]);

  if (!usuario) return null; // evita parpadeo antes de validar la sesión

  return (
    <UsuarioProvider usuario={usuario}>
      <div className={styles.shell}>
        <Sidebar usuario={usuario} />
        <main className={styles.main}>{children}</main>
      </div>
    </UsuarioProvider>
  );
}
