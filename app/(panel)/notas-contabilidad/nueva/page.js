"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NotaEditor from "../NotaEditor";
import { crearNotaContabilidad } from "@/lib/notasContabilidadApi";
import { obtenerMapaCuentas } from "@/lib/mapaCuentasApi";
import styles from "../notas.module.css";

export default function NuevaNotaPage() {
  const router = useRouter();
  const [sector, setSector] = useState(null);

  // El sector decide contra qué catálogo se buscan las cuentas. Sale del mapa del usuario, no
  // de un selector: elegirlo por nota permitiría mezclar dos PUC en el mismo libro.
  useEffect(() => {
    obtenerMapaCuentas().then((m) => setSector(m?.mapa?.sector || "comercial"));
  }, []);

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Nueva nota de contabilidad</h1>
          <p>Se guarda como borrador. No mueve los libros hasta que la emitas.</p>
        </div>
      </header>

      {sector === null ? (
        <div className={styles.vacio}>Cargando…</div>
      ) : (
        <NotaEditor
          sector={sector}
          onCancelar={() => router.push("/notas-contabilidad")}
          onGuardar={async (payload) => {
            const res = await crearNotaContabilidad(payload);
            if (res.error) return res;
            router.push(`/notas-contabilidad/${res.nota.id}`);
            return {};
          }}
        />
      )}
    </div>
  );
}
