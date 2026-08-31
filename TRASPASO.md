# Traspaso — estado del trabajo y qué falta

> Se llama **TRASPASO** y no "migración" a propósito: en este repo `migración` significa
> `prisma/migrations/`, y confundir las dos cosas costaría un susto.

Documento de continuidad para quien retome el trabajo. Recoge lo que quedó hecho, **lo que falta**
y **los hallazgos de las revisiones contables que siguen abiertos**. `CLAUDE.md` es la guía del
repo y manda sobre esto; aquí solo está lo pendiente y el contexto que no cabe allá.

**Rama:** `feature` · **Última actualización:** 30 de agosto de 2026

---

## 1. Lo primero que hay que saber

### La re-revisión contable de exógena YA SE HIZO — veredicto: **NO CUMPLE** (30-ago-2026)

La re-revisión que había quedado a medias se relanzó y esta vez sí devolvió veredicto. Los
**cuatro bloqueantes de la revisión anterior quedaron cerrados** y se validaron contra la norma
varias decisiones (base del concepto 1309 = IVA por Res. 000233/2025; supresión de la columna del
art. 490 desde el AG 2026; `vigentesAlCorte`; exclusión del IVA de activos fijos; toda la
arquitectura de identidad `Cliente` → `Tercero`). Pero el commit `9dafdc2` **introdujo defectos
nuevos**, y tres ya se arreglaron. Lo que queda está en §3.6.

**Cerrados el 30-ago-2026** (verificados contra el código antes de tocarlos, `npm run build` pasa):

- **B2 · El filtro de estado de comprobantes nunca coincidía.** `exogenaFormatos.js` filtraba con
  `estado: { not: "Anulado" }` en MAYÚSCULA, pero `ComprobanteTesoreria` usa minúsculas
  (`borrador | emitido | anulado | reversado`); el literal venía de `DocumentoSoporte`, que sí las
  usa así. La condición era **siempre verdadera**: entraban al 1003 comprobantes en borrador,
  anulados y reversados. Ahora es `estado: "emitido"`, en positivo.
  > ⚠️ **Hay dos convenciones de estado conviviendo en el repo** (`DocumentoSoporte` en mayúscula,
  > el resto en minúscula) y esto ya costó un bloqueante. Deberían ser constantes por modelo.
- **B3 · El tipo de documento se adivinaba por longitud** (`>= 9 → 31 NIT`, si no `13`). Las
  cédulas emitidas desde ~1985 tienen **10 dígitos**, así que la regla convertía en persona
  jurídica a la mayoría de la población activa, y la exógena identifica al tercero por el **par
  (tipo, número)**, que debe coincidir con el RUT. Tres sitios:
  - `exogenaFormatos.js` (1003 desde comprobantes): ahora **busca la ficha real** en `Tercero` por
    documento normalizado; si no la encuentra **falla cerrado** —tipo vacío— y la fila entra en
    `incompletos`, con aviso propio en la hoja LÉEME.
  - `terceros.js` (`resolverTercero`): `tipoDocumentoDian` queda en **NULL** cuando nadie lo dijo,
    y `pendientesDeTercero` ya lo saca como CRÍTICO. La longitud solo sigue dando el valor inicial
    de `tipo` (natural/juridica), que es etiqueta de presentación y no admite null.
  - Formulario de compras: se quitó el default `"NIT"` (había un comentario que decía justamente
    que ese default convertía en sociedad a una persona natural, y el default seguía ahí).
- **R7 · El tablero marcaba a TODOS los empleados como críticos.** `exogenaPreparacion.js`
  empujaba `"Sin tipo de documento DIAN"` incondicionalmente, con un comentario que afirmaba que
  `Empleado` no guardaba esos campos. Es falso desde la fase 0: el modelo tiene
  `tipoDocumentoDian`, los cuatro nombres, `direccion` y los códigos DANE, **y el formulario de
  nómina los captura** (verificado). Una empresa con 40 empleados completos veía 40 críticos
  permanentes y el tablero perdía toda señal. Ahora se evalúan con `pendientesDeTercero`, la misma
  regla que clientes y proveedores.

### ⚠️ La base de datos local tiene datos de prueba míos

Al probar se emitieron documentos reales en la BD de desarrollo (usuario
`prueba.setup@local.test`):

