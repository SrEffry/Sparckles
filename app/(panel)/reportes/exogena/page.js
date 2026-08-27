"use client";

// Tablero de preparación para la información exógena.
//
// No genera reportes: dice qué datos faltan mientras todavía queda tiempo para conseguirlos.
// Sigue el patrón de Certificados de retención, que avisa del plazo antes de que se venza; aquí
// la norma de respaldo es el art. 651 E.T. en vez del 667.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hoyBogota } from "@/lib/fechas";
import { obtenerPreparacionExogena } from "@/lib/reportesApi";
import styles from "./exogena.module.css";

const GRUPOS = [
  ["clientes", "Clientes"],
  ["proveedores", "Proveedores"],
  ["empleados", "Empleados"],
];

export default function PreparacionExogenaPage() {
  const router = useRouter();
  // `new Date()` usa la zona del navegador; el proyecto ya resolvió esto con `hoyBogota()`.
  const anioActual = Number(hoyBogota().slice(0, 4));
  const [anio, setAnio] = useState(anioActual);
  const [grupo, setGrupo] = useState("clientes");
  const [soloProblemas, setSoloProblemas] = useState(true);
  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    setD(await obtenerPreparacionExogena(anio));
    setCargando(false);
  }, [anio]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const t = d?.totales;
  const pct = t?.terceros ? Math.round((t.listos / t.terceros) * 100) : 0;

  const lista = (d?.[grupo] || []).filter(
    (x) => !soloProblemas || x.criticos.length > 0 || x.faltantes.length > 0
  );

  return (
    <div>
      <header className={styles.head}>
        <button className={styles.back} onClick={() => router.push("/reportes")}>
          ←
        </button>
        <div>
          <h1>Preparación para exógena</h1>
          <p>Qué le falta a cada tercero para poder reportarlo. No genera ningún formato.</p>
        </div>
        <select className={styles.anio} value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[anioActual, anioActual - 1, anioActual - 2].map((a) => (
            <option key={a} value={a}>
              Año gravable {a}
            </option>
          ))}
        </select>
      </header>

      <Plazo d={d} anio={anio} />

      {cargando && !d ? (
        <div className={styles.empty}>Cargando...</div>
      ) : (
        <>
          <section className={styles.avance}>
            <div className={styles.avanceHead}>
              <strong>
                {t?.listos ?? 0} de {t?.terceros ?? 0} terceros listos para exógena
              </strong>
              <span>{pct}%</span>
            </div>
            <div className={styles.barra}>
              <div className={styles.barraFill} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.leyenda}>
              <span className={styles.pill} data-t="critico">
                {t?.conCriticos ?? 0} no se pueden reportar
              </span>
              <span className={styles.pill} data-t="falta">
                {t?.incompletos ?? 0} con columnas vacías
              </span>
              <span className={styles.pill} data-t="ok">
                {t?.listos ?? 0} completos
              </span>
            </div>
          </section>

          {(d?.alertas?.mismoDocumentoVariosNombres > 0 ||
            d?.alertas?.proveedoresSinDocumento > 0) && (
            <div className={styles.alerta}>
              <strong>Revisa los proveedores.</strong>
              <ul>
                {d.alertas.proveedoresSinDocumento > 0 && (
                  <li>
                    <strong>{d.alertas.proveedoresSinDocumento}</strong> sin número de
                    identificación. La exógena se reporta por documento, no por nombre: sin él no
                    hay forma de agruparlos ni de que la DIAN los cruce.
                  </li>
                )}
                {d.alertas.mismoDocumentoVariosNombres > 0 && (
                  <li>
                    <strong>{d.alertas.mismoDocumentoVariosNombres}</strong> con el mismo
                    documento escrito bajo varios nombres. Conviene unificarlos antes de reportar.
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className={styles.filtros}>
            <div className={styles.tabs}>
              {GRUPOS.map(([k, etiqueta]) => (
                <button
                  key={k}
                  className={grupo === k ? styles.tabActiva : styles.tab}
                  onClick={() => setGrupo(k)}
                >
                  {etiqueta} <span className={styles.tabCount}>{t?.[k] ?? 0}</span>
                </button>
              ))}
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={soloProblemas}
                onChange={(e) => setSoloProblemas(e.target.checked)}
              />
              Solo los que tienen algo pendiente
            </label>
          </div>

          {grupo === "proveedores" && (
            <p className={styles.nota}>
              Se agrupan por documento a partir de las compras y los documentos soporte del año.
              Los que ya tienen <strong>ficha de tercero</strong> se evalúan contra ella; los que
              no, hay que consolidarlos primero en Configuración → Terceros, que es donde se
              guardan la dirección y los códigos DANE.
            </p>
          )}
          {grupo === "empleados" && (
            <p className={styles.nota}>
              El formato 2276 (rentas de trabajo) pide tipo de documento, apellidos y nombres
              separados, dirección y ubicación del empleado. Los campos ya existen en la ficha del
              empleado; falta capturarlos.
            </p>
          )}

          {lista.length === 0 ? (
            <div className={styles.empty}>
              {soloProblemas
                ? "Nada pendiente en este grupo."
                : "No hay terceros de este tipo en el año seleccionado."}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tercero</th>
                    <th>Documento</th>
                    <th>Qué falta</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <strong>{x.nombre}</strong>
                        {x.variosNombres && (
                          <div className={styles.sub}>
                            También aparece como: {x.variosNombres.slice(1).join(" · ")}
                          </div>
                        )}
                        {x.documentos != null && (
                          <div className={styles.sub}>
                            {x.documentos} documento{x.documentos === 1 ? "" : "s"} en {anio}
                          </div>
                        )}
                      </td>
                      <td>
                        {x.documento || <span className={styles.sinDato}>—</span>}
                        {x.variasGrafias && (
                          <div className={styles.sub}>Escrito como: {x.variasGrafias.join(" · ")}</div>
                        )}
                      </td>
                      <td>
                        {x.criticos.map((c) => (
                          <span key={c} className={styles.pill} data-t="critico">
                            {c}
                          </span>
                        ))}
                        {x.faltantes.map((f) => (
                          <span key={f} className={styles.pill} data-t="falta">
                            {f}
                          </span>
                        ))}
                        {!x.criticos.length && !x.faltantes.length && (
                          <span className={styles.pill} data-t="ok">
                            Completo
                          </span>
                        )}
                        {/* La sugerencia solo aparece cuando el catálogo resolvió el municipio
                            sin ambigüedad: hay 68 nombres repetidos en el país y adivinar sería
                            peor que dejarlo pendiente. */}
                        {x.sugerencia && (
                          <div className={styles.sugerencia}>
                            Parece <strong>{x.sugerencia.etiqueta}</strong> → código{" "}
                            {x.sugerencia.codigoCompleto}
                          </div>
                        )}
                      </td>
                      <td>
                        {/* Cada origen se arregla en su propia pantalla. Un proveedor sin ficha
                            de tercero no tiene dónde editarse: hay que consolidarlo primero. */}
                        {x.origen === "cliente" && (
                          <button onClick={() => router.push("/clientes")}>Editar</button>
                        )}
                        {x.origen === "proveedor" &&
                          (x.terceroId ? (
                            <button onClick={() => router.push("/terceros")}>Editar</button>
                          ) : (
                            <span className={styles.sub}>Sin ficha</span>
                          ))}
                        {x.origen === "empleado" && (
                          <button onClick={() => router.push("/nomina")}>Editar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Aviso de plazo. Distingue tres situaciones y NUNCA inventa una fecha: sin NIT configurado no
 * se puede calcular, y sin calendario publicado por la DIAN no existe todavía.
 */
function Plazo({ d, anio }) {
  if (!d) return null;

  if (d.sinNit)
    return (
      <div className={styles.avisoInfo}>
        Configura el <strong>NIT</strong> en Config. Facturación para calcular tu fecha límite: el
        plazo de la exógena depende de los últimos dígitos del NIT.
      </div>
    );

  // Se distingue de "no hay plazos" a propósito: aquí el calendario SÍ existe, lo que falta es
  // saber cuál de las dos tablas aplica. Y la de grandes contribuyentes vence hasta cinco
  // semanas antes, así que suponer que no lo es sería el error caro.
  if (d.granContribuyenteDesconocido)
    return (
      <div className={styles.avisoInfo}>
        No se puede calcular tu plazo porque <strong>no se sabe si eres gran contribuyente</strong>
        , y esa tabla vence hasta cinco semanas antes. Márcalo en la ficha de tu empresa
        (Empresas → características tributarias) y el plazo aparecerá aquí.
      </div>
    );

  if (!d.plazo)
    return (
      <div className={styles.avisoInfo}>
        La DIAN todavía <strong>no ha publicado</strong> los plazos del año gravable {anio}. Se
        cargarán cuando salga la resolución; no se estiman.
        {d.plazosPublicados?.length ? (
          <> Hay plazos cargados para: {d.plazosPublicados.join(", ")}.</>
        ) : null}
      </div>
    );

  const { diasRestantes, fecha, norma, fuente } = d.plazo;
  const vencido = diasRestantes < 0;
  const cerca = diasRestantes >= 0 && diasRestantes <= 60;

  return (
    <div className={styles.plazo} data-estado={vencido ? "vencido" : cerca ? "cerca" : "lejos"}>
      <div>
        <strong>
          {vencido
            ? `El plazo venció el ${fecha}`
            : `Vence el ${fecha} · faltan ${diasRestantes} días`}
        </strong>
        <div className={styles.sub}>
          Año gravable {anio} · {d.plazo.granContribuyente ? "gran contribuyente" : "persona jurídica/natural"}
          {" "}· NIT terminado en {d.plazo.digitos} · {norma}
          {fuente ? ` · ${fuente}` : ""}
        </div>
      </div>
      <div className={styles.sub}>
        No presentar, o presentar con errores, se sanciona por el art. 651 E.T.
      </div>
    </div>
  );
}
