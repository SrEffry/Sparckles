"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listarClientes } from "@/lib/clientesApi";
import { listarProductos } from "@/lib/productosApi";
import {
  crearBorrador,
  guardarBorrador,
  obtenerBorrador,
  revisarBorrador,
  devolverBorrador,
  emitirBorrador,
  eliminarBorrador,
} from "@/lib/borradoresFacturaApi";
import { obtenerConfig } from "@/lib/configFacturacionApi";
import { calcularFactura } from "@/lib/facturaCalc";
import { hoyBogota } from "@/lib/fechas";
import { MEDIOS_PAGO } from "@/lib/data/mediosPago";
import BuscadorEntidad from "@/components/BuscadorEntidad";
import ClienteModal from "@/components/ClienteModal";
import ProductoModal from "@/components/ProductoModal";
import { crearCliente } from "@/lib/clientesApi";
import { crearProducto } from "@/lib/productosApi";
import styles from "./nueva.module.css";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

// Suma días a una fecha ISO (YYYY-MM-DD) de forma segura respecto a zona horaria.
function sumarDias(iso, n) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

let lineId = 0;

// `useSearchParams` obliga a un límite de Suspense: esta ruta se prerenderiza estáticamente y
// sin él el build falla.
export default function NuevaFacturaPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}

/**
 * Una sola pantalla para crear y para editar un borrador (`?borrador=<id>`).
 *
 * Se reutiliza en vez de duplicarla porque es el mismo formulario: partirla en dos dejaría dos
 * copias de la misma liquidación que se desincronizan a la primera regla nueva.
 *
 * AQUÍ NO SE EMITE NADA DIRECTAMENTE: toda factura nace como borrador. Emitir es un acto
 * aparte, desde un borrador ya revisado, y quien asigna el consecutivo DIAN es el servidor.
 */