- **Facturas `FE-00044`, `FE-00045` y `FE-00046`**, con sus borradores archivados. El consecutivo
  de la resolución quedó movido.
- Un cliente que se desactivó y se reactivó al probar la guarda de borrado.
- Compras, notas y terceros de prueba que **sí** se eliminaron al terminar cada prueba.

No borré las facturas porque son documentos fiscales y esa decisión no es mía. Si la BD se va a
seguir usando para desarrollo, no importa; si alguna vez se toma como base de algo real, hay que
limpiarlas primero.

### Archivo suelto sin versionar

`_leer_tmp.mjs` en la raíz: un script de un solo uso que lee los layouts del `.xlsx` de exógena.
No es mío y no lo subí. Si ya no sirve, se puede borrar; si sirve, su sitio es `scripts/`.

---

## 2. Qué se hizo (últimos 23 commits, sin subir hasta ahora)

| Commit | Qué |
|---|---|
| `c73e39d` | PDF del documento soporte, `emisorSnapshot`, validación de **clase** en el mapa de cuentas, huecos del PUC comercial |
| `287bcec` | Cargar el PUC no es recargarlo: para agregar cuentas sobra el `?force=1` |
| `4ae82ee` | **Toda factura nace borrador**; el consecutivo DIAN se gasta al emitir |
| `665b9f9` | La revisión del borrador congela la **liquidación entera**, no una cifra |
| `a3f65da` | Exógena fase 0: códigos DANE, tipos de documento DIAN, tercero normalizado |
| `953d4fa` | Exógena fase 1: tablero de preparación + calendario de plazos |
| `610ba51` | El proveedor deja de ser texto suelto: modelo **`Tercero`** |
| `c19e479` | Exógena fase 2: extractos 1003, 1005, 1006 y 1007 |
| `007a48e` | Cierra los **4 bloqueantes** de la revisión de exógena |
| `9dafdc2` | **Unificación de identidad** `Cliente` → `Tercero` + hallazgos abiertos |

---

## 3. Lo que falta, por prioridad

### 3.1 🔴 Bloqueantes legales todavía abiertos (de la revisión de FACTURAS)

Venían los dos de la revisión del módulo de facturas. El (b) del INC **quedó cerrado el 30 de
agosto de 2026** —queda solo llevar las cuentas a la BD, ver abajo—; el (a) de la tabla de
ReteFuente **sigue abierto y es el pendiente más caro del repo**, porque su valor correcto lo
decide un contador humano, no un agente.

#### a) La tabla de ReteFuente está actualizada a medias

`lib/data/tablaRetefuente.js`. El Decreto 0572 de 2025 bajó la base de servicios de 4 a 2 UVT,
y solo **dos** de los siete conceptos de servicios lo reflejan:

| Concepto | `baseMinima` hoy | Debería ser |
|---|---|---|
| `servicios_declarante_4` | 2 UVT ✔ | 2 UVT |
| `servicios_no_declarante_6` | 2 UVT ✔ | 2 UVT |
| `servicios_generales_6` | **4 UVT** ✖ | 2 UVT |
| `servicios_hoteles_35` | **4 UVT** ✖ | 2 UVT |
| `servicios_vigilancia_2` | **4 UVT** ✖ | 2 UVT |
| `servicios_temporales_1` | **4 UVT** ✖ | 2 UVT |
| `transporte_carga_1` | **4 UVT** ✖ | 2 UVT |

La **inconsistencia interna es innegable** —la base de servicios es un solo número y el archivo
dice dos cosas distintas—, pero **el valor correcto no lo decide un agente**: el revisor advirtió
que verificó el decreto en fuentes secundarias, no en el texto. **Requiere confirmación de un
contador público contra el DUT vigente antes de tocarlo.**

Por qué urge: en ventas el daño es de cartera, pero **compras y documento soporte leen la misma
tabla** y ahí nosotros somos el agente retenedor — el art. 370 E.T. nos hace responder **con
patrimonio propio** por lo que se deje de retener.

Revisar de paso, en el mismo archivo: `arrendamiento_bienes_raices_35` y
`transporte_pasajeros_35` tienen `baseMinima: 0`, lo que hace retener sobre **cualquier** valor.

#### b) ~~Una factura con INC no llega al libro diario~~ ✅ CERRADO (30-ago-2026)

