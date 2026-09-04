"use client";

// Buscador con creación rápida, para elegir cliente o producto dentro de la factura.
//
// POR QUÉ NO UN `<select>`. Con veinte clientes un desplegable sirve; con quinientos, no. Y el
// problema real no es el tamaño: es que cuando el cliente o el producto NO existe todavía, el
// flujo obligaba a salir de la factura, ir a crearlo y volver — perdiendo el borrador a medias.
//
// POR ESO LA CREACIÓN ES UN MODAL Y NO UNA NAVEGACIÓN. Se crea sin salir de la pantalla, lo
// creado entra en la lista y queda seleccionado de una vez. Nada de lo que se llevaba escrito
// se pierde, que es justo lo que hacía incómodo el flujo anterior.

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./buscadorEntidad.module.css";

/**
 * @param items        lista completa sobre la que se busca
 * @param texto        (item) => string por el que se filtra y que se muestra
 * @param sub          (item) => string secundario (documento, código, precio)
 * @param onElegir     (item) => void
 * @param onCrear      () => void — abre el modal de creación del llamador
 * @param etiquetaCrear texto del botón de creación
 * @param placeholder
 * @param limpiarAlElegir  útil para productos: tras agregar la línea, el campo vuelve a cero
 */
export default function BuscadorEntidad({
  items = [],
  texto,
  sub,
  onElegir,
  onCrear,
  etiquetaCrear = "+ Crear",
  placeholder = "Buscar...",
  limpiarAlElegir = false,
  valorInicial = "",
  autoFocus = false,
}) {
  const [q, setQ] = useState(valorInicial);
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef(null);

  useEffect(() => setQ(valorInicial), [valorInicial]);

  // Cerrar al hacer clic fuera: si no, la lista se queda flotando sobre el resto del formulario.
  useEffect(() => {
    function fuera(e) {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  // Búsqueda sin tildes y sin distinguir mayúsculas: nadie escribe "Bogotá" con tilde al buscar.
  const plano = (s) =>
    (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const filtrados = useMemo(() => {
    const n = plano(q).trim();
    if (!n) return items.slice(0, 50);
    return items
      .filter((i) => plano(`${texto(i)} ${sub?.(i) || ""}`).includes(n))
      .slice(0, 50);
  }, [items, q, texto, sub]);

  function elegir(item) {
    onElegir(item);
    setAbierto(false);
    setQ(limpiarAlElegir ? "" : texto(item));
  }

  function teclas(e) {
    if (!abierto && (e.key === "ArrowDown" || e.key === "Enter")) return setAbierto(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtrados[resaltado]) elegir(filtrados[resaltado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div className={styles.caja} ref={caja}>
      <div className={styles.fila}>
        <input
          className={styles.input}
          value={q}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setAbierto(true);
            setResaltado(0);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={teclas}
        />
        {onCrear && (
          <button type="button" className={styles.crear} onClick={onCrear}>
            {etiquetaCrear}
          </button>
        )}
      </div>

      {abierto && (
        <div className={styles.lista}>
          {filtrados.length === 0 ? (
            <div className={styles.vacio}>
              <span>Nada coincide con “{q}”.</span>
              {onCrear && (
                <button type="button" className={styles.crearVacio} onClick={onCrear}>
                  {etiquetaCrear}
                </button>
              )}
            </div>
          ) : (
            filtrados.map((i, idx) => (
              <button
                type="button"
                key={i.id}
                className={idx === resaltado ? styles.opcionActiva : styles.opcion}
                onMouseEnter={() => setResaltado(idx)}
                onClick={() => elegir(i)}
              >
                <span className={styles.opcionTexto}>{texto(i)}</span>
                {sub && <span className={styles.opcionSub}>{sub(i)}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
