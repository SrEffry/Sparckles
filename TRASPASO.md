# Traspaso — estado del trabajo y qué falta

> Se llama **TRASPASO** y no "migración" a propósito: en este repo `migración` significa
> `prisma/migrations/`, y confundir las dos cosas costaría un susto.

Documento de continuidad para quien retome el trabajo. Recoge lo que quedó hecho, **lo que falta**
y **los hallazgos de las revisiones contables que siguen abiertos**. `CLAUDE.md` es la guía del
repo y manda sobre esto; aquí solo está lo pendiente y el contexto que no cabe allá.

**Rama:** `feature` · **Última actualización:** 27 de agosto de 2026

---

## 1. Lo primero que hay que saber

### ⚠️ La última re-revisión contable NUNCA se completó

Se lanzó una re-revisión del módulo de exógena para verificar los arreglos del commit
`9dafdc2`, y **falló por límite de gasto de la cuenta antes de emitir ningún hallazgo**. No
devolvió veredicto. Alcanzó a leer `CLAUDE.md` y nada más.

**Esto significa que los arreglos del último commit están probados por mí contra la base de
datos, pero NO validados por el revisor contable.** Lo primero que hay que hacer al retomar es
volver a lanzarla. El encargo que se le dio, para repetirlo tal cual, pedía verificar:

- Si leer las retenciones de comprobantes **solo cuando `retencionesEnCausacion === false`** puede
  producir doble conteo u omisión en algún escenario.
- Si adivinar el tipo de documento por longitud (`>= 9 → 31`, si no `13`) en el 1003 desde
  comprobantes es aceptable o peligroso.
- Si `vigentesAlCorte` está bien planteada, y qué pasa con una factura anulada **dentro** del
  mismo año.
- Si `base * iva/100` por ítem es la forma correcta de separar el IVA de activos fijos del
  `totalIva` de la compra.
- Si las **cuantías menores** (NIT 222222222) aplican igual en 1003, 1005, 1006 y 1007, o hay
  formatos donde no.
- Si la columna J del 1005 contra el cliente es el tratamiento y la columna correctos.
- Si la unificación `Cliente` → `Tercero` deja algún hueco.
- Si ya se puede empezar la **fase 3**.

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

Estos dos vienen de la revisión del módulo de facturas y **nunca se cerraron**. Son los pendientes
más caros del repo.

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

#### b) Una factura con INC no llega al libro diario

`incPorPagar` está en `null` en **los dos sectores** (`lib/data/mapaCuentasDefecto.js:208, 266`) y
`movimientosDeFactura` acredita esa cuenta. Cuando falta, **se pierde el asiento completo** — no
solo la línea del INC. Un bar o un restaurante no registra **ni una sola venta**.

- **ESAL**: arreglo de una línea, la cuenta ya existe → `esal.incPorPagar = "2495"`.
- **Comercial**: **verificado que el catálogo NO tiene ninguna cuenta 249x**. Hay que agregarla al
  JSON (`2495` de agrupación + `249505 Impuesto nacional al consumo por pagar`) y **recargar**
  con `createMany({skipDuplicates:true})` sin `deleteMany`, como documenta `CLAUDE.md`.
- El INC **no puede colgar de la 2408**: inflaría el IVA generado y rompería la conciliación
  contra el Formulario 300.

### 3.2 🟠 Riesgos abiertos del módulo de facturas

| # | Qué | Dónde |
|---|---|---|
| 1 | **El PDF de la factura no muestra INC, ReteIVA ni ReteICA** — las partidas no suman al total impreso. Verificado: cero referencias en el archivo | `lib/pdf/facturaPdf.js` |
| 2 | **No existe "emisor autorretenedor"**: se le descuenta al total una retención que el cliente no va a practicar, y la cartera queda subestimada en cada factura | `ConfigFacturacion` + `facturaCalc.js` |
| 3 | `exoneradoParafiscales` implica **autorretención especial de renta** (D. 2201/2016) que no se liquida ni se avisa | facturación |
| 4 | `ivaGenerado`/`ivaDescontable` sugeridos apuntan a cuentas llamadas literalmente **"IVA Generado Ventas 19%"**, y ahí se acredita también el IVA del 5%. Existen `240805`/`240810`, imputables: **es cambiar dos líneas** | `mapaCuentasDefecto.js:206-207` |
| 5 | La **ReteICA se liquida sobre todo el subtotal** (incluye exento, excluido y no responsable) y no guarda el municipio; el tope admitido llega al 1000‰ | `facturaCalc.js:267` |
| 6 | `RANGO` **falla abierto** si `numeracionHasta` es null, al revés que `SIN_VIGENCIA`; y no se valida el borde inferior | `lib/emitirFactura.js` |
| 7 | `padStart(5,"0")` cablea el formato del consecutivo | `lib/emitirFactura.js` |
| 8 | Nada impide que la fecha de emisión **retroceda** respecto de la última factura | `lib/emitirFactura.js` |
| 9 | La tabla de retefuente tiene un campo `vigencia` que **nadie consulta**: una compra de junio de 2026 se liquidaría con las bases equivocadas | `tablaRetefuente.js` |
| 10 | Desalineación de índices en la vista previa por línea si un producto se eliminó del catálogo | `facturacion/nueva/page.js:425` |

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