`incPorPagar` estaba en `null` en **los dos sectores** y `movimientosDeFactura` acredita esa
cuenta: cuando faltaba **se perdía el asiento completo**, no solo la línea del INC. Un bar o un
restaurante no registraba **ni una sola venta**.

- **ESAL** → `esal.incPorPagar = "2495"` (la cuenta ya existía en el catálogo, imputable).
- **Comercial** → se agregaron al JSON `2495` (agrupación, nivel 4) y `249505 Impuesto nacional
  al consumo por pagar` (nivel 6, imputable), y `comercial.incPorPagar = "249505"`. El catálogo
  comercial pasó de 434 a **436 cuentas**.
- El INC **no cuelga de la 2408**: inflaría el IVA generado y rompería la conciliación contra el
  Formulario 300.

> ⚠️ **Falta llevar las dos cuentas nuevas a la base de datos.** El código está listo, pero al
> cerrar esto no había ningún Postgres corriendo en la máquina (el `DATABASE_URL` del `.env`
> apunta a un `prisma dev` efímero, `localhost:51214/template1`, que ya no existe). Con la BD
> arriba hay que correr un `createMany({ skipDuplicates: true })` sobre los dos JSON **sin
> `deleteMany`** — NO `?force=1`, que solo agrega el borrado. Mientras no se haga, el mapa de
> cuentas **rechaza** `249505` por inexistente y el hallazgo sigue vivo en la práctica.

> 🟠 **Anotado de paso**: `otrosImpuestos` (bolsas, licores) se acredita a la MISMA cuenta que el
> INC (`asientoAutomatico.js:137`, con comentario que lo reconoce). En comercial eso deja tributos
> que no son INC bajo un auxiliar llamado "Impuesto nacional al consumo" — el mismo patrón del
> riesgo 4 de §3.2 (las cuentas "…19%"). No se cambió porque el nombre del auxiliar es el que
> prescribía este documento; si se quiere separar, es una cuenta más y una clave más en el mapa.

### 3.2 🟠 Riesgos abiertos del módulo de facturas

**Abiertos** (los tres necesitan migración o decisión de diseño, no son de código suelto):

| # | Qué | Dónde |
|---|---|---|
| 2 | **No existe "emisor autorretenedor"**: se le descuenta al total una retención que el cliente no va a practicar, y la cartera queda subestimada en cada factura. Necesita **columna nueva** en `ConfigFacturacion` → migración | `ConfigFacturacion` + `facturaCalc.js` |
| 3 | `exoneradoParafiscales` implica **autorretención especial de renta** (D. 2201/2016) que no se liquida ni se avisa | facturación |
| 5 | La **ReteICA se liquida sobre todo el subtotal** (incluye exento, excluido y no responsable) y no guarda el municipio; el tope admitido llega al 1000‰. Guardar el municipio necesita **migración** | `facturaCalc.js` |

**Cerrados el 30-ago-2026** (`npm run build` pasa):

- **1 · El PDF ya discrimina todas las partidas.** Imprimía solo subtotal, IVA y ReteFuente, así
  que en una factura con INC, ReteIVA o ReteICA los renglones visibles **no sumaban el TOTAL A
  COBRAR** y el documento dejaba de ser verificable para el cliente. Ahora salen INC (aparte del
  IVA: no es IVA, no es descontable y se declara en su propio formulario), otros impuestos,
  ReteIVA, ReteICA y el **Total factura** antes de retenciones, que es el renglón que el cliente
  concilia contra su propia contabilización de la compra.
- **4 · `ivaGenerado`/`ivaDescontable` pasan a `240805`/`240810`.** Apuntaban a auxiliares
  llamados literalmente "IVA Generado Ventas 19%" e "IVA Descontable Compras 19%", donde también
  caía el IVA del 5%: el nombre de la cuenta contradecía su saldo y la conciliación contra el
  Formulario 300 se hacía a ciegas. Las agregadas existen, son imputables y no prejuzgan la
  tarifa. **Ojo: esto solo cambia la SUGERENCIA por defecto** — a quien ya tenga el mapa
  configurado no le cambia nada, y si quiere las nuevas tiene que remapear a mano.
