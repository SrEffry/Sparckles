"use client";

// Extractos de exógena, con las columnas del layout.
//
// La pantalla insiste en una cosa: esto es un BORRADOR PARA REVISIÓN, no el archivo que se
// presenta. No es una advertencia de cortesía — el art. 651 E.T. sanciona la información
// errónea igual que la que falta, y un archivo que sale del software con aire de oficial se
// presenta sin que nadie lo vuelva a mirar.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hoyBogota } from "@/lib/fechas";
import { previaFormatoExogena, descargarFormatoExogena } from "@/lib/reportesApi";
import styles from "../exogena/exogena.module.css";

const FORMATOS = [
  ["1001", "Pagos y retenciones practicadas", "Lo que pagamos a terceros, del libro auxiliar por cuenta"],
  ["1003", "Retenciones que le practicaron", "Lo que los clientes nos retuvieron, por concepto"],
  ["1005", "IVA descontable", "El IVA de las compras, por proveedor"],
  ["1006", "IVA generado e impuesto al consumo", "El IVA y el INC de las ventas, por cliente"],
  ["1007", "Ingresos recibidos", "Ingresos brutos por cliente, netos de notas crédito"],
];

export default function FormatosExogenaPage() {
  const router = useRouter();
  // `new Date()` usa la zona del navegador; el proyecto ya resolvió esto con `hoyBogota()`.
  const anioActual = Number(hoyBogota().slice(0, 4));
  const [anio, setAnio] = useState(anioActual);
  const [previas, setPrevias] = useState({});
  const [cargando, setCargando] = useState(true);
  const [bajando, setBajando] = useState(null);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    setCargando(true);
    const res = await Promise.all(FORMATOS.map(([n]) => previaFormatoExogena(n, anio)));
    setPrevias(Object.fromEntries(FORMATOS.map(([n], i) => [n, res[i]])));
    setCargando(false);
  }, [anio]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function bajar(numero) {
    setError("");
    setBajando(numero);
    const r = await descargarFormatoExogena(numero, anio);
    setBajando(null);
    if (r.error) setError(r.error);
  }

  return (
    <div>
      <header className={styles.head}>
        <button className={styles.back} onClick={() => router.push("/reportes")}>
          ←
        </button>
        <div>
          <h1>Extractos de exógena</h1>
          <p>Los datos en las columnas del layout, para pegarlos en el prevalidador de la DIAN.</p>
        </div>
        <select
          className={styles.anio}
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
        >
          {[anioActual, anioActual - 1, anioActual - 2].map((a) => (
            <option key={a} value={a}>
              Año gravable {a}
            </option>
          ))}
        </select>
      </header>

      {error && <div className="mensaje-error">{error}</div>}

      {cargando ? (
        <div className={styles.empty}>Calculando...</div>
      ) : (
        <div className={styles.formatos}>
          {FORMATOS.map(([numero, titulo, desc]) => {
            const p = previas[numero];
            const vacio = !p || p.filas === 0;
            return (
              <section key={numero} className={styles.formato}>
                <div className={styles.formatoHead}>
                  <div>
                    <h2>
                      <span className={styles.numero}>{numero}</span> {titulo}
                    </h2>
                    <p className={styles.sub}>{desc}</p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => bajar(numero)}
                    disabled={vacio || bajando === numero}
                  >
                    {bajando === numero ? "Generando..." : "Descargar .xlsx"}
                  </button>
                </div>

                <div className={styles.leyenda}>
                  <span className={styles.pill} data-t={vacio ? "falta" : "ok"}>
                    {p?.filas ?? 0} fila{p?.filas === 1 ? "" : "s"}
                  </span>
                  {p?.incompletos > 0 && (
                    <span className={styles.pill} data-t="critico">
                      {p.incompletos} sin identificación completa
                    </span>
                  )}
                  <span className={styles.pill}>{p?.columnas?.length ?? 0} columnas</span>
                </div>

                {p?.avisos?.length > 0 && (
                  <ul className={styles.avisos}>
                    {p.avisos.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}

                {vacio && (
                  <p className={styles.nota}>
                    No hay datos para el año gravable {anio}.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
