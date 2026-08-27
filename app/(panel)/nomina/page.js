"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarEmpleados,
  crearEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
} from "@/lib/empleadosApi";
import { listarNominas, liquidarNomina, cambiarEstadoNomina } from "@/lib/nominasApi";
import { calcularLiquidacion } from "@/lib/nominaCalc";
import { obtenerConfig } from "@/lib/configFacturacionApi";
import { CLASES_RIESGO_ARL } from "@/lib/data/parametrosNomina";
import { hoyBogota } from "@/lib/fechas";
import { TIPOS_DOCUMENTO_SELECCIONABLES } from "@/lib/data/tiposDocumentoDian";
import { DEPARTAMENTOS, municipiosDe, CODIGO_PAIS_COLOMBIA } from "@/lib/data/dane";
import styles from "./nomina.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const CONTRATOS = ["Indefinido", "Término fijo", "Obra o labor", "Prestación de servicios", "Aprendizaje"];

export default function NominaPage() {
  const [tab, setTab] = useState("empleados");
  const [empleados, setEmpleados] = useState(null);
  const [nominas, setNominas] = useState([]);
  const [modalEmp, setModalEmp] = useState(null); // {empleado}
  const [liquidar, setLiquidar] = useState(null); // empleado
  const [notif, setNotif] = useState(null);
  // Avisos que vienen del servidor y NO son errores: se quedan hasta que el usuario los cierra.
  const [avisosServidor, setAvisosServidor] = useState(null);
  // Art. 114-1 E.T.: es un atributo de la EMPRESA y cambia el costo de cada nómina.
  const [exoneradoEmpleador, setExonerado] = useState(false);

  async function recargar() {
    setEmpleados(await listarEmpleados());
    setNominas(await listarNominas());
    const cfg = await obtenerConfig();
    setExonerado(cfg?.exoneradoParafiscales === true);
  }
  useEffect(() => {
    recargar();
  }, []);

  const stats = useMemo(() => {
    const e = empleados || [];
    const activos = e.filter((x) => x.activo);
    return {
      activos: activos.length,
      nominaMensual: activos.reduce((a, x) => a + Number(x.salarioBase || 0), 0),
      liquidado: nominas
        .filter((n) => n.estado === "Pagada")
        .reduce((a, n) => a + Number(n.neto || 0), 0),
    };
  }, [empleados, nominas]);

  function notificar(mensaje, tipo = "success") {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 3000);
  }

  async function guardarEmpleado(payload, id) {
    const res = id ? await actualizarEmpleado(id, payload) : await crearEmpleado(payload);
    if (res.error) return res;
    await recargar();
    setModalEmp(null);
    if (res.avisos?.length) setAvisosServidor(res.avisos);
    else notificar(id ? "Empleado actualizado" : "Empleado creado");
    return {};
  }

  async function borrarEmpleado(e) {
    if (!confirm(`¿Eliminar a ${e.nombres} ${e.apellidos}?`)) return;
    const res = await eliminarEmpleado(e.id);
    if (res.ok) {
      await recargar();
      notificar("Empleado eliminado");
    } else setAvisosServidor([res.error]);
  }

  async function cambiarEstado(n, estado) {
    const res = await cambiarEstadoNomina(n.id, estado);
    if (res.error) return notificar(res.error, "error");
    await recargar();
    notificar(`Nómina marcada como ${estado}`);
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1>Nómina</h1>
          <p>Empleados y liquidación de nómina</p>
        </div>
        {tab === "empleados" && (
          <button className="btn-primary" onClick={() => setModalEmp({ empleado: null })}>
            + Nuevo empleado
          </button>
        )}
      </header>

      <section className={styles.stats}>
        <StatCard label="Empleados activos" valor={stats.activos} />
        <StatCard label="Nómina mensual" valor={fmt(stats.nominaMensual)} chico />
        <StatCard label="Total liquidado (pagado)" valor={fmt(stats.liquidado)} chico />
      </section>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "empleados" ? styles.active : ""}`} onClick={() => setTab("empleados")}>
          Empleados
        </button>
        <button className={`${styles.tab} ${tab === "historial" ? styles.active : ""}`} onClick={() => setTab("historial")}>
          Historial de nóminas
        </button>
      </div>

      {tab === "empleados" ? (
        empleados === null ? (
          <div className={styles.empty}>Cargando...</div>
        ) : empleados.length === 0 ? (
          <div className={styles.empty}>
            <p>No hay empleados registrados.</p>
            <button className="btn-secondary" onClick={() => setModalEmp({ empleado: null })}>Agregar el primero</button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Empleado</th><th>Documento</th><th>Cargo</th><th>Contrato</th><th>Salario</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {empleados.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className={styles.cell}>
                        <div className={styles.avatar}>{(e.nombres[0] || "") + (e.apellidos[0] || "")}</div>
                        <strong>{e.nombres} {e.apellidos}</strong>
                      </div>
                    </td>
                    <td>{e.documento}</td>
                    <td>{e.cargo}</td>
                    <td>{e.tipoContrato || "—"}</td>
                    <td className={styles.monto}>{fmt(e.salarioBase)}</td>
                    <td>
                      <span className={`badge-estado ${e.activo ? "activo" : "inactivo"}`}>{e.activo ? "Activo" : "Inactivo"}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.liq}
                          onClick={() => setLiquidar(e)}
                          disabled={!e.activo || e.tipoContrato === "Prestación de servicios"}
                          title={
                            e.tipoContrato === "Prestación de servicios"
                              ? "Una prestación de servicios no es relación laboral: se paga contra cuenta de cobro o factura, no por nómina."
                              : undefined
                          }
                        >
                          Liquidar
                        </button>
                        <button onClick={() => setModalEmp({ empleado: e })}>Editar</button>
                        <button className={styles.del} onClick={() => borrarEmpleado(e)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : nominas.length === 0 ? (
        <div className={styles.empty}>Aún no hay nóminas liquidadas.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Empleado</th><th>Periodo</th><th>Causación</th><th>Devengos</th><th>Deducciones</th><th>Neto</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {nominas.map((n) => (
                <tr key={n.id} className={n.estado === "Anulada" ? styles.anulada : ""}>
                  <td><strong>{n.empleadoNombre}</strong><div className={styles.sub}>{n.empleadoCargo}</div></td>
                  {/* El periodo es lo que identifica la nómina; la causación es cuándo entró al
                      libro. En una nómina de diciembre digitada en enero no son la misma fecha. */}
                  <td>{(n.periodo || "").split("-anulada-")[0]}</td>
                  <td className={styles.sub}>{new Date(n.fechaLiquidacion).toLocaleDateString("es-CO")}</td>
                  <td>{fmt(n.totalDevengos)}</td>
                  <td className={styles.ded}>{fmt(n.totalDeducciones)}</td>
                  <td className={styles.monto}><strong>{fmt(n.neto)}</strong></td>
                  <td>
                    <span className={`badge-estado ${n.estado === "Pagada" ? "activo" : "inactivo"}`}>{n.estado}</span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {n.estado === "Pendiente" && (
                        <button className={styles.pay} onClick={() => cambiarEstado(n, "Pagada")}>Pagar</button>
                      )}
                      {n.estado !== "Anulada" && (
                        <button className={styles.del} onClick={() => cambiarEstado(n, "Anulada")}>Anular</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalEmp && (
        <EmpleadoModal
          inicial={modalEmp.empleado}
          onClose={() => setModalEmp(null)}
          onGuardar={(payload) => guardarEmpleado(payload, modalEmp.empleado?.id)}
        />
      )}
      {liquidar && (
        <LiquidacionModal
          empleado={liquidar}
          exoneradoEmpleador={exoneradoEmpleador}
          onClose={() => setLiquidar(null)}
          onGuardar={async (payload) => {
            const res = await liquidarNomina(payload);
            if (res.error) return res;
            await recargar();
            setLiquidar(null);
            setTab("historial");
            // Los avisos del servidor duran más que una notificación de 3 segundos: son cosas
            // que hay que revisar antes de pagar (auxilio en cero, topes del IBC, parámetros
            // de otro año).
            if (res.avisos?.length) setAvisosServidor(res.avisos);
            else notificar("Nómina liquidada");
            return {};
          }}
        />
      )}
      {notif && <div className={`${styles.toast} ${styles[notif.tipo]}`}>{notif.mensaje}</div>}

      {avisosServidor && (
        <div className="modal-overlay" onClick={() => setAvisosServidor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>Revisa antes de pagar</h2>
              <button className="modal-close" onClick={() => setAvisosServidor(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Se guardó. Estos avisos no impiden nada: señalan lo que un contador miraría
                  antes de dar la nómina por buena. */}
              <p className={styles.sub} style={{ marginBottom: 10 }}>
                Se guardó correctamente. Estos puntos conviene verificarlos:
              </p>
              {avisosServidor.map((a) => (
                <p key={a} className={styles.avisoNomina}>{a}</p>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setAvisosServidor(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, valor, chico }) {
  return (
    <div className={styles.stat}>
      <span className={chico ? styles.statValorChico : styles.statValor}>{valor}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function EmpleadoModal({ inicial, onClose, onGuardar }) {
  const [form, setForm] = useState(() => ({
    nombres: inicial?.nombres || "",
    apellidos: inicial?.apellidos || "",
    documento: inicial?.documento || "",
    cargo: inicial?.cargo || "",
    tipoContrato: inicial?.tipoContrato || "Indefinido",
    salarioBase: inicial?.salarioBase != null ? String(inicial.salarioBase) : "",
    eps: inicial?.eps || "",
    afp: inicial?.afp || "",
    arl: inicial?.arl || "",
    claseRiesgoArl: inicial?.claseRiesgoArl || "I",
    activo: inicial?.activo ?? true,
    // Datos de exógena (formato 2276). Opcionales aquí; obligatorios al reportar.
    tipoDocumentoDian: inicial?.tipoDocumentoDian || "13",
    primerApellido: inicial?.primerApellido || "",
    segundoApellido: inicial?.segundoApellido || "",
    primerNombre: inicial?.primerNombre || "",
    otrosNombres: inicial?.otrosNombres || "",
    direccion: inicial?.direccion || "",
    codigoDepartamento: inicial?.codigoDepartamento || "",
    codigoMunicipio: inicial?.codigoMunicipio || "",
    codigoPais: inicial?.codigoPais || CODIGO_PAIS_COLOMBIA,
  }));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }));

  async function submit() {
    setGuardando(true);
    const res = await onGuardar(form);
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setTimeout(() => setError(""), 4000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{inicial ? "Editar Empleado" : "Nuevo Empleado"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label>Nombres *</label><input value={form.nombres} onChange={(e) => set("nombres", e.target.value)} /></div>
            <div className="form-group"><label>Apellidos *</label><input value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Documento *</label><input value={form.documento} onChange={(e) => set("documento", e.target.value)} /></div>
            <div className="form-group"><label>Cargo *</label><input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de Contrato</label>
              <select value={form.tipoContrato} onChange={(e) => set("tipoContrato", e.target.value)}>
                {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Salario Base *</label><input type="number" min="0" value={form.salarioBase} onChange={(e) => set("salarioBase", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>EPS</label><input value={form.eps} onChange={(e) => set("eps", e.target.value)} /></div>
            <div className="form-group"><label>AFP (Pensión)</label><input value={form.afp} onChange={(e) => set("afp", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>ARL</label><input value={form.arl} onChange={(e) => set("arl", e.target.value)} /></div>
          </div>


          <div className="form-row">
            {/* La tarifa de la ARL la fija la actividad del cargo, no el salario, y va del
                0,522% al 6,96%: dejarla siempre en I subestima el costo laboral hasta en un
                6,4% del salario en trabajos de alto riesgo. */}
            <div className="form-group">
              <label>Clase de riesgo</label>
              <select value={form.claseRiesgoArl} onChange={(e) => set("claseRiesgoArl", e.target.value)}>
                {CLASES_RIESGO_ARL.map((c) => (
                  <option key={c.clase} value={c.clase}>
                    {c.clase} — {(c.tarifa * 100).toFixed(3)}% · {c.ejemplo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* ---- Datos para información exógena (formato 2276, rentas de trabajo) ----
              Van al final y marcados como opcionales: no pueden estorbar el alta de un
              empleado, que es una tarea de hoy, por un dato que se usa al reportar. */}
          <details className={styles.exogena}>
            <summary>Datos para información exógena (formato 2276) — opcional</summary>
            <p className={styles.exogenaAyuda}>
              La DIAN pide apellidos y nombres en cuatro campos separados. No se deducen de
              &quot;Nombres&quot; y &quot;Apellidos&quot;: un apellido mal partido cuenta como
              información errónea, no como información faltante.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo de documento (DIAN)</label>
                <select value={form.tipoDocumentoDian} onChange={(e) => set("tipoDocumentoDian", e.target.value)}>
                  <option value="">Sin definir</option>
                  {TIPOS_DOCUMENTO_SELECCIONABLES.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label>Dirección</label><input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Primer apellido</label><input value={form.primerApellido} onChange={(e) => set("primerApellido", e.target.value)} /></div>
              <div className="form-group"><label>Segundo apellido</label><input value={form.segundoApellido} onChange={(e) => set("segundoApellido", e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Primer nombre</label><input value={form.primerNombre} onChange={(e) => set("primerNombre", e.target.value)} /></div>
              <div className="form-group"><label>Otros nombres</label><input value={form.otrosNombres} onChange={(e) => set("otrosNombres", e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Departamento</label>
                <select value={form.codigoDepartamento} onChange={(e) => { set("codigoDepartamento", e.target.value); set("codigoMunicipio", ""); }}>
                  <option value="">Sin definir</option>
                  {DEPARTAMENTOS.map((d) => <option key={d.codigo} value={d.codigo}>{d.codigo} — {d.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Municipio</label>
                <select value={form.codigoMunicipio} onChange={(e) => set("codigoMunicipio", e.target.value)} disabled={!form.codigoDepartamento}>
                  <option value="">{form.codigoDepartamento ? "Sin definir" : "Elige departamento"}</option>
                  {municipiosDe(form.codigoDepartamento).map((m) => (
                    <option key={m.codigo} value={m.codigo.slice(2)}>{m.codigo} — {m.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </details>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} /> Empleado activo
          </label>
          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

function LiquidacionModal({ empleado, exoneradoEmpleador, onClose, onGuardar }) {
  const [form, setForm] = useState({
    // El mes que se liquida. Por defecto el corriente, pero se puede liquidar uno anterior: la
    // nómina se causa y se parametriza por su periodo, no por el día en que se digita.
    periodo: hoyBogota().slice(0, 7),
    diasTrabajados: 30,
    transporte: 0,
    extras: 0,
    recargos: 0,
    comisiones: 0,
    prestamos: 0,
    otrasDeducciones: 0,
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }));

  const calc = useMemo(
    () =>
      calcularLiquidacion({
        salarioBase: empleado.salarioBase,
        // Los mismos parámetros que usa el servidor: si la vista previa los ignora, el usuario
        // ve un costo y se guarda otro.
        claseRiesgoArl: empleado.claseRiesgoArl || "I",
        exoneradoEmpleador,
        ...form,
        // El año sale del periodo liquidado: una nómina de diciembre lleva el salario mínimo
        // de diciembre, no el del año en que se está digitando.
        anio: Number((form.periodo || "").slice(0, 4)) || Number(hoyBogota().slice(0, 4)),
      }),
    [empleado, form]
  );

  async function submit() {
    setGuardando(true);
    const res = await onGuardar({ empleadoId: empleado.id, ...form });
    setGuardando(false);
    if (res?.error) {
      setError(res.error);
      setTimeout(() => setError(""), 4000);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2>Liquidar nómina</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className={styles.liqEmp}>
            <strong>{empleado.nombres} {empleado.apellidos}</strong> — {empleado.cargo}
            <br />Salario base: {fmt(empleado.salarioBase)}
          </p>

          <h3 className={styles.grupo}>Devengos</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Periodo liquidado</label>
              {/* El mes laboral son 30 días para todo efecto salarial y prestacional
                  (art. 134 CST), también en los meses de 31. */}
              <input type="month" value={form.periodo} max={hoyBogota().slice(0, 7)} onChange={(e) => set("periodo", e.target.value)} />
            </div>
            <div className="form-group"><label>Días trabajados</label><input type="number" min="1" max="30" value={form.diasTrabajados} onChange={(e) => set("diasTrabajados", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Aux. transporte</label><input type="number" min="0" value={form.transporte} onChange={(e) => set("transporte", e.target.value)} /></div>
            <div className="form-group"><label>Comisiones</label><input type="number" min="0" value={form.comisiones} onChange={(e) => set("comisiones", e.target.value)} /></div>
          </div>
          <div className="form-row">
            {/* Van separados a propósito: los dos cotizan, pero el trabajo suplementario NO
                entra en la base de vacaciones y el recargo nocturno o dominical sí
                (art. 192 num. 2 CST). */}
            <div className="form-group">
              <label>Horas extra</label>
              <input type="number" min="0" value={form.extras} onChange={(e) => set("extras", e.target.value)} />
              <small className={styles.pista}>No entran en la base de vacaciones.</small>
            </div>
            <div className="form-group">
              <label>Recargos</label>
              <input type="number" min="0" value={form.recargos} onChange={(e) => set("recargos", e.target.value)} />
              <small className={styles.pista}>Nocturno y dominical: sí entran en vacaciones.</small>
            </div>
          </div>

          <h3 className={styles.grupo}>Deducciones</h3>
          <div className="form-row">
            <div className="form-group"><label>Salud (4%)</label><input value={fmt(calc.salud)} readOnly /></div>
            <div className="form-group"><label>Pensión (4%)</label><input value={fmt(calc.pension)} readOnly /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Préstamos</label><input type="number" min="0" value={form.prestamos} onChange={(e) => set("prestamos", e.target.value)} /></div>
            <div className="form-group"><label>Otras deducciones</label><input type="number" min="0" value={form.otrasDeducciones} onChange={(e) => set("otrasDeducciones", e.target.value)} /></div>
          </div>

          {/* El costo laboral NO es el salario. Estos dos bloques son gasto del empleador y
              no se le descuentan a nadie: sin ellos el gasto de nómina quedaba subestimado
              en torno al 38%. */}
          <h3 className={styles.grupo}>Aportes del empleador</h3>
          {calc.exonerado && (
            <p className={styles.avisoNomina}>
              Exonerado del art. 114-1 E.T.: no se liquidan salud patronal, SENA ni ICBF. La caja
              de compensación y la pensión se pagan igual.
            </p>
          )}
          <div className="form-row">
            <div className="form-group"><label>Salud (8,5%)</label><input value={fmt(calc.saludPatronal)} readOnly /></div>
            <div className="form-group"><label>Pensión (12%)</label><input value={fmt(calc.pensionPatronal)} readOnly /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>ARL (clase {empleado.claseRiesgoArl || "I"})</label>
              <input value={fmt(calc.arl)} readOnly />
            </div>
            <div className="form-group">
              <label>Parafiscales (SENA, ICBF, Caja)</label>
              <input value={fmt(calc.sena + calc.icbf + calc.cajaCompensacion)} readOnly />
            </div>
          </div>

          <h3 className={styles.grupo}>Prestaciones sociales</h3>
          <div className="form-row">
            <div className="form-group"><label>Cesantías (8,33%)</label><input value={fmt(calc.cesantias)} readOnly /></div>
            <div className="form-group"><label>Intereses s/ cesantías</label><input value={fmt(calc.interesesCesantias)} readOnly /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Prima (8,33%)</label><input value={fmt(calc.prima)} readOnly /></div>
            <div className="form-group"><label>Vacaciones (4,17%)</label><input value={fmt(calc.vacaciones)} readOnly /></div>
          </div>

          <div className={styles.liqTot}>
            <div className={styles.totRow}><span>Total devengos</span><span>{fmt(calc.totalDevengos)}</span></div>
            <div className={styles.totRow}><span>Total deducciones</span><span className={styles.ded}>−{fmt(calc.totalDeducciones)}</span></div>
            <div className={styles.totFinal}><span>Neto a pagar</span><strong>{fmt(calc.neto)}</strong></div>
            <div className={styles.totRow} style={{ marginTop: 10 }}>
              <span>Aportes del empleador</span><span>{fmt(calc.totalAportesPatronales)}</span>
            </div>
            <div className={styles.totRow}><span>Prestaciones sociales</span><span>{fmt(calc.totalPrestaciones)}</span></div>
            <div className={styles.totCosto}>
              <span>Costo total para la empresa</span>
              <strong>{fmt(calc.costoTotal)}</strong>
            </div>
          </div>

          {(calc.avisos || []).map((a) => (
            <p key={a} className={styles.avisoNomina}>{a}</p>
          ))}

          {error && <div className="mensaje-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={submit} disabled={guardando}>{guardando ? "Liquidando..." : "Guardar liquidación"}</button>
        </div>
      </div>
    </div>
  );
}