- **6 · El rango de numeración falla CERRADO y por los dos bordes.** Era
  `numeracionHasta != null && actual > hasta`: una config sin tope autorizado emitía **sin
  límite**, justo al revés que `SIN_VIGENCIA`. Ahora faltar el rango es `SIN_RANGO`, y se valida
  también el borde inferior (`ANTES_DEL_RANGO`): un consecutivo por debajo del "desde" emite un
  número que la resolución no ampara, igual que pasarse del tope.
  `configFacturacionValidation` ya exigía los dos bordes, así que un null ahí es una fila vieja.
- **7 · El ancho del consecutivo sale del tope autorizado, con 5 como piso.** `padStart` no
  trunca, así que el 5 cableado nunca deformó un número largo, pero un rango que llega a
  1.000.000 daba anchos irregulares dentro de una misma resolución. El piso de 5 es deliberado:
  **una serie en curso no puede cambiar de formato a mitad de camino.**
- **8 · La fecha ya no puede retroceder.** La numeración autorizada es consecutiva **y
  cronológica**; nada impedía emitir FE-00050 fechada antes que FE-00049 y mover ingreso e IVA
  generado a un periodo ya declarado. Se compara contra la factura de **mayor número** (no de
  mayor fecha) y **sin filtrar por estado**: una anulada también gastó su consecutivo y también
  fija el piso. Error nuevo: `FECHA_RETROCEDE`.
- **9 · La vigencia de la tabla de retefuente se consulta.** `avisoDeVigenciaRetefuente(fecha)` en
  `conceptosRetencion.js` avisa cuando el documento no cae en el año que cubre la tabla cargada
  (hoy 2026). **No bloquea** —dejar de facturar el 1 de enero sería peor—, es la misma regla del
  SMLMV en nómina y de los plazos de exógena.
  > ⚠️ **Wiring incompleto a propósito.** El aviso viaja por el camino de FACTURAS
  > (`emitirFactura` → `avisos[]` → los dos endpoints de emisión). `compraValidation`,
  > `comprobanteValidation`, `productoValidation` y `nominaCalc` leen la misma tabla y **todavía
  > no lo emiten**: no tienen canal de avisos y montarlo es un cambio aparte. El helper ya está,
  > así que enchufarlo es una línea por sitio más el canal.
- **10 · La vista previa se alinea por `lineId`, no por posición.** `calcularFactura` salta los
  ítems cuyo producto ya no está en el catálogo (`if (!p) continue`), así que `calc.lineas` podía
  ser más corto y la fila de un producto mostraba la base y el IVA de **otro**, sin ningún
  indicio. Al emitir no puede pasar —`liquidarFactura` rechaza el documento entero con
  `PRODUCTO_INVALIDO`—: era un problema de la previsualización, que es justo donde se decide.

### 3.3 Exógena — fases que faltan

**Fase 3 — motor de saldos a 31 de diciembre → formatos 1008 y 1009.**
Es la siguiente y **no requiere migrar datos**: el saldo a una fecha de corte se reconstruye
recorriendo `ComprobanteAplicacion → ComprobanteTesoreria.fecha` y `Nota.fecha`, respetando
`Factura.fechaAnulacion`. Fórmula que dio el revisor:

```
saldo(tercero, 31-dic-AAAA) =
    Σ Factura.total            donde fecha ≤ corte y vigente al corte
  − Σ Aplicacion.valorAplicado join Comprobante donde comprobante.fecha ≤ corte
  − Σ Nota(crédito).totalNota  donde fecha ≤ corte
  + Σ Nota(débito).totalNota   donde fecha ≤ corte
```

Declarar en pantalla que el 1009 **no** cubre los conceptos 2203 (obligaciones financieras),
2204 (impuestos), 2214 (parafiscales, salud, pensión, cesantías) ni 2215 (pasivos laborales):
en Sparkles son provisiones de nómina **sin tercero identificado**.

**Fase 4 — formato 1001.** No antes de resolver:
1. Tabla de mapeo **cuenta PUC → concepto 1001**, al estilo de `CLASES_ESPERADAS`.
2. `CompraItem.esActivoFijo` ✅ **ya existe** (se agregó en `9dafdc2`) — sirve para separar el
   concepto **5007** (movibles) del **5008** (fijos).
3. **NIT de EPS, AFP, ARL y caja de compensación**: hoy `Empleado` los guarda como texto libre y
   sin ellos no hay conceptos 5010, 5011 ni 5012.
4. Generarlo **desde el libro auxiliar por cuenta y tercero**, no desde `RetencionPracticada`: un
   pago que no llega a la base mínima no retiene y **aun así se reporta**.

