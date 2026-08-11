"use client";

import styles from "./filtros.module.css";

// Pie de totales del historial filtrado.
//
// Reglas que sostienen este bloque, y que son la razón de que no sea una sola cifra:
//
//  · Las cifras van AL PESO, sin redondear a miles. El Art. 577 E.T. exige aproximar al
//    múltiplo de mil en el FORMULARIO de la declaración, no en los papeles de trabajo; si el
//    pie ya viniera redondeado no se podría cuadrar contra la contabilidad.
//  · "Total facturado" (base + IVA) y "Total a cobrar" (neto de retenciones) son cifras
//    distintas y se rotulan distinto. El total a cobrar es caja esperada: no corresponde a
//    ninguna casilla de ninguna declaración.
//  · Las notas van en bloque informativo y NO restadas: una nota crédito afecta el IVA
//    generado del periodo de LA NOTA, no del de la factura.
//  · Las anuladas se excluyen de los totales, pero se dice cuántas fueron.

const money = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(
    Number(v) || 0
  );

export default function PieTotales({ agregados: a, avisos = [], filtros = {} }) {
  if (!a) return null;

  const hayNotas = a.notaCredito > 0 || a.notaDebito > 0;
  const hayRetenciones = a.reteFuente > 0 || a.reteIva > 0 || a.reteIca > 0;

  const periodo =
    filtros.desde || filtros.hasta
      ? `${filtros.desde || "inicio"} a ${filtros.hasta || "hoy"}`
      : "todo el histórico";

  return (
    <section className={styles.pie}>
      <div className={styles.pieHead}>
        <span className={styles.pieTitulo}>Totales del periodo filtrado</span>
        <span className={styles.pieDocs}>
          {a.documentos} documento{a.documentos === 1 ? "" : "s"} · {periodo}
          {a.anuladasExcluidas > 0 &&
            ` · ${a.anuladasExcluidas} anulada${a.anuladasExcluidas === 1 ? "" : "s"} excluida${
              a.anuladasExcluidas === 1 ? "" : "s"
            }`}
        </span>
      </div>

      <div className={styles.pieGrid}>
        <div className={styles.bloque}>
          <h3>Bases por tratamiento de IVA</h3>
          <Linea label="Gravada" valor={a.baseGravada} />
          <Linea label="Exenta (Art. 477)" valor={a.baseExenta} />
          <Linea label="Excluida (Art. 476)" valor={a.baseExcluida} />
          {a.baseNoResponsable > 0 && <Linea label="Emisor no responsable" valor={a.baseNoResponsable} />}
          {a.baseSinClasificar > 0 && <Linea label="Sin clasificar" valor={a.baseSinClasificar} />}
          <Linea label="Subtotal (base)" valor={a.subtotal} />
          {a.totalDescuentos > 0 && <Linea label="Descuentos" valor={a.totalDescuentos} suave />}
        </div>

        <div className={styles.bloque}>
          <h3>Impuestos y documento</h3>
          <Linea label="IVA generado" valor={a.iva} />
          {/* El INC se muestra aparte porque va en otro formulario y no se compensa contra
              el IVA descontable. Sumarlo al IVA inflaba la declaración. */}
          {a.inc > 0 && <Linea label="INC generado (declara aparte)" valor={a.inc} />}
          {a.otrosImpuestos > 0 && <Linea label="Otros impuestos" valor={a.otrosImpuestos} />}
          <div className={`${styles.linea} ${styles.lineaFuerte}`}>
            <span>TOTAL FACTURADO</span>
            <strong>{money(a.total)}</strong>
          </div>
        </div>

        <div className={styles.bloque}>
          <h3>Retenciones practicadas al emisor</h3>
          {hayRetenciones ? (
            <>
              <Linea label="ReteFuente" valor={a.reteFuente} />
              <Linea label="ReteIVA" valor={a.reteIva} />
              <Linea label="ReteICA" valor={a.reteIca} />
            </>
          ) : (
            <p className={styles.aviso}>Sin retenciones en el periodo.</p>
          )}
          <div className={`${styles.linea} ${styles.lineaFuerte}`}>
            <span>TOTAL A COBRAR</span>
            <strong>{money(a.totalACobrar)}</strong>
          </div>
        </div>
      </div>

      {hayNotas && (
        <div className={styles.avisos}>
          <div className={`${styles.aviso} ${styles.alerta}`}>
            <span className={styles.avisoIcono}>!</span>
            <span>
              <strong>Informativo, NO incluido en los totales.</strong> Notas crédito aplicadas a
              facturas de este rango: {money(a.notaCredito)} · Notas débito: {money(a.notaDebito)}.
              Las notas afectan la declaración del periodo de <em>su propia fecha</em>, no la del
              periodo de la factura.
            </span>
          </div>
        </div>
      )}

      <div className={styles.avisos}>
        {a.baseSinClasificar > 0 && (
          <div className={`${styles.aviso} ${styles.alerta}`}>
            <span className={styles.avisoIcono}>!</span>
            <span>
              Hay {money(a.baseSinClasificar)} en productos con tarifa <strong>0%</strong>, que no es
              una categoría del régimen de IVA. Clasifícalos como <strong>exento</strong> (Art. 477,
              da derecho a IVA descontable) o <strong>excluido</strong> (Art. 476, no lo da) antes de
              usar estas cifras para declarar.
            </span>
          </div>
        )}
        {avisos.map((t, i) => (
          <div key={i} className={styles.aviso}>
            <span className={styles.avisoIcono}>·</span>
            <span>{t}</span>
          </div>
        ))}
        {a.inc > 0 && (
          <div className={styles.aviso}>
            <span className={styles.avisoIcono}>·</span>
            <span>
              El <strong>Impuesto al Consumo no es IVA</strong>: se declara en su propio
              formulario, no entra en el IVA por pagar y no es descontable para el comprador.
              Por eso va en línea separada y no sumado al IVA generado.
            </span>
          </div>
        )}
        <div className={styles.aviso}>
          <span className={styles.avisoIcono}>·</span>
          <span>
            <strong>Total facturado</strong> es el valor del documento (base + impuestos).{" "}
            <strong>Total a cobrar</strong> es el flujo de caja esperado tras retenciones: no es
            ingreso ni base de ningún impuesto.
          </span>
        </div>
      </div>

      <p className={styles.legal}>
        Cifras de apoyo para la preparación de declaraciones, expresadas al peso. No constituyen
        liquidación oficial ni sustituyen la revisión y firma del contador público.
      </p>
    </section>
  );
}

function Linea({ label, valor, suave }) {
  return (
    <div className={`${styles.linea} ${suave ? styles.lineaSuave : ""}`}>
      <span>{label}</span>
      <strong>{money(valor)}</strong>
    </div>
  );
}