function Editor() {
  const router = useRouter();
  const borradorId = useSearchParams().get("borrador");
  const [estado, setEstado] = useState("borrador"); // borrador | revisado | emitido
  const [facturaEmitida, setFacturaEmitida] = useState(null);
  const [cargando, setCargando] = useState(!!borradorId);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [desfase, setDesfase] = useState(null);
  const [aviso, setAviso] = useState("");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [config, setConfig] = useState(undefined); // undefined=cargando · null=sin config · obj
  const [clienteId, setClienteId] = useState("");
  const [lineas, setLineas] = useState([]);
  const [addProd, setAddProd] = useState("");
  const [fecha, setFecha] = useState(hoyBogota());
  const [formaPago, setFormaPago] = useState("Contado");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [instrumentos, setInstrumentos] = useState([]); // {insId, medio, banco, referencia, valor}
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [reteIvaAplica, setReteIvaAplica] = useState(false);
  const [reteIvaPorcentaje, setReteIvaPorcentaje] = useState(15);
  const [reteIcaAplica, setReteIcaAplica] = useState(false);
  const [reteIcaPorMil, setReteIcaPorMil] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [emitiendo, setEmitiendo] = useState(false);
  // Creación rápida sin salir del borrador: el modal se abre aquí mismo, y lo creado entra en la
  // lista y queda elegido. Navegar a /clientes o /productos habría perdido lo que se lleva
  // escrito, que es justo lo que hacía incómodo el flujo anterior.
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [creandoProducto, setCreandoProducto] = useState(false);

  useEffect(() => {
    listarClientes().then(setClientes);
    listarProductos().then(setProductos);
    obtenerConfig().then(setConfig);
  }, []);

  // Carga del borrador que se está editando. La `previa` que devuelve el servidor no se usa
  // para pintar el resumen —eso lo hace el cálculo local mientras se escribe—, pero sus avisos
  // sí: son los que dicen que un producto desapareció o que la resolución venció.
  useEffect(() => {
    if (!borradorId) return;
    let vivo = true;
    obtenerBorrador(borradorId).then((data) => {
      if (!vivo) return;
      if (!data) {
        setError("El borrador no existe o no es tuyo.");
        setCargando(false);
        return;
      }
      const b = data.borrador;
      setEstado(b.estado);
      setFacturaEmitida(b.factura || null);
      setClienteId(b.clienteId || "");
      setFecha(b.fecha || hoyBogota());
      setFormaPago(b.formaPago || "Contado");
      setFechaVencimiento(b.fechaVencimiento || "");
      setDescuentoGlobal(Number(b.descuentoGlobalPorcentaje) || 0);
      const rIva = Number(b.reteIvaPorcentaje) || 0;
      setReteIvaAplica(rIva > 0);
      if (rIva > 0) setReteIvaPorcentaje(rIva);
      const rIca = Number(b.reteIcaPorMil) || 0;
      setReteIcaAplica(rIca > 0);
      if (rIca > 0) setReteIcaPorMil(rIca);
      setObservaciones(b.observaciones || "");
      setLineas(
        (b.items || []).map((i) => ({
          lineId: ++lineId,
          productoId: i.productoId,
          cantidad: i.cantidad ?? 1,
          // `null` = el borrador no fijó precio y debe usarse el del catálogo al emitir.
          precioUnitario: i.precioUnitario ?? "",
          descuentoPorcentaje: i.descuentoPorcentaje ?? 0,
        }))
      );
      setInstrumentos(
        (b.instrumentos || []).map((x) => ({
          insId: ++lineId,
          medio: x.medio,
          banco: x.banco || "",
          referencia: x.referencia || "",
          valor: x.valor,
        }))
      );
      setDesfase(data.desfase || null);
      if (data.avisos?.length) setAviso(data.avisos.join(" · "));
      setSucio(false);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [borradorId]);

  const productosPorId = useMemo(
    () => Object.fromEntries(productos.map((p) => [p.id, p])),
    [productos]
  );
  const cliente = clientes.find((c) => c.id === clienteId) || null;
  const esCredito = formaPago === "Crédito";

  const reteIvaPct = reteIvaAplica ? Number(reteIvaPorcentaje) || 0 : 0;
  const reteIcaMil = reteIcaAplica ? Number(reteIcaPorMil) || 0 : 0;

  const calc = useMemo(() => {
    if (!cliente || lineas.length === 0 || !config) return null;
    try {
      return calcularFactura({
        cliente,
        productosPorId,
        items: lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          descuentoPorcentaje: l.descuentoPorcentaje,
        })),
        emisorResponsableIva: !!config.responsableIva,
        descuentoGlobalPorcentaje: Number(descuentoGlobal) || 0,
        reteIvaPorcentaje: reteIvaPct,
        reteIcaPorMil: reteIcaMil,
      });
    } catch {
      return null;
    }
  }, [cliente, productosPorId, lineas, config, descuentoGlobal, reteIvaPct, reteIcaMil]);

  // Vista previa por línea, indexada por `lineId` y NO por posición.
  //
  // `calcularFactura` SALTA los ítems cuyo producto no está en el catálogo (`if (!p) continue`),
  // así que `calc.lineas` puede ser más corto que `lineas` y los índices dejan de coincidir: la
  // fila de un producto mostraba la base y el IVA de OTRO, sin ningún indicio de que algo iba
  // mal. Se replica aquí el mismo criterio de salto para emparejarlas en orden.
  // (Al emitir esto no puede pasar: `liquidarFactura` rechaza el documento entero con
  // PRODUCTO_INVALIDO. Es un problema solo de la previsualización, que es donde se decide.)
  const calcPorLinea = useMemo(() => {
    const m = new Map();
    if (!calc) return m;
    lineas
      .filter((l) => productosPorId[l.productoId])
      .forEach((l, i) => {
        if (calc.lineas[i]) m.set(l.lineId, calc.lineas[i]);
      });
    return m;
  }, [calc, lineas, productosPorId]);

  function agregarProducto(id) {
    if (!id) return;
    // El precio se PRECARGA del catálogo y queda editable: es el valor por defecto, no una regla.
    const cat = productosPorId[id];
    setLineas((ls) => [
      ...ls,
      {
        lineId: ++lineId,
        productoId: id,
        cantidad: 1,
        precioUnitario: cat ? Number(cat.precioVenta) : "",
        descuentoPorcentaje: 0,
      },
    ]);
    setAddProd("");
  }
  function actualizarLinea(lid, campo, valor) {
    setLineas((ls) => ls.map((l) => (l.lineId === lid ? { ...l, [campo]: valor } : l)));
  }
  function quitarLinea(lid) {
    setLineas((ls) => ls.filter((l) => l.lineId !== lid));
  }

  // Instrumentos de cobro: uno o varios (cheque, transferencia, efectivo…) que deben cuadrar
  // con el total a cobrar.
  const totalACobrar = calc?.totalACobrar ?? 0;
  const sumaInstrumentos = instrumentos.reduce((a, x) => a + (Number(x.valor) || 0), 0);
  const cuadra = instrumentos.length === 0 || Math.abs(sumaInstrumentos - totalACobrar) < 1;

  function agregarInstrumento() {
    const pendiente = Math.max(0, totalACobrar - sumaInstrumentos);
    setInstrumentos((xs) => [
      ...xs,
      { insId: ++lineId, medio: "10", banco: "", referencia: "", valor: pendiente || "" },
    ]);
  }
  function actualizarInstrumento(id, campo, valor) {
    setInstrumentos((xs) => xs.map((x) => (x.insId === id ? { ...x, [campo]: valor } : x)));
  }
  function quitarInstrumento(id) {
    setInstrumentos((xs) => xs.filter((x) => x.insId !== id));
  }

  // Lo que se manda al servidor. Son INSUMOS: ni un total va aquí. La factura la liquida el
  // servidor al emitir, con las tarifas de ese momento.
  const payload = useMemo(
    () => ({
      clienteId: clienteId || null,
      items: lineas.map((l) => ({
        productoId: l.productoId,
        cantidad: Number(l.cantidad) || 0,
        // Vacío se manda como `null`: significa "usa el del catálogo", que no es lo mismo que 0.
        precioUnitario: l.precioUnitario === "" || l.precioUnitario == null ? null : Number(l.precioUnitario),
        descuentoPorcentaje: Number(l.descuentoPorcentaje) || 0,
      })),
      fecha,
      formaPago,
      fechaVencimiento: esCredito ? fechaVencimiento : null,
      instrumentos: instrumentos.map((x) => ({
        medio: x.medio,
        banco: (x.banco || "").trim() || null,
        referencia: (x.referencia || "").trim() || null,
        valor: Number(x.valor) || 0,
      })),
      medioPago: instrumentos[0]?.medio || null,
      descuentoGlobalPorcentaje: Number(descuentoGlobal) || 0,
      reteIvaPorcentaje: reteIvaPct,
      reteIcaPorMil: reteIcaMil,
      observaciones,
    }),
    [clienteId, lineas, fecha, formaPago, esCredito, fechaVencimiento, instrumentos,
      descuentoGlobal, reteIvaPct, reteIcaMil, observaciones]
  );

  // Cualquier cambio ensucia el borrador y le quita el visto bueno en pantalla: un "revisado"
  // vale para las cifras que se aprobaron, no para las de después. El servidor hace lo mismo
  // al guardar (`PUT` devuelve el estado a `borrador`); esto solo evita que la pantalla siga
  // mostrando "revisado" mientras se teclea.
  const yaCargado = useRef(false);
  useEffect(() => {
    if (cargando) return;
    if (!yaCargado.current) {
      yaCargado.current = true;
      return;
    }
    setSucio(true);
    setEstado((e) => (e === "revisado" ? "borrador" : e));
    setDesfase(null);
  }, [payload, cargando]);

  const soloLectura = estado === "emitido";

  /**
   * Crea el cliente y lo DEJA ELEGIDO en la factura que se está armando.
   *
   * Se agrega a la lista local en vez de recargarla del servidor: recargar reordenaría la lista
   * y, sobre todo, no hace falta — el endpoint devuelve el cliente creado tal como quedó
   * (incluidos `esAgenteRetenedor` y `esAutorretenedor`, que son los que dirigen la retención).
   */
  async function guardarClienteNuevo(form) {
    const res = await crearCliente(form);
    if (res.error) return res;
    setClientes((cs) => [...cs, res.cliente]);
    setClienteId(res.cliente.id);
    setCreandoCliente(false);
    return res;
  }

  /** Crea el producto y AGREGA LA LÍNEA de una vez, con su precio de lista precargado. */
  async function guardarProductoNuevo(form) {
    const res = await crearProducto(form);
    if (res.error) return res;
    const p = res.producto;
    setProductos((ps) => [...ps, p]);
    setLineas((ls) => [
      ...ls,
      {
        lineId: ++lineId,
        productoId: p.id,
        cantidad: 1,
        precioUnitario: Number(p.precioVenta),
        descuentoPorcentaje: 0,
      },
    ]);
    setCreandoProducto(false);
    return res;
  }

  async function guardar() {
    setError("");
    setAviso("");
    if (instrumentos.length && !cuadra)
      return setError("Los medios de pago no cuadran con el total a cobrar.");
    setGuardando(true);
    const res = borradorId
      ? await guardarBorrador(borradorId, payload)
      : await crearBorrador(payload);
    setGuardando(false);
    if (res.error) return setError(res.error);
    setSucio(false);
    setEstado(res.borrador.estado);
    // Al crear se pasa a modo edición sin recargar la pantalla ni perder lo escrito.
    if (!borradorId) router.replace(`/facturacion/nueva?borrador=${res.borrador.id}`);
    return res.borrador;
  }

  /** Guarda si hay cambios y luego marca el borrador como revisado. */
  async function revisar() {
    setError("");
    let id = borradorId;
    if (!id || sucio) {
      const b = await guardar();
      if (!b) return;
      id = b.id;
    }
    const res = await revisarBorrador(id);
    if (res.error) return setError(res.error);
    setEstado("revisado");
    setDesfase(null);
    setAviso("Borrador revisado. Ya se puede emitir.");
  }

  async function devolver() {
    if (!borradorId) return;
    const res = await devolverBorrador(borradorId);
    if (res.error) return setError(res.error);
    setEstado("borrador");
    setAviso("");
  }

  async function emitir() {
    if (!borradorId) return;
    // La fecha real se dice EXPLÍCITAMENTE aquí: es el último punto en que el usuario puede
    // darse cuenta de que no es la que anotó en el borrador.
    if (
      !confirm(
        `La factura se emitirá con fecha ${hoyBogota()}. Se consumirá un número de la resolución DIAN y dejará de ser editable. ¿Continuar?`
      )
    )
      return;
    setError("");
    setEmitiendo(true);
    // Sin fecha: la factura sale fechada HOY. La del borrador es una preferencia, no la fecha
    // fiscal — emitir en febrero un borrador de enero no puede antedatar el documento.
    const res = await emitirBorrador(borradorId);
    setEmitiendo(false);
    if (res.error) return setError(res.error);
    router.push("/facturacion");
  }

  async function eliminar() {
    if (!borradorId) return router.push("/facturacion");
    if (!confirm("¿Eliminar este borrador? No es un documento fiscal, así que se borra del todo."))
      return;
    const res = await eliminarBorrador(borradorId);
    if (res.error) return setError(res.error);
    router.push("/facturacion");
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <button className={styles.back} onClick={() => router.push("/facturacion")}>←</button>
        <div>
          <h1>{borradorId ? "Borrador de factura" : "Nueva Factura"}</h1>
          <p>
            {soloLectura
              ? `Emitido como la factura ${facturaEmitida?.numeroCompleto || ""}`
              : "Se guarda como borrador. Emitir es un paso aparte."}
          </p>
        </div>
        {borradorId && (
          <span className={`badge-estado ${estado === "revisado" ? "activo" : "inactivo"}`}>
            {estado === "emitido" ? "Emitido" : estado === "revisado" ? "Revisado" : "Borrador"}
          </span>
        )}
      </header>

      {error && <div className="mensaje-error">{error}</div>}
      {aviso && !error && <div className={styles.aviso}>{aviso}</div>}
      {desfase && (
        <div className="mensaje-error">
          {desfase.mensaje}
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {desfase.cambios.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {soloLectura && (
        <div className={styles.aviso}>
          Este borrador ya se emitió como la factura{" "}
          <strong>{facturaEmitida?.numeroCompleto}</strong>. Se conserva como rastro de origen y
          no se puede editar ni borrar. Para corregirla, emite una nota crédito o débito.
        </div>
      )}
      {config === null && (
        <div className="mensaje-error">
          Aún no has configurado la facturación (resolución DIAN). Ve a Configuración → Config.
          Facturación antes de emitir.
        </div>
      )}
      {config && !config.responsableIva && (
        <div className={styles.aviso}>
          No eres <strong>responsable de IVA</strong>: esta factura se emitirá <strong>sin IVA</strong>,
          aunque los productos tengan tarifa.
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.left}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Cliente</h2>
            <BuscadorEntidad
              items={clientes}
              texto={(c) => c.nombreCompleto}
              sub={(c) => (c.tipo === "natural" ? c.numeroDocumento : `NIT ${c.nit}`)}
              valorInicial={cliente?.nombreCompleto || ""}
              onElegir={(c) => setClienteId(c.id)}
              onCrear={() => setCreandoCliente(true)}
              etiquetaCrear="+ Nuevo cliente"
              placeholder="Buscar cliente por nombre o documento..."
            />
            {cliente && (
              <div className={styles.clienteInfo}>
                {cliente.esAgenteRetenedor && <span className="badge-estado activo">Agente retenedor</span>}
                {cliente.esAutorretenedor && <span className={styles.autorret}>Autorretenedor</span>}
                {!cliente.esAgenteRetenedor && (
                  <span className={styles.muted}>No aplica retención en la factura</span>
                )}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Productos</h2>
            {/* `limpiarAlElegir`: tras agregar la línea el campo vuelve a cero, para poder
                encadenar varios productos sin borrar a mano. */}
            <BuscadorEntidad
              items={productos}
              texto={(p) => p.descripcion}
              sub={(p) => `${p.codigo} · ${fmt(p.precioVenta)}`}
              onElegir={(p) => agregarProducto(p.id)}
              onCrear={() => setCreandoProducto(true)}
              etiquetaCrear="+ Nuevo producto"
              placeholder="Buscar producto por nombre o código..."
              limpiarAlElegir
            />

            {lineas.length === 0 ? (
              <p className={styles.vacio}>Aún no hay productos en la factura.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th title="Precargado del catálogo. Puedes cambiarlo solo para esta factura.">P. unit.</th>
                      <th>Desc.%</th>
                      <th>Base</th>
                      <th>IVA</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l) => {
                      const p = productosPorId[l.productoId];
                      const linea = calcPorLinea.get(l.lineId);
                      return (
                        <tr key={l.lineId}>
                          <td>
                            <div className={styles.prodNombre}>{p?.descripcion}</div>
                            <div className={styles.prodSub}>{p?.codigo} · {fmt(p?.precioVenta)}</div>
                          </td>
                          <td>
                            <input type="number" min="1" className={styles.mini} value={l.cantidad}
                              onChange={(e) => actualizarLinea(l.lineId, "cantidad", e.target.value)} />
                          </td>
                          {/* PRECIO PACTADO. Se precarga del catálogo y se puede cambiar solo
                              para esta factura: el catálogo NO se toca. Vaciarlo vuelve a usar
                              el precio de lista al emitir. */}
                          <td>
                            <input type="number" min="0" step="0.01" className={styles.precio}
                              value={l.precioUnitario ?? ""}
                              placeholder={p ? String(Number(p.precioVenta)) : ""}
                              onChange={(e) => actualizarLinea(l.lineId, "precioUnitario", e.target.value)} />
                            {p && l.precioUnitario !== "" && l.precioUnitario != null &&
                              Number(l.precioUnitario) !== Number(p.precioVenta) && (
                                <div className={styles.precioAviso} title="Solo afecta esta factura; el catálogo no cambia.">
                                  lista {fmt(p.precioVenta)}
                                </div>
                              )}
                          </td>
                          <td>
                            <input type="number" min="0" max="100" className={styles.mini} value={l.descuentoPorcentaje}
                              onChange={(e) => actualizarLinea(l.lineId, "descuentoPorcentaje", e.target.value)} />
                          </td>
                          <td>{fmt(linea?.base)}</td>
                          <td>{fmt(linea?.valorIva)}</td>
                          <td><button className={styles.rm} onClick={() => quitarLinea(l.lineId)}>✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Detalles y pago</h2>
            <div className="form-row">
              <div className="form-group">
                {/* NO se llama "fecha de emisión" y la distinción no es cosmética: la factura
                    sale fechada el día en que se EMITE, no el que diga el borrador. Llamarla
                    fecha de emisión hacía creer al usuario que estaba fechando el documento
                    cuando solo estaba anotando una previsión. */}
                <label>Fecha prevista de la operación</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                <small className={styles.muted}>
                  Referencia del borrador. La factura se emitirá con la fecha del día en que se
                  emita.
                </small>
              </div>
              <div className="form-group">
                <label>Forma de pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                  <option value="Contado">Contado</option>
                  <option value="Crédito">Crédito</option>
                </select>
              </div>
            </div>

            {esCredito && (
              <div className="form-group">
                <label>Fecha de vencimiento</label>
                <input type="date" value={fechaVencimiento} min={fecha}
                  onChange={(e) => setFechaVencimiento(e.target.value)} />
                <div className={styles.atajos}>
                  {[15, 30, 60].map((n) => (
                    <button key={n} type="button" className={styles.chipBtn}
                      onClick={() => setFechaVencimiento(sumarDias(fecha, n))}>
                      +{n} días
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Descuento global (%)</label>
              <input type="number" min="0" max="100" value={descuentoGlobal}
                onChange={(e) => setDescuentoGlobal(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Observaciones</label>
              <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.mediosHead}>
              <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>Medios de pago</h2>
              <button type="button" className={styles.chipBtn} onClick={agregarInstrumento}>
                + Agregar
              </button>
            </div>

            {instrumentos.length === 0 ? (
              <p className={styles.muted} style={{ marginTop: 12 }}>
                Sin detalle (se asume efectivo). Agrega uno para registrar cheque, transferencia,
                consignación, etc.
              </p>
            ) : (
              <>
                {instrumentos.map((x) => (
                  <div key={x.insId} className={styles.instrumento}>
                    <select value={x.medio} onChange={(e) => actualizarInstrumento(x.insId, "medio", e.target.value)}>
                      {MEDIOS_PAGO.map((m) => (
                        <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                      ))}
                    </select>
                    <input placeholder="Banco (opcional)" value={x.banco}
                      onChange={(e) => actualizarInstrumento(x.insId, "banco", e.target.value)} />
                    <input placeholder="N° cheque / cuenta / aprob." value={x.referencia}
                      onChange={(e) => actualizarInstrumento(x.insId, "referencia", e.target.value)} />
                    <input type="number" min="0" placeholder="Valor" value={x.valor}
                      onChange={(e) => actualizarInstrumento(x.insId, "valor", e.target.value)} />
                    <button className={styles.rm} onClick={() => quitarInstrumento(x.insId)}>✕</button>
                  </div>
                ))}
                <div className={styles.cuadre} data-ok={cuadra ? "true" : "false"}>
                  {cuadra
                    ? "✓ Cuadra con el total a cobrar"
                    : `Registrado ${fmt(sumaInstrumentos)} de ${fmt(totalACobrar)} · ${
                        sumaInstrumentos > totalACobrar ? "sobran" : "faltan"
                      } ${fmt(Math.abs(totalACobrar - sumaInstrumentos))}`}
                </div>
              </>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Retenciones fiscales</h2>
            <p className={styles.muted} style={{ marginBottom: 12 }}>
              Aplican solo si el adquirente es agente de ReteIVA/ReteICA (grandes contribuyentes,
              entidades estatales). Se descuentan del total a cobrar.
            </p>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={reteIvaAplica} onChange={(e) => setReteIvaAplica(e.target.checked)} />
              Practicar ReteIVA
            </label>
            {reteIvaAplica && (
              <div className="form-group">
                <label>ReteIVA (% sobre el IVA)</label>
                <input type="number" min="0" max="100" step="0.1" value={reteIvaPorcentaje}
                  onChange={(e) => setReteIvaPorcentaje(e.target.value)} />
              </div>
            )}
            <label className={styles.checkRow}>
              <input type="checkbox" checked={reteIcaAplica} onChange={(e) => setReteIcaAplica(e.target.checked)} />
              Practicar ReteICA
            </label>
            {reteIcaAplica && (
              <div className="form-group">
                <label>ReteICA (por mil ‰ sobre la base)</label>
                <input type="number" min="0" step="0.1" value={reteIcaPorMil}
                  onChange={(e) => setReteIcaPorMil(e.target.value)} />
              </div>
            )}
          </section>
        </div>

        <aside className={styles.resumen}>
          <h2 className={styles.cardTitle}>Resumen</h2>
          <Row label="Subtotal" valor={fmt(calc?.subtotal)} />
          {calc?.totalDescuentos > 0 && <Row label="Descuentos" valor={`-${fmt(calc.totalDescuentos)}`} />}
          <Row label="IVA" valor={fmt(calc?.totalIva)} />
          {calc?.totalRetenciones > 0 && (
            <Row label="ReteFuente" valor={`-${fmt(calc.totalRetenciones)}`} verde />
          )}
          {calc?.reteIva > 0 && <Row label="ReteIVA" valor={`-${fmt(calc.reteIva)}`} verde />}
          {calc?.reteIca > 0 && <Row label="ReteICA" valor={`-${fmt(calc.reteIca)}`} verde />}
          <div className={styles.total}>
            <span>Total a cobrar</span>
            <strong>{fmt(calc?.totalACobrar)}</strong>
          </div>
          {/* El total del resumen es una VISTA PREVIA local. El número que vale lo liquida el
              servidor al emitir, con las tarifas de ese momento: por eso emitir exige haber
              revisado, y si la cifra cambió entre una cosa y otra el servidor no emite. */}
          {!soloLectura && (
            <div className={styles.acciones}>
              <button
                className="btn-primary"
                style={{ width: "100%" }}
                onClick={guardar}
                disabled={guardando}
              >
                {guardando ? "Guardando..." : sucio || !borradorId ? "Guardar borrador" : "Guardado"}
              </button>

              {estado === "revisado" ? (
                <>
                  <button
                    className="btn-primary"
                    style={{ width: "100%" }}
                    onClick={emitir}
                    disabled={emitiendo}
                  >
                    {emitiendo ? "Emitiendo..." : "Emitir factura"}
                  </button>
                  <button className={styles.secundario} onClick={devolver}>
                    Quitar el visto bueno
                  </button>
                </>
              ) : (
                <button className={styles.secundario} onClick={revisar}>
                  Marcar como revisado
                </button>
              )}

              <button className={styles.destructivo} onClick={eliminar}>
                {borradorId ? "Eliminar borrador" : "Descartar"}
              </button>

              <p className={styles.muted} style={{ fontSize: 12, marginTop: 4 }}>
                Un borrador no consume numeración de la resolución DIAN ni entra al libro
                diario. Eso ocurre al emitir.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, valor, verde }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <span style={verde ? { color: "var(--success)" } : undefined}>{valor}</span>
      {creandoCliente && (
        <ClienteModal
          inicial={null}
          onGuardar={guardarClienteNuevo}
          onClose={() => setCreandoCliente(false)}
        />
      )}
      {creandoProducto && (
        <ProductoModal
          inicial={null}
          onGuardar={guardarProductoNuevo}
          onClose={() => setCreandoProducto(false)}
        />
      )}
    </div>
  );
}
