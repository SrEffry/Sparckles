# CLAUDE.md

Guía para trabajar en este repositorio. Léela antes de tocar código.

> ⚠️ **Next.js 16**: trae breaking changes respecto a versiones anteriores — APIs, convenciones
> y estructura de archivos pueden diferir de lo que asumas. Consulta los docs incluidos en
> `node_modules/next/dist/docs/` antes de dar por buena una API, y atiende los avisos de
> obsolescencia.

## Qué es

**Sparkles** es una aplicación web **full-stack de contabilidad y gestión tributaria (Colombia)**:
**Next.js 16 (App Router, JSX) + PostgreSQL (Prisma 7)**. Un solo proyecto, en la raíz del repo.

> El sitio estático original (HTML/CSS/JS vanilla con `localStorage`) **fue migrado por completo y
> eliminado** del repo para evitar duplicados. Si necesitas consultarlo, está en el historial de
> git (commit `717bd75` y anteriores).

### Directivas del cliente (IMPORTANTE — esto va a producción legal)
Esta app **saldrá a funcionar legalmente**; no es un prototipo ni se deja a medias. Estándar
profesional y de largo plazo en cada tarea:
1. **Cada módulo va COMPLETO**: UI + endpoints + validación de servidor + persistencia real en BD.
2. **Base de datos: PostgreSQL** (Prisma), con esquema global del dominio.
3. **El diseño importa** (ver paleta abajo).
4. Si una petición parece errónea o irreal, **decirlo** en vez de ejecutarla a ciegas.

## Cómo ejecutar

```bash
npm install
cp .env.example .env    # y rellenar DATABASE_URL + JWT_SECRET
npx prisma migrate dev  # aplica las migraciones y genera el cliente
npm run dev             # http://localhost:3000
```
Luego, **cargar el catálogo PUC una vez**: `POST /api/puc/seed` (autenticado; idempotente).

## Base de datos

**PostgreSQL local**, con **base y rol dedicados** (el rol NO es superusuario). Para crearlos desde
cero, como superusuario `postgres`:

```sql
CREATE ROLE sparkles WITH LOGIN CREATEDB PASSWORD '<contraseña>';
CREATE DATABASE sparkles OWNER sparkles;
```

El `CREATEDB` es **solo para desarrollo**: `prisma migrate dev` crea una *shadow database* temporal
para detectar cambios manuales en el esquema. En producción se despliega con `prisma migrate deploy`,
que no la necesita → **allí el rol va sin `CREATEDB`**.

**Migraciones, no `db push`.** El historial vive en `prisma/migrations/` y **se versiona**. Todo
cambio de esquema se hace con `prisma migrate dev --name <cambio>`; en producción,
`prisma migrate deploy`. `db push` queda fuera salvo experimentos desechables: pisa el esquema sin
dejar historial, y con datos fiscales reales eso no es aceptable.

**Prisma 7:** la URL va en `prisma.config.ts` (CLI) y en `DATABASE_URL` del `.env` (runtime); el
`PrismaClient` recibe un **driver adapter** (`@prisma/adapter-pg`), no la url. El cliente se genera
en `lib/generated/prisma/` (ignorado por git — correr `prisma generate` tras clonar, o dejar que
`migrate dev` lo dispare).

⚠️ **Para producción**: Postgres gestionado (backups + TLS), rol **sin `CREATEDB`**, `JWT_SECRET`
**distinto** al de desarrollo, y las credenciales en un gestor de secretos, no en un `.env` en disco.

## Estructura

```
/
├── app/
│   ├── (auth)/            # login, registro (layout de 2 paneles con logo + ilustración)
│   ├── (panel)/           # panel: layout compartido (Sidebar + guardia de sesión UNA vez)
│   │   ├── dashboard/ empresas/ clientes/ productos/ facturacion/ notas/
│   │   ├── compras/ documentos-soportes/ comprobantes/ certificados-retencion/
│   │   ├── notas-contabilidad/ libro-diario/ nomina/ recursos/
│   │   ├── operaciones/ finanzas/ contabilidad/ configuracion/   # hubs
│   │   └── hubs.module.css                         # CSS compartido de los hubs
│   ├── api/               # endpoints (route handlers)
│   ├── globals.css        # tokens de diseño + clases compartidas
│   └── layout.js
├── components/            # Sidebar, EmpresaWizard
├── lib/                   # auth, session, prisma, *Validation, *Api, calc, data/, pdf/
├── prisma/schema.prisma
├── public/img/            # Logo.png, nina.png, fondo1.png, Fondo.png
├── docs/                  # modelo-datos.md, migracion-nextjs.md (histórico)
└── PUC.md, catalogo.md    # fuentes originales del PUC (comercial / ESAL)
```

## Diseño (paleta real de la marca)
- **Marca: `#801931` (vino/burdeos)**; degradado `linear-gradient(135deg,#801931,#a02244)`.
  (El verde `#2d7a4b` es SOLO estado de éxito, **no** es la marca.)
