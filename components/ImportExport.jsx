"use client";

import { useRef, useState } from "react";

// Botones de Importar/Exportar Excel para un módulo. Autónomo: descarga vía el endpoint de export
// y sube el archivo al de import, mostrando un resumen (creados / errores por fila).
export default function ImportExport({ modulo, soportaImport = false, onImported }) {
  const inputRef = useRef(null);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState(null);

  function exportar() {
    window.location.href = `/api/datos/${modulo}/export`;
  }

  async function alElegir(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCargando(true);
    setToast(null);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const res = await fetch(`/api/datos/${modulo}/import`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ ok: false, texto: data.error || "No se pudo importar." });
        return;
      }
      setToast({
        ok: true,
        texto: `Importados ${data.creados} de ${data.total} registros.`,
        errores: data.errores || [],
      });
      onImported?.();
    } catch {
      setToast({ ok: false, texto: "Error de conexión al importar." });
    } finally {
      setCargando(false);
    }
  }

  const borde = toast?.ok ? "var(--success)" : "var(--danger)";

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {soportaImport && (
          <>
            <input ref={inputRef} type="file" accept=".xlsx" hidden onChange={alElegir} />
            <button className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={cargando}>
              {cargando ? "Importando…" : "Importar Excel"}
            </button>
          </>
        )}
        <button className="btn-secondary" onClick={exportar}>
          Exportar Excel
        </button>
      </div>

      {toast && (
        <div
          role="alert"
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 2000,
            maxWidth: 380,
            background: "#fff",
            border: `1px solid ${borde}`,
            borderRadius: 12,
            padding: "14px 16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontWeight: 700, color: borde, marginBottom: 4 }}>
            {toast.ok ? "Importación completada" : "No se pudo importar"}
          </div>
          <div style={{ fontSize: 14, color: "var(--text)" }}>{toast.texto}</div>
          {toast.errores?.length > 0 && (
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: 18,
                fontSize: 13,
                color: "var(--danger)",
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {toast.errores.slice(0, 20).map((er, i) => (
                <li key={i}>
                  Fila {er.fila}: {er.mensaje}
                </li>
              ))}
              {toast.errores.length > 20 && <li>…y {toast.errores.length - 20} más.</li>}
            </ul>
          )}
          <button
            className="btn-secondary"
            style={{ marginTop: 10, padding: "6px 12px", fontSize: 13 }}
            onClick={() => setToast(null)}
          >
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}