**Nunca, salvo decisión expresa:** generación directa del XML, y los formatos 1004, 1010, 1011,
1012, 1647, 2275 y 2276 completos. El **1056 no aplica** a empresa privada ni a ESAL.

### 3.4 Exógena — lo que los extractos actuales NO cubren

Está dicho en la hoja **LÉEME** de cada `.xlsx` y en `CLAUDE.md`, pero conviene tenerlo junto:

- Conceptos que ningún módulo registra: **1312** (tarjetas débito/crédito — para un comercio
  minorista es una omisión sistemática), **1306** (rendimientos financieros), **1314** (timbre) y
  las **autorretenciones**.
- El **1005** no hace el prorrateo del **art. 490** ni representa el IVA teórico de compras a no
  residentes (`DocumentoSoporte` no guarda IVA).
- El **1007** reporta todo con concepto **4001**: una venta de activo fijo debería ir a 4002 o
  4019 y sale con el concepto equivocado.
- **`Dividendos` mapea a 1310** y podría tener que ser **1320** (sociedades nacionales,
  art. 242-1): depende de la naturaleza del informante, no del pago.

### 3.5 Cosas menores pero anotadas

- **Fusionar dos terceros** con documentos distintos no existe. El endpoint lo dice en vez de
  fingir, pero si un proveedor quedó con dos NIT no hay forma de unirlos desde la app.
- `ConfigFacturacion` **no tiene columna `dv`** propia. Un NIT escrito sin guion no se puede
  separar, y de ahí sale el cálculo del plazo de exógena.
- `partirCodigoMunicipio` (5 dígitos → depto 2 + mcp 3) **está por confirmar** contra el anexo
  técnico. Centralizada en `lib/data/dane.js` para que el cambio sea de un solo sitio.
- **El layout del 1005 cambia con el año** (la columna del art. 490 se suprime desde el AG 2026).
  Las fuentes se contradicen sobre desde cuándo: **confirmar contra el anexo técnico**.
- Los plazos de exógena solo están cargados para el **AG 2025**. El **AG 2026 —que es el objetivo
  real— se carga cuando la DIAN publique la resolución**; el sistema devuelve `null` y lo dice en
  vez de estimar.

---

### 3.6 Exógena — hallazgos ABIERTOS de la re-revisión del 30-ago-2026

**Estado al 30-ago-2026**: cerrados **B2, B3, R7** (§1) y **R2, R3, R4, R5, M1, M3, M4, M5, M6**
(abajo). Siguen abiertos **B1**, **B4** y **R1/R6**, y el veredicto **NO CUMPLE** se sostiene
mientras B1 y B4 lo estén: **la fase 2 no debe liberarse así**.

#### 🔴 B1 — El 1003 duplica la retención (o la omite), según la política del mapa

`lib/exogenaFormatos.js`. El 1003 suma siempre `Factura.retencionesPorConcepto` y, **además**, las
retenciones de los comprobantes de ingreso cuando `mapa.retencionesEnCausacion === false`, sin
descontar lo que la factura ya trae.

El supuesto del comentario ("con `true` ya vinieron en la factura") es falso: **`lib/facturaCalc.js`
no conoce el mapa de cuentas** —verificado: cero referencias en el archivo— así que la factura
liquida y guarda la retención **con cualquier política**. La política solo cambia el asiento
(`asientoAutomatico.js`: con `causadas: false` se debita cartera por el total y no se reconoce la
1355).

- Con `false` → **doble conteo exacto**. FE-00120 de $20.000.000 + IVA, ReteFuente 4% = $800.000 en
  la factura, y el CI del recaudo con otra fila de $800.000: el 1003 sale con **base $40.000.000 y
  retención $1.600.000**. El doble, en el formato que la DIAN cruza contra la declaración de renta.
- Con `true` (el **default**) → **omisión**. Si el cliente estaba mal marcado como no retenedor, la
  factura sale sin retención; al pagar sí retiene y se registra en el CI, pero el `if` bloquea la
  lectura y el 1003 reporta **0**. De paso la cartera queda con esos $800.000 vivos, porque
  `comprobanteCalc.js` trata esa retención como informativa.