- Fondo `#f5f5f7`, superficie `#fff`, texto `#1d1d1f`, suave `#86868b`, bordes `#e0e0e0`.
- Estados: éxito `#2d7a4b`, error `#d32f2f`, info `#1976d2`, warning `#ff8f00`.
- Fuente: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`.
- Tokens en `app/globals.css` (`--primary`, `--primary-gradient`, `--primary-tint`, …).

## Navegación (IA)
El **Sidebar solo lleva hubs de nivel 1**; los submódulos viven **dentro** de cada hub (no en el
sidebar). Definido en `components/Sidebar.jsx` (`NAV`, con `rutas[]` para marcar el hub activo
también en sus submódulos):

| Hub | Submódulos (dentro del hub) |
|---|---|
| **Inicio** (`/dashboard`) | KPIs + accesos rápidos |
| **Empresas** | — |
| **Operaciones** | Nueva factura (borrador), Facturas (pestañas Borradores / Historial fiscal), Notas D/C, Compras, Config. Facturación |
| **Finanzas** | Comprobantes de ingreso/egreso, Documentos soporte, Certificados de retención (tabs Tesorería/Impuestos) |
| **Contabilidad** | Notas de contabilidad, Libro diario, Mapa de cuentas |
| **Recursos** | Nómina |
| **Configuración** | Clientes, **Terceros**, Mis productos, Config. Facturación, Empresas |
| **Reportes** | Preparación para exógena (diagnóstico de datos + calendario de plazos) |

**Operaciones vs. Contabilidad**: en Operaciones se *opera* (los documentos que originan el
movimiento); en Contabilidad se sostienen los *libros*. Por eso los asientos se movieron.

## Arquitectura de datos

**Alcance: TODO se liga a un Usuario** (`usuarioId`). Cada usuario tiene sus propias empresas,
clientes, productos, facturas, etc. Nada es global salvo el catálogo PUC. (Confirmado por el cliente.)

Modelos: `Usuario, Empresa, Cliente, Producto, ConfigFacturacion, Factura(+Item), BorradorFactura, Nota(+Item),
Compra(+Item), DocumentoSoporte, Asiento(+Movimiento), Empleado, Nomina, CuentaPUC,
MapaCuentas, CuentaTesoreria, ComprobanteTesoreria(+Aplicacion/Retencion), ConsecutivoDocumento, Tercero,
RetencionPracticada, CertificadoRetencion, NotaContabilidad(+Movimiento), Impuesto`.
Mapeo detallado del dominio: [`docs/modelo-datos.md`](docs/modelo-datos.md).

### PUC (catálogo global, `CuentaPUC`)
Dos sectores **separados** (varias cuentas difieren): `comercial` (marco **NIIF/IFRS**, 434 cuentas
con auxiliares de 8 dígitos; reemplazó al Decreto 2650 por decisión del cliente — Ley 1314/2009) y
`esal` (sin ánimo de lucro, marco **NIIF para Pymes**, 439 cuentas — modelo de referencia sobre la
Orientación Técnica 014 del CTCP; revisado por el agente `contador-tributario` antes de cargar).
Cargado desde `lib/data/pucComercial.json` (generado de `PUC_NIIF_Auxiliares.md`) y `pucEsal.json`
(generado de `Catalogo_Cuentas_ESAL_NIIF.md`). Seed: `POST /api/puc/seed`
(`?force=1` recarga — **obligatorio tras tocar cualquiera de los dos JSON**, ver más abajo).
El catálogo Decreto 2650 anterior sigue en git (commit `ee203f0`).
Búsqueda: `GET /api/puc?sector=&q=&imputables=1`.

## Convenciones para agregar/tocar un módulo
- Ruta: `app/(panel)/<modulo>/page.js` (`"use client"`), CSS module propio, paleta de arriba.
- **Trío por módulo**: `lib/<x>Validation.js` (servidor) + `app/api/<x>/route.js` (+ `[id]`) +
  `lib/<x>Api.js` (cliente). Los componentes **solo** hablan con `lib/<x>Api.js`.
- **El servidor es autoritativo**: nunca confiar en montos/cálculos del cliente; recalcular en
  el endpoint (ver `lib/facturaCalc.js`, `lib/nominaCalc.js`, `lib/compraValidation.js`).
- Todo endpoint valida sesión (`obtenerSesion`) y **filtra por `usuarioId`**.
- Dinero en `Decimal(18,2)`; nunca float.
- **Documentos fiscales son anulables, NO borrables** (facturas, soportes → `PATCH
  {accion:'anular'}`). Compras/notas sí se pueden editar/eliminar (notas revierten el saldo) —
  pero su **asiento no se borra**: se le suma el contraasiento. Los asientos no se anulan por
  su cuenta; se corrige el documento que los originó.
- Numeración de documentos: **consecutivo en transacción** + `@@unique` como red de seguridad.
- Si el módulo es submódulo, enlázalo desde su **hub**, no desde el Sidebar.
- **Este archivo se actualiza en el MISMO cambio que lo vuelve obsoleto**, no después. Es lo
  único que se lee al arrancar: una línea vieja aquí no es un comentario desactualizado, es una
  instrucción falsa que dirige mal el trabajo siguiente. Si el cambio agrega un paso operativo
  (recargar el PUC, correr una migración), ese paso va aquí, no solo en la conversación.

## Revisión contable/tributaria (obligatoria por módulo)

Existe un subagente especializado: **`contador-tributario`**
([`.claude/agents/contador-tributario.md`](.claude/agents/contador-tributario.md)) — contador
público senior colombiano que revisa que cada módulo cumpla la normativa (E.T., DIAN, PUC) y la
práctica real.

**Regla acordada con el cliente:** todo módulo nuevo o cambio con impacto fiscal/contable se pasa
por este agente **antes de darlo por terminado**. Invocarlo con el Agent tool
(`subagent_type: contador-tributario`), pasándole qué módulo revisar.

Devuelve un veredicto (CUMPLE / CUMPLE CON OBSERVACIONES / NO CUMPLE) y hallazgos clasificados en
🔴 Bloqueante legal · 🟠 Riesgo · 🟡 Mejora · ✅ Correcto, con norma aplicable y ejemplo numérico.

> ⚠️ Es una **primera línea de revisión, no reemplaza a un contador público humano** ni garantiza
> cumplimiento normativo. Los valores que cambian por año (UVT, tarifas, salario mínimo) deben
> confirmarse contra la norma vigente.

## Reglas de negocio clave (ya implementadas)
- **ReteFuente automática en factura**: aplica solo si el producto tiene retención **Y** el cliente
  es agente retenedor **Y** NO es autorretenedor (Art. 368-2 E.T.).
  - La **base mínima se evalúa por CONCEPTO** (suma de todas las líneas de ese concepto en el
    documento), no por renglón: la retención se practica sobre el pago por concepto. Dentro del
    concepto, **cada tarifa liquida sobre su propia base** y el valor se prorratea a las líneas
    (el remanente de centavos va a la última, así la suma cuadra exacta).
  - Un **concepto desconocido falla cerrado** (nunca se asume base mínima 0 = "siempre retiene").
    `productoValidation` valida el concepto contra la tabla y **fuerza la tarifa oficial** (la
    tarifa es un atributo de la norma, no un dato del usuario).
- **IVA según el emisor**: si `ConfigFacturacion.responsableIva` es false, la factura se liquida
  con **IVA 0** aunque el producto tenga tarifa. `calcularFactura` **exige** el parámetro (sin
  default) para que la vista previa nunca muestre un total distinto al que se emite.
- **TODA factura nace como BORRADOR** (`BorradorFactura`, tabla aparte). Ciclo
  `borrador → revisado → emitido`; emitir es siempre un acto deliberado y aparte.
  - **Tabla aparte, no un estado más de `Factura`.** Media aplicación consulta `facturas` dando
    por hecho que toda fila es un documento fiscal: `api/contabilizar` recorre
    `estado != 'anulada'` —un borrador habría acabado en el **libro diario**—, `api/resumen`
    cuenta sin filtrar estado, `comprobantes/pendientes` lo habría mostrado como cartera e
    `importExport/registro` lo habría exportado. Con la tabla aparte, esos cuatro sitios no
    cambian.
  - **Un borrador es el INSUMO guardado, no una factura a medias.** No guarda totales, ni
    número, ni snapshots: guardar aritmética sería guardar cifras que envejecen. **Todo se
    recalcula al emitir**, con las tarifas y la configuración de ese momento. Por eso `items`
    va en JSON y no en tabla hija (`FacturaItem` tiene columnas calculadas).
  - **No consume consecutivo DIAN.** Un borrador abandonado que hubiera tomado número dejaría
    un hueco en la numeración autorizada (art. 617 E.T.). El número se asigna al emitir.
  - **Se valida distinto**: un borrador puede estar INCOMPLETO (se guarda; lo que falta se
    reporta con `pendientesParaEmitir` como tarea, no como error) pero no MAL FORMADO
    (cantidad negativa, descuento del 400% → se rechaza). Lo fiscal se valida al emitir.
  - **El paso de revisión congela la HUELLA COMPLETA de la liquidación** (`huellaRevisada`,
    `COMPONENTES_HUELLA` en `lib/emitirFactura.js`): subtotal, cada base por tratamiento de IVA,
    IVA, INC, cada retención y los totales. Al emitir se recalcula y se compara **campo a campo
    con igualdad exacta**; si algo difiere, **no emite**, devuelve el borrador a `borrador` y
    dice qué cambió.
    - ⚠️ **Comparar solo el total NO sirve, y ya se probó que no**: pasar un producto de gravado
      a excluido subiéndole el precio da el **mismo total a cobrar** y mueve todo el IVA del
      periodo. Probado con el escenario real: diferencia de **$0,00** en el total y **$190.000**
      de IVA generado que desaparecen. Sin tolerancia numérica: todo pasa por `r2()` y se guarda
      en `Decimal(18,2)`, así que no hay deriva que absorber y una holgura solo dejaría pasar
      cambios reales.
    - El callback `alEmitir` recibe `(tx, factura, calc)`: hay que comparar contra **`calc`**,
      no contra la fila `Factura`, porque los nombres difieren (`totalIva` vs `iva`,
      `totalRetenciones` vs `retenciones`).
    - ⚠️ **No es segregación de funciones**: no hay multiusuario, quien revisa y quien emite son
      la misma cuenta. Es autocontrol.
  - **La fecha NO se arrastra del borrador**: al emitir es `hoyBogota()` salvo que se indique
    otra. Un borrador de enero emitido en febrero no puede antedatar el documento. El campo de
    la pantalla se llama **"Fecha prevista de la operación"**, no "de emisión", y el diálogo de
    confirmación dice con qué fecha va a salir: llamarla de emisión hacía creer que se estaba
    fechando el documento.
  - **El borrador NO guarda precio de línea.** El precio sale siempre del catálogo al emitir
    (`facturaCalc.js` lee `producto.precioVenta`). Aceptarlo prometía un "precio pactado" que el
    sistema no honra. Si algún día se quiere de verdad, se implementa en `calcularFactura`
    primero.
  - Un borrador **se borra de verdad** (no es documento fiscal, no le aplica el art. 617). El ya
    emitido queda **archivado y enlazado** a su factura: inmutable y no borrable, es el rastro
    de origen.
- **Un solo camino de emisión: `lib/emitirFactura.js`.** Ahí viven el consecutivo atómico, el
  rango, la vigencia y el recálculo. Entran por él `POST /api/facturas` (emisión directa por
  API) y `POST /api/facturas/borradores/[id]/emitir`. **Nunca duplicar esos guardas**: la copia
  se desactualiza y el día que se corrija uno, el otro sigue emitiendo con resolución vencida.
  - El borrador se marca como emitido **dentro de la misma transacción** que crea la factura
    (callback `alEmitir`), con `updateMany ... WHERE estado='revisado'` como compare-and-set.
    Fuera de la transacción, un fallo entre ambas dejaría un consecutivo quemado y un borrador
    todavía emitible: dos clics, dos facturas de la misma venta.
- **Numeración de facturas**: lee+incrementa `numeracionActual` de `ConfigFacturacion` dentro de
  `prisma.$transaction`. El **prefijo no se inventa**: si la resolución no tiene prefijo, el número
  va sin él.
- **Vigencia de la resolución**: la fecha de emisión debe caer entre `resFecha` y `resVencimiento`;
  ambas son **NOT NULL en la BD** (regla fiscal sostenida por la BD, no por convención) y el
  endpoint **falla cerrado** si faltaran. No se admiten fechas futuras ni inexistentes.
- **Fechas en hora de Colombia** (`lib/fechas.js` → `hoyBogota()`): `toISOString()` usa UTC y
  Bogotá es UTC-5; después de las 19:00 fecharía los documentos al día siguiente.
- **Notas D/C**: motivos DIAN (Anexo 1.9), consecutivo `NC-/ND-`, afectan `saldoAplicadoNC/ND` de
  la factura y **revierten** al eliminarse.
- **El libro diario es de SOLO LECTURA.** Un asiento es la *consecuencia* de un documento
  (factura, compra, comprobante de tesorería, nota de contabilidad), nunca el documento en sí:
  sin soporte le falta el origen y la justificación que exige el art. 124 del D. 2649.
  `POST /api/asientos` y `PUT/PATCH /api/asientos/[id]` responden **410**. Un error se corrige
  reversando el documento que lo originó, que emite el contraasiento — el art. 125 no admite
  huecos en la numeración.
- **TODA operación genera asiento** (`lib/asientoAutomatico.js`): factura, nota D/C, compra,
  documento soporte y nómina, además de los comprobantes de tesorería y las notas contables.
  Un tipo nuevo se agrega ahí y en `app/api/contabilizar/route.js`, en ningún otro sitio.
  - Si al **mapa de cuentas** le falta una cuenta, el documento **se emite igual** con
    `asientoId: null` y aparece en Contabilidad como *pendiente por contabilizar*, con el
    nombre de la cuenta que falta. Bloquear la emisión por una tarea de configuración pararía
    el negocio; dejar el hueco en silencio es lo que este diseño evita.
  - `POST /api/contabilizar` contabiliza lo que el mapa ya permita —no es todo o nada— y hace
    también de **backfill** de los documentos anteriores.
  - Corregir **no borra del libro**: anular o eliminar emite el **contraasiento fechado hoy**.
    Editar una compra deja tres líneas (original, contraasiento, versión vigente). El número
    del asiento es la referencia del documento (`CP-FP-450`) y toma sufijo si ya está tomado.
- **Comprobantes de tesorería: DOS MODOS.**
  - *Aplicación*: cancela el saldo de un documento previo (factura o compra). La contrapartida
    la pone el sistema.
  - *Imputación*: sin documento previo — nómina, impuestos, servicios, caja menor, anticipos,
    préstamos, aportes. El usuario elige un **concepto de una lista cerrada**
    (`lib/conceptosComprobante.js`) y el concepto trae su cuenta del mapa. **Nunca se acepta un
    código PUC del cliente**: eso sería el asiento manual que se cerró a propósito. Cartera y
    proveedores quedan fuera del modo imputación, y un GASTO exige la referencia de la factura
    o del documento soporte (Art. 771-2 E.T.).
- **Legalizar un egreso con documento soporte** (`lib/soporteDesdeComprobante.js`): desde un
  egreso emitido se CREA un documento soporte; el comprobante no se transforma, sigue siendo la
  prueba del pago. Reglas que no se pueden relajar:
  - **Una sola línea vinculante por operación**, la del hecho que ocurrió primero. El soporte
    generado desde un pago va `vinculante: false` — si no, el certificado del Art. 381 le
    certifica al proveedor el doble de lo que se le retuvo.
  - **La contrapartida es *anticipos por legalizar* (1330)**, no proveedores: la plata ya salió,
    el soporte cancela un anticipo. Con proveedores esa cuenta queda en saldo débito.
  - **Orden de deshacer: LIFO documental.** Nada se anula mientras exista vivo algo creado
    después que se apoye en ello. Un soporte normal se paga después, así que primero se reversa
    el pago; uno generado desde un pago se anula primero.
  - La **fecha es la de la operación**, no la del pago (art. 1.6.1.4.12 del DUT 1625).
- **Saldos de apertura**: el tipo de ajuste `apertura` es el ÚNICO que levanta el blindaje de
  cartera/proveedores/tesorería, y solo se admite **uno por ejercicio**. Sin él, el sistema no
  se podía estrenar con una empresa en marcha. Ojo: cargar cartera ahí **no** crea las facturas
  pendientes de cobro.
- **El mapa de cuentas valida la CLASE, no solo que la cuenta exista**
  (`CLASES_ESPERADAS` en `lib/data/mapaCuentasDefecto.js`). Antes bastaba que el código
  existiera y fuera imputable, y se podía mapear "Gastos generales" a una cuenta de **ingresos**
  sin un solo error: cada documento soporte debitaba la 4135 y el estado de resultados salía
  mal por los dos lados. Se valida **solo el primer dígito**; el auxiliar dentro de la clase lo
  elige el usuario, que ahí manda su plan de cuentas y no el software.
- **Huecos del catálogo PUC, ya cerrados**: en **comercial** se agregaron 5135 servicios,
  **5195 diversos** (`519505` gastos generales, `519530` ajuste al peso), `530530` GMF y
  `530535` descuento por pronto pago. En **ESAL** se agregó `519530 Ajuste al peso` y se
  enchufaron cuentas que ya existían y estaban sin sugerir —entre ellas **`2205` proveedores,
  que es campo MÍNIMO**: sin él una ESAL no podía contabilizar ni una compra.
  > ⚠️ **Tocar los JSON del PUC no basta: hay que llevar el cambio a la BD.** El seed normal
  > (`POST /api/puc/seed`) no hace **nada** si ya hay cuentas, y mientras tanto las sugerencias
  > nuevas apuntan a códigos inexistentes y el mapa las rechaza.
  >
  > **Si solo se AGREGARON cuentas —el caso normal—, `?force=1` es la herramienta equivocada**:
  > borra el catálogo entero para reinsertarlo. Basta el `createMany({ skipDuplicates: true })`
  > sobre los dos JSON **sin el `deleteMany`**: el `@@unique([sector, codigo])` deja entrar solo
  > lo que falta, es idempotente y se puede repetir sin miedo. Así se cargó `esal/519530`
  > (872 → 873 cuentas, 1 insertada).
  >
  > `?force=1` queda para cuando una cuenta **cambió de nombre, de clase o de imputabilidad**,
  > o hay que eliminar alguna. Es seguro en cuanto a datos —`CuentaPUC` no tiene FKs entrantes y
  > `MapaCuentas` guarda **códigos como texto**, así que ningún mapa configurado se pierde—,
  > pero sigue siendo un borrado innecesario si solo se agregó.
  >
  > Ojo con el `id`: es `cuid()` **de Prisma, sin default en la BD**. Un `INSERT` en SQL crudo
  > tiene que generarlo a mano; por eso conviene hacerlo con el cliente Prisma.
- **Lo que queda sin sugerir es a propósito**, y por dos razones distintas:
  - *La cuenta solo existe agregada*: en ESAL los aportes patronales (`510540` seguridad social,
    `2335` parafiscales no imputable) — repetirlas sería contabilizar la ARL bajo el nombre de
    otra cuenta.
  - *Elegir sería adivinar el modelo de negocio*: `ingresosVentas` en ESAL (el catálogo separa
    4125 prestación de servicios de 4130 venta de bienes) y `aportesSociales` (3105 fondo social
    / 3110 fundadores / 3115 asociados, lo dicen los estatutos).
  En ambos casos el campo aparece **como pendiente y a la vista**, que es preferible a acertar
  la mitad de las veces. En ESAL `ivaGenerado` e `ivaDescontable` van los **dos a la `2410`**:
  el catálogo la trae agregada y es el modelo clásico de la 2408, donde el IVA por pagar es la
  cuenta neta.
- **Nota de contabilidad** (`CC-`, no `NC-`, que ya lo usa la nota crédito): el comprobante de
  los *ajustes* sin documento propio. Lleva **periodo contable afectado** y **tipo de ajuste**;
  ciclo borrador → emitido → reversado. **No sirve** para ventas, compras, recaudos, pagos ni
  nómina: eso tiene módulo propio, y es el mal uso más común.
- **Cuentas blindadas**: una nota NO puede mover cartera, proveedores, anticipos ni tesorería
  (`lib/notaContabilidadValidation.js`). Esos saldos los materializan otros módulos; moverlos a
  mano desincroniza el libro contra los pendientes por cobrar sin que nada avise.
- **Retenciones practicadas**: todo documento que retenga escribe en `RetencionPracticada`, en
  su misma transacción. `MapaCuentas.retencionesEnCausacion` decide cuál fila es `vinculante`
  —la de la causación o la del pago—; **las dos ramas deben cablearse** o el certificado cuenta
  el doble. El concepto es obligatorio y su tarifa la **impone la norma**, no el usuario.
- **Certificado de retención** (Art. 381 E.T.): ReteFuente anual, **ReteIVA por periodo
  gravable** del art. 600 (nunca anual), ReteICA **por municipio**. Los pagos laborales se
  excluyen: van por el Formulario 220 (Arts. 378-379). No expedir cuesta el **5% de los pagos**
  (Art. 667), así que la pantalla avisa del plazo antes de que se venza.
- **Nómina — el costo laboral NO es el salario.** El asiento lleva los tres bloques: devengo del
  trabajador, aportes del **empleador** (salud, pensión, ARL, parafiscales) y **prestaciones**
  (cesantías, intereses, prima, vacaciones), cada componente a **su propia cuenta** de gasto y de
  pasivo. Sobre un salario de $2.000.000 el costo real es ~$3.037.000 (+52%).
  - **Las bases no son la misma**: aportes = salario + extras + recargos + comisiones (el auxilio
    de transporte **NO** cotiza, art. 128 CST); prestacional = lo anterior **más** el auxilio
    (art. 7 Ley 1ª/1963); **vacaciones = SIN auxilio y SIN horas extra** (art. 192 num. 2 CST).
    Por eso `extras` y `recargos` son campos **distintos**: los dos cotizan, solo uno va a
    vacaciones.
  - **IBC con piso (1 SMLMV) y techo (25)** para salud, pensión, **ARL** y FSP (art. 18 Ley 100;
    art. 5 D. 1772/1994 para la ARL). Los **parafiscales NO comparten el tope**: van sobre la
    nómina completa.
  - **Los umbrales se miden sobre lo DEVENGADO del mes** —no sobre el salario del contrato— y
    **mensualizado**: en un mes incompleto se compara `valor × 30/días`, porque si no, alguien
    que entra el día 16 cae en el tramo equivocado y se deja de liquidar lo que sí se debe. La
    exoneración del art. 114-1 (<10 SMLMV) cubre salud, SENA e ICBF; **caja y pensión se pagan
    siempre**. El **FSP es escalonado** (`TRAMOS_FSP`): 1% desde 4 SMLMV y hasta 2% sobre 20.
  - **Todo se redondea en el ORIGEN**, no al presentarlo: si cada total se redondea por su
    cuenta, el asiento descuadra por céntimos y la nómina se queda fuera del libro sin que falte
    ninguna cuenta. Los factores prestacionales van exactos (**1/12**, **1/24**), no truncados.
  - **Intereses sobre cesantías = 12% de las cesantías del mes**, sin volver a prorratear: las
    cesantías ya vienen prorrateadas por los días.
  - **Periodo `AAAA-MM` obligatorio**, con **índice único PARCIAL** (`WHERE estado <> 'Anulada'`,
    SQL crudo en su migración: Prisma no expresa índices parciales). La nómina se **causa en su
    periodo**, no el día en que se digita. **Anulada es terminal** —no se reactiva, su asiento ya
    fue reversado— y anularla libera el mes sin mutar el documento.
  - **Un empleado con nóminas no se borra** (art. 28 Ley 962/2005): se marca inactivo. Borrarlo
    dejaría `empleadoId` en null y, como los NULL no chocan en Postgres, desactivaría de paso la
    unicidad del periodo.
  - **El auxilio de transporte va a su propia cuenta de gasto**: no es salario y la nómina
    electrónica lo exige identificado.
  - **Prestación de servicios NO se liquida por nómina** (no hay relación laboral): se registra
    como compra o documento soporte, con retención por honorarios o servicios.
  - El **mes laboral son 30 días** para todo efecto salarial y prestacional, también en los de 31.
  - Los valores que cambian por decreto (**SMLMV y auxilio de transporte**) viven en
    `lib/data/parametrosNomina.js` con su norma; **no se inventan**. 2026: $1.750.905 / $249.095
    (**Decreto 0159 del 19-feb-2026**, transitorio: el Decreto 1469 sigue suspendido por el
    Consejo de Estado y la cifra puede cambiar con la sentencia. El auxilio va por el D. 1470).
  - **No hace**: PILA, nómina electrónica (Res. DIAN 000013/2021), retención por rentas de trabajo
    (art. 383 E.T.), salario integral, incapacidades, licencias ni la cotización por semanas de la
    jornada parcial (D. 2616/2013). Lo que **no se liquida se AVISA**: la retefuente cuando la base
    depurada pasa de 95 UVT, el salario bajo el mínimo, el mes incompleto con exoneración y los
    parámetros de un año no cargado. Los avisos llegan al cliente y se muestran en un modal.
- **Documento soporte**: ReteFuente en % (÷100) y **ReteICA por mil ‰ (÷1000)**.
  - **Lo expide el ADQUIRENTE (nosotros)**, no el vendedor: por eso lleva `emisorSnapshot`
    congelado al emitir, igual que factura y comprobante — el impreso de un documento de hace
    dos años no puede depender de la `ConfigFacturacion` de hoy (Res. DIAN 000167/2021).
  - **Impreso** en `lib/pdf/soportePdf.js` (A5). Lleva la **denominación literal** que exige la
    resolución —es un requisito, no un título—, separa la **fecha de la operación** de la del
    pago, y saca las retenciones de `RetencionPracticada` (ahí están el concepto y el municipio
    que después arman el certificado del Art. 381), no de los porcentajes del documento.
    Un soporte generado desde un egreso lo **dice en el impreso**: legaliza un pago ya hecho y
    la retención la certifica ese comprobante, no este papel.
  - El detalle para imprimir se pide a `GET /api/soportes/[id]`, que devuelve
    `{soporte, asiento, comprobanteOrigen, emisor}`. La lista no trae nada de eso.
- **Hubs**: agregados reales vía `GET /api/resumen` (IVA generado/descontable, IVA por pagar, etc.).

## Información exógena (Reportes) — en construcción

Res. DIAN **000227 del 23-sep-2025** (Resolución Única), modificada por las **000233/2025**,
**000237/2025**, **000012/2026** y **000021/2026**. Sanción por no presentar, presentar con
errores o extemporáneamente: **art. 651 E.T.**

> ⚠️ **El objetivo es el AG 2026, que se presenta entre abril y junio de 2027.** Los plazos del
> AG 2025 vencieron el 12-jun-2026. Construir "para 2025" es construir para un reporte vencido.

**Fuente de los layouts**: `public/Formato Exógena 2025 Formatos informantes basicos.xlsx`
(22 hojas, una por formato, con encabezados, conceptos y códigos). Es material de **un tercero**
(Wiliam Dussán Salazar), **no la norma**: sirve de mapa, la fuente son los anexos técnicos DIAN.
Dos trampas ya detectadas en él: el **"V2" NO es la versión del formato** (el 1001 del AG 2025 es
**versión 11**, y una versión errada hace rechazar el archivo), y su **calendario de grandes
contribuyentes está desactualizado** (la Res. 000012/2026 movió los NIT en 1, 2 y 3 al 14, 15 y
19 de mayo).

- **Códigos DANE**: `lib/data/dane.json` (33 departamentos, **1.122 municipios** con código de 5
  dígitos, 248 países con código DIAN; Colombia = **169**), extraído del `.xlsx` con
  `scripts/extraer_dane.py` y accedido por `lib/data/dane.js`. **No confundir con
  `lib/data/colombia.json`**, que son 2 KB de nombres sin códigos y con ~4-9 municipios por
  departamento: no sirve para exógena.
  - `resolverMunicipio(nombre, depto?)` devuelve `null` **también cuando hay ambigüedad**: hay
    **68 nombres de municipio repetidos** en el país (Sabanalarga está en Antioquia, Atlántico y
    Casanare). Adivinar sería peor que dejarlo pendiente.
  - La partición del código de 5 en depto(2) + mcp(3) está centralizada en
    `partirCodigoMunicipio` y **falta confirmarla contra el anexo técnico**.
- **Tipos de documento DIAN**: `lib/data/tiposDocumentoDian.js` (11, 12, 13, 21, 22, 31, 41, 42,
  43, 47, 48). `codigoDianDesdeTexto()` traduce lo ya guardado ("CC" → "13") y devuelve `null`
  si no reconoce, para migrar sin adivinar. El **NIT 222222222 con tipo 43** es el de las
  cuantías menores, no un tercero real.
- **Campos de exógena en `Cliente`**, todos **nullable a propósito**: un dato que solo hace falta
  en abril no puede impedir crear un cliente hoy. Lo que falte se ve en el tablero de
  preparación, no bloquea el formulario.
  - ⚠️ Los cuatro campos de nombre (`primerApellido`, `segundoApellido`, `primerNombre`,
    `otrosNombres`) **se capturan, no se deducen** partiendo `nombreCompleto`. Un apellido mal
    partido es información **errónea**, que el art. 651 sanciona igual que la que falta.
- **`AsientoMovimiento.tercero` va NORMALIZADO** con `normalizarDocumento()`
  (`lib/asientoAutomatico.js`). Antes se guardaba crudo y `900123456`, `900.123.456` y
  `900123456-7` eran **tres terceros**. La exógena agrupa el año por tercero y la DIAN cruza el
  1001 del pagador contra el 1007 del receptor: un proveedor partido en tres es un cruce que no
  cuadra.

### `Tercero`: el registro de identidad
Los proveedores eran **texto suelto** dentro de cada `Compra` y `DocumentoSoporte`. Con eso, el
mismo proveedor escrito de dos formas eran dos terceros, y no había dónde guardar su tipo de
documento DIAN, su dirección ni sus códigos DANE. La ley no exige una tabla de terceros; **la
aritmética del reporte sí**.

- **Los snapshots de los documentos NO se tocan.** `Compra.proveedorNombre` y compañía siguen
  siendo la verdad de ESE documento —un documento fiscal debe poder reimprimirse como se
  emitió—. El `Tercero` es la identidad para **agrupar y reportar**, no un reemplazo.
- **Un solo camino para crearlos**: `resolverTercero()` en `lib/terceros.js`, llamado desde
  `POST /api/compras` y `POST /api/soportes` dentro de su transacción. Dos rutas normalizando a
  su manera es como se acaba con el mismo NIT en dos filas.
- **Sin documento NO se crea tercero** y el documento queda sin enlazar: dos "Ferretería El
  Tornillo" pueden ser dos empresas distintas, y un tercero mal fusionado es peor que uno
  suelto. Los sueltos salen listados en el tablero.
- `resolverTercero` **completa lo que falte pero no pisa lo que ya está**: quien editó la ficha
  sabe más que el snapshot tecleado de afán en una compra nueva.
- **Backfill**: `PATCH /api/terceros {accion:'consolidar'}` (`consolidarTerceros`). Idempotente
  —solo mira los `terceroId: null`—, así que se puede repetir. En la BD local creó **70 fichas**
  y enlazó 125 compras y 69 soportes; el único que quedó fuera fue uno sin documento.
- **Cambiar el documento cambia la identidad**: se permite (un NIT mal digitado hay que poder
  corregirlo) pero **no puede chocar** con otro tercero. Fusionar dos terceros **no está
  implementado** y el endpoint lo dice en vez de fingir.
- Un tercero **con documentos no se borra**: se desactiva. Borrarlo dejaría sus `terceroId` en
  null y volvería a partir la agrupación.
- **`Cliente` NO se fusionó aquí, a propósito.** Ya es una entidad y ya tiene los campos, y
  fusionarlo obligaría a tocar la emisión de facturas. Al reportar, un tercero que es cliente y
  proveedor a la vez se consolida por `documento` normalizado: es trabajo de la capa de
  reportes, no del modelo. **Queda pendiente** unificarlos.
- Los códigos de ubicación se **validan contra el catálogo** (`terceroValidation.js`): un
  municipio que no pertenece al departamento se rechaza. Un código inventado produce una columna
  que la DIAN rechaza, y ese error no se ve hasta que se presenta.

### Decisiones tomadas, para no rediscutirlas
- **El XML lo genera el PREVALIDADOR de la DIAN, no nosotros.** Sparkles produce el `.xlsx` con
  las columnas del layout. Son 15 esquemas que cambian cada año (este año, cuatro veces), y un
  XML mal versionado se rechaza y cuenta como no presentado. Mismo criterio que la facturación
  electrónica.
- **El 1001 NO se deriva de `RetencionPracticada`, se deriva del GASTO** (libro auxiliar por
  cuenta PUC y tercero). Un pago que no llega a la base mínima **no genera retención pero sí se
  reporta**: una compra de $400.000 no retiene y aun así supera las 3 UVT. Falta el mapa
  `cuenta PUC → concepto 1001` y un discriminante **activo fijo / movible** en `CompraItem`
  (5007 movibles vs. 5008 fijos).
- **1008 y 1009 son saldos a 31-dic y SÍ se pueden reconstruir sin migrar datos**, porque
  `Factura.fechaAnulacion` existe: `estado='emitida' OR (estado='anulada' AND fechaAnulacion >
  corte)`. La decisión de fechar la anulación resultó ser la que habilita el saldo histórico.
- **El 1056 NO aplica** a empresa privada ni a ESAL (es de entidades que manejan recursos del
  Tesoro). No construirlo.

### Fases
0. **Cimientos** ✅ — DANE · tipos de documento · campos en `Cliente` y `Empleado` · tercero
   normalizado en el asiento · **modelo `Tercero`** (ver abajo).
1. **Tablero de preparación** ✅ — `/reportes` (hub) y `/reportes/exogena`.
   `lib/exogenaPreparacion.js` + `GET /api/reportes/exogena/preparacion?anio=` +
   `lib/reportesApi.js`. NO genera reportes ni envía nada: por eso no puede costar una sanción.
   - Separa **`criticos`** (sin esto la fila del formato no se puede armar: documento, tipo,
     nombre) de **`faltantes`** (columnas que quedarían vacías). No es lo mismo "no tiene NIT"
     que "le falta el código de municipio".
   - Los **proveedores se DERIVAN** de `Compra` y `DocumentoSoporte` agrupando por documento
     normalizado, porque todavía no son una tabla. Eso es justo lo que destapa el problema caro:
     el mismo NIT con varias grafías o varios nombres.
   - Cuando el municipio escrito a mano se resuelve **sin ambigüedad**, se ofrece el código como
     sugerencia; si hay ambigüedad no se sugiere nada.
   - **Plazos en `lib/data/plazosExogena.js`**, con su norma y por año gravable. Un año sin
     resolución publicada devuelve `null` y la pantalla lo dice: **no se estiman fechas**, igual
     que con el SMLMV. Hoy solo está cargado el **AG 2025**; el AG 2026 se carga cuando salga.
   - ⚠️ En los plazos de **grandes contribuyentes**, los dígitos 1, 2 y 3 llevan la ampliación de
     la Res. 000012/2026; los dígitos 4 a 0 vienen de la tabla original y están **por confirmar**
     (cada fila lleva su `fuente`).
2. **1003, 1005, 1006, 1007** ✅ — `/reportes/formatos`, `lib/exogenaFormatos.js` +
   `GET /api/reportes/exogena/formato/[numero]?anio=&formato=json|xlsx`.
   - **Dos hojas, y el orden importa.** La primera lleva SOLO el layout (encabezado en la fila 1,
     datos debajo) para poder pegarla en el prevalidador; una fila de advertencia encima la
     volvería inservible justo para lo que existe. La segunda, **LÉEME**, lleva los avisos: van
     dentro del archivo porque el archivo viaja y la pantalla no.
   - **`ReteICA NO va en el 1003`** (`conceptosExogena.js`): es un tributo municipal, se declara
     ante el municipio y el formato no tiene concepto para ella. Las facturas que la tengan se
     cuentan y se avisan.
   - El concepto del 1003 sale de `Factura.retencionesPorConcepto` mapeando la **categoría**
     interna (`CATEGORIA_A_1003`). Lo que no tiene equivalente cae en **1308 "otros conceptos"**
     y se avisa, en vez de forzar una equivalencia falsa. "Venta de activos" **no** se manda al
     1311 automáticamente: ese concepto exige que el enajenante sea persona natural, y el
     sistema no lo sabe.
   - En el **1007**, la nota **crédito resta** y la **débito suma**: una ND aumenta el valor de
     la factura, no lo devuelve. (Probado: el extracto dio $3.000 más que la suma de facturas, y
     ese era exactamente el valor de la única ND del año.)
   - Columnas que van en CERO y se dicen: el IVA recuperado en devoluciones (1006), y el IVA por
     devoluciones y el mayor valor del costo del art. 490 (1005) — el sistema no distingue el IVA
     descontable del que va al costo.
   - Las compras **sin ficha de tercero quedan FUERA** del 1005 y el aviso lo dice con el conteo:
     hay que consolidar primero.
3. Motor de saldos a fecha de corte → **1008, 1009**.
4. **1001** — pendiente. **No se deriva de `RetencionPracticada`**: falta el mapa
   `cuenta PUC → concepto` y el discriminante activo fijo/movible en `CompraItem`. Sacarlo
   incompleto sería peor que no sacarlo (art. 651: la información errónea también se sanciona).
5. **Nunca sin decisión expresa**: XML directo, y los formatos 1004, 1010, 1011, 1012, 1647,
   2275 y 2276 completos (requieren modelos que no existen: socios, balance fiscal, cuentas
   bancarias con NIT del banco, y la retención por rentas de trabajo del art. 383 que nómina
   **no liquida**).

## Pendientes conocidos
- **Facturas**: retenciones fiscales manuales (ReteIVA/ReteICA modal) y medios de pago/instrumentos.
- **Facturación electrónica DIAN** (XML UBL, firma, CUFE, QR): track aparte, vía **proveedor
  tecnológico autorizado** — no construir el protocolo desde cero. Los PDF actuales
  (`lib/pdf/`) son **representación gráfica**, no el documento electrónico.
- **Reportes / información exógena**: en construcción por fases. Ver la sección propia abajo.
- `lib/data/ciiu.json` y `Ciuu.json` están preservados pero **aún sin usar** (actividad económica).