**Por qué no se arregló en el mismo paso**: el discriminante no puede ser la política del mapa —la
política es nuestra y quien retiene es el cliente—, así que el arreglo es una decisión de diseño,
no una línea. Las dos opciones que dio el revisor, en su orden:

1. **Tabla `RetencionSufrida`**, espejo de `RetencionPracticada` (que ya resolvió este mismo
   problema con `vinculante`): la escriben la factura al emitir y el comprobante al recaudar, y
   **una sola fila por operación es vinculante**, decidida por el hecho que ocurrió primero, no por
   una bandera de configuración. El 1003 lee solo las vinculantes. Requiere migración.
2. Mínimo viable: leer **siempre** los comprobantes y deduplicar por `(facturaId aplicada, tipo,
   concepto)`. Frágil con abonos parciales.

Mientras no se decida, el 1003 **no debería emitirse sin un aviso explícito** de esta condición.

#### 🔴 B4 — El juego de columnas de 1005, 1006 y 1007 no está verificado contra el anexo técnico

**Esto no lo puede cerrar un agente: requiere un contador público con el prevalidador del AG 2026.**

El argumento fuerte no depende de fuentes secundarias: los cuatro formatos informan **el mismo
universo de terceros** y en el código llevan columnas distintas.

| Formato | DV | Dirección | Cód. depto/mcpio | País |
|---|---|---|---|---|
| 1003 | sí | sí | sí | no |
| 1005 | sí | **no** | **no** | no |
| 1006 | sí | no | no | no |
| 1007 | **no** | no | no | sí |

Eso no es una decisión, es un descuadre: **no pueden estar bien los cuatro a la vez**. Y la hoja 1
existe justamente para pegarse en el prevalidador, donde una columna de más o de menos corre todo
lo que va a su derecha. Sospechas concretas del revisor (fuentes secundarias, **por confirmar**):
el 1005 v9 llevaría dirección y ubicación; el 1007 v9 llevaría DV; el 1006 v8 ordenaría
IVA generado → **INC** → recuperado, y el código emite generado → recuperado → consumo.

- *Ejemplo del 1006*: un restaurante con IVA generado $30.000.000 e INC $50.000.000. Si el orden
  real es (generado, INC, recuperado), el extracto reporta **$50.000.000 como "IVA recuperado en
  devoluciones en compras anuladas"** y **0 de INC**. Un recuperado de 50 millones sin una sola
  compra anulada es una inconsistencia que el prevalidador puede dejar pasar y el cruce no.

**Cómo cerrarlo**: bajar el prevalidador oficial de cada formato para el AG 2026 del portal DIAN,
exportar su plantilla vacía y **derivar de ahí el arreglo `columnas`**. Idealmente moverlo a
`lib/data/layoutsExogena.js` con `{ formato, version, anioDesde, anioHasta, columnas[] }`, como ya
se hizo con `llevaColumna490`, para que cambiar de año no sea editar código.

#### 🟠 Riesgos abiertos

| # | Qué | Dónde |
|---|---|---|
| R1 | **Cuantías menores se usa en el 1003, donde la norma no lo prevé.** El NIT `222222222`/tipo 43 está previsto para 1001, 1005, 1006, 1007, 1008, 1009 y 1159; en el 1003 el informado es **el agente que nos retuvo**, y una retención sin agente identificable no existe (tenemos su certificado del art. 381). Además el registro sale sin dirección ni códigos DANE, donde la práctica es poner los **del informante**. *Por confirmar contra el anexo.* Nota: como `clienteValidation` exige documento, el caso legítimo (venta POS a consumidor final) **no se puede representar**, mientras el fallback existe para los ilegítimos. Y ojo: el "consumidor final" de facturación electrónica es `222222222222` (doce dígitos), **no** es el mismo | `exogenaFormatos.js` (`identificable`) |
| R6 | **Las notas se pueden BORRAR** (`DELETE /api/notas/[id]`). Una NC/ND emitida es documento electrónico con CUFE: borrarla hace que el extracto del AG **deje de ser reproducible**. Deberían ser anulables con fecha, como las facturas | `app/api/notas/[id]/route.js:19` |

#### 🟡 Mejoras abiertas

- **M2** · El 1005 no contempla el IVA descontable de **importaciones** (se reporta con el NIT de
  la DIAN) ni el teórico del art. 437-2 num. 3. Decirlo en el LÉEME.
- **M7** · Los plazos del **AG 2026** siguen sin cargar y el tablero usa por defecto el año en
  curso, así que hoy siempre se ve `plazo: null`. Es la decisión correcta (no estimar), pero hay
  que revisar si la Res. 000227/2025, que pretende regir años siguientes, ya fija ese calendario.

#### ✅ Cerrados el 30-ago-2026 (`npm run build` pasa)

- **R2 · Las notas ya no se caen en silencio** del 1005 y del 1006. Eran dos
  `if (!cliente) continue;` **sin contador ni aviso** —el mismo `continue` que `007a48e` quitó de
  las facturas—. Ahora caen a `identidadDeNota()`, el snapshot que `Nota` sí guarda
  (`clienteNombre`, `clienteDocumento`), con el tipo de documento VACÍO —no adivinado— para que la
  fila entre en `incompletos`, y con aviso propio y conteo.
- **R3 · La columna J del 1005 filtra por `motivoCodigo`.** Solo entran los motivos **1**
  (devolución parcial) y **2** (anulación) del Anexo 1.9: son los únicos que son "devoluciones en
  ventas anuladas, rescindidas o resueltas" del art. 484 lit. b. Una rebaja (3), un ajuste de
  precio (4), un pronto pago (6) o un descuento por volumen (7) ajustan la base gravable y tienen
  otro tratamiento en el formulario 300. Las excluidas se cuentan y se avisan, con nota expresa de
  que si alguna era motivo 5 "Otras" y sí correspondía, hay que agregarla a mano.
- **R4 · Las compras sin ficha ya no quedan fuera del 1005**: caen a `identidadDeCompra()`, el
  snapshot con `proveedorNit`/`proveedorNombre`. Solo se descarta la que no tiene **ni NIT**, que
  ahí sí no hay con qué identificar al proveedor, y esa se cuenta aparte con su propio aviso.
  Antes descartarlas garantizaba que el total no cuadrara contra las declaraciones de IVA del año.
- **R5 · Las notas siguen la suerte de su factura** (`facturaVigenteAlCorte`), en 1005, 1006 y
  1007. Una NC de abril de una factura anulada en julio del mismo año ya no resta sobre un ingreso
  que no está en el formato. Se evalúa **en memoria, no en el `where`**, justamente para poder
  contarlas y avisarlas. Ojo con el matiz: una nota **sin factura asociada** (`facturaId` es
  opcional) NO entra por esa guarda —no hay vigencia que comprobar— y se reporta con su snapshot.
- **M1** · `Math.max(0, …)` en vez de `if (descontable > 0)`. La resta puede quedar levemente
  negativa por redondeo (`CompraItem.base` se persiste ya redondeado, `Compra.totalIva` se
  redondea una sola vez al final), y con el `if` esa compra perdía la fila **entera**, no solo el
  sobrante: el formato dejaba de cuadrar por mucho más que los centavos.
- **M3** · Encabezado de la base del 1003 con la redacción de la Res. 000233/2025.
- **M4** · Una **ND por intereses** (motivo 1) va al concepto **4003** en el 1007. Para eso el
  acumulador del 1007 pasó a agruparse por **(tercero, concepto)** y no solo por tercero: un mismo
  cliente con ingresos ordinarios y financieros son **dos renglones** del formato, no uno.
- **M5** · Aviso con el conteo de facturas anuladas **sin `fechaAnulacion`**, que se excluyen por
  criterio conservador. Callarlo dejaba ingresos fuera sin que nadie lo supiera.
- **M6** · Aviso de que el extracto **no determina si hay obligación de reportar**: los topes de
  la resolución se verifican aparte, y generar el archivo no prueba ni que la haya ni que no.
  M5 y M6 se emiten desde `generarFormato`, así valen para los cuatro formatos sin repetirlos.

#### Fase 3: todavía no

El diseño de datos sí lo permite, pero antes hay que cerrar:

1. **B2** — ya cerrado. Era el mismo literal roto, y en el motor de saldos **sí mueve la cifra**:
   restaría aplicaciones de comprobantes en borrador y anulados, y el 1008 saldría por debajo de la
   cartera real.
2. **Decidir la fuente: documentos o libro mayor.** El 1009 pide pasivos que no nacen de compras
   (obligaciones financieras, impuestos, pasivos laborales, anticipos de clientes) y eso solo sale
   del libro por cuenta y tercero. Pero `AsientoMovimiento.tercero` es un **string suelto, sin tipo
   de documento y sin índice**, y **no todo documento llega al libro** (`asientoId: null` es un
   estado previsto). Hay que elegir la fuente y cubrir el hueco de la elegida.
3. **El 🔴 de la tabla de ReteFuente** (§3.1a) sigue abierto. El de `incPorPagar` ya se cerró en
   código; si el motor va por el libro, era prerrequisito duro.
4. **Cuantías menores con umbral, no con "no lo identifiqué".** En 1008/1009 el umbral es monetario
   (del orden de 12 UVT, *a confirmar contra la resolución del AG 2026*), a diferencia de
   1005/1006/1007 donde es por no identificabilidad. `identificable()` tal como está **no sirve**
   para la fase 3.

**Orden recomendado por el revisor**: B1 → B4 (con el prevalidador en la mano) → R1..R4 → fase 3.
El 1001 (fase 4) va **después** del motor de saldos, no antes: comparten el mapa cuenta PUC →
concepto.

#### Límites de esta revisión

- **No tuvo acceso al anexo técnico ni al prevalidador de la DIAN.** Todo lo relativo a layouts,
  orden y presencia de columnas, versiones de formato y umbrales de cuantías menores está
  contrastado contra **fuentes secundarias** y debe confirmarlo un contador público humano. **B4 y
  R1 dependen de eso.**
- No verificó contra el texto oficial las Res. 000227/2025, 000233/2025, 000237/2025, 000012/2026
  ni 000021/2026. Lo que sí coincide en varias fuentes: base del 1309 = IVA, y supresión de la
  columna del art. 490 desde el AG 2026.
- **B1, B2, B3, R2, R3, R5 y R7 son verificables leyendo el código y no dependen de ninguna fuente
  externa.** Los que se comprobaron uno por uno antes de tocar nada dieron todos positivos.
- No reemplaza la firma ni el juicio de un contador público.

## 4. Cómo verificar que todo sigue en pie

```bash
npm install
npx prisma migrate deploy     # o `migrate dev` en desarrollo
npx prisma generate           # ⚠️ `migrate dev` NO siempre lo dispara
npm run build
npm run dev
```

Dos trampas que ya costaron tiempo:

1. **`prisma migrate dev` no regeneró el cliente** en al menos dos ocasiones. Si aparece
   `Cannot read properties of undefined (reading 'create')` sobre un modelo nuevo, corre
   `npx prisma generate` a mano y **reinicia el servidor**.
2. **Un servidor de desarrollo viejo puede quedar ocupando el puerto 3000** y responder con el
   cliente Prisma anterior. Si algo "no toma" los cambios del esquema, mata todos los procesos de
   Next antes de levantar otro.

Tras tocar `pucComercial.json` o `pucEsal.json` hay que **llevar el cambio a la BD**. Si solo se
agregaron cuentas —el caso normal— basta `createMany({ skipDuplicates: true })` sobre los dos
JSON **sin** el `deleteMany`; el `?force=1` es para reemplazos.

---

## 5. Principios que conviene no romper

Salieron de las revisiones contables y cada uno costó un hallazgo:

1. **Lo que no se puede calcular, se AVISA.** Nunca se rellena con un valor verosímil. Aplica al
   SMLMV, a los plazos de exógena, a las columnas que van en cero y a los conceptos que el sistema
   no puede originar.
2. **Un campo que no tiene formulario es un campo muerto.** Pasó tres veces: `precioUnitario` del
   borrador, los campos DIAN de `Cliente` y los de `Empleado`. Si se agrega una columna, o se
   captura o no se agrega.
3. **Los documentos fiscales no se borran.** Y los terceros de los que cuelgan, tampoco: se
   inactivan. Borrar un cliente dejaba sus facturas fuera del reporte **en silencio**.
4. **Comparar un solo total no detecta nada.** Un cambio de gravado a excluido con el precio
   compensado da el mismo total y mueve todo el IVA del periodo.
5. **Una identidad por documento.** La DIAN cruza formatos entre sí; dos fichas del mismo NIT es
   un cruce que no cuadra.
6. **CLAUDE.md se actualiza en el mismo cambio que lo vuelve obsoleto.** Es lo único que se lee al
   arrancar: una línea vieja ahí no es un comentario desactualizado, es una instrucción falsa.
