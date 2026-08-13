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
| **Operaciones** | Nueva factura, Facturas, Notas D/C, Compras, Config. Facturación |
| **Finanzas** | Comprobantes de ingreso/egreso, Documentos soporte, Certificados de retención (tabs Tesorería/Impuestos) |
| **Contabilidad** | Notas de contabilidad, Libro diario, Mapa de cuentas |
| **Recursos** | Nómina |
| **Configuración** | Clientes, Mis productos, Config. Facturación, Empresas |
| **Reportes** | `ready:false` — el cliente le dará un enfoque nuevo (no migrado a propósito) |

**Operaciones vs. Contabilidad**: en Operaciones se *opera* (los documentos que originan el
movimiento); en Contabilidad se sostienen los *libros*. Por eso los asientos se movieron.

## Arquitectura de datos

**Alcance: TODO se liga a un Usuario** (`usuarioId`). Cada usuario tiene sus propias empresas,
clientes, productos, facturas, etc. Nada es global salvo el catálogo PUC. (Confirmado por el cliente.)

Modelos: `Usuario, Empresa, Cliente, Producto, ConfigFacturacion, Factura(+Item), Nota(+Item),
Compra(+Item), DocumentoSoporte, Asiento(+Movimiento), Empleado, Nomina, CuentaPUC,
MapaCuentas, CuentaTesoreria, ComprobanteTesoreria(+Aplicacion/Retencion), ConsecutivoDocumento,
RetencionPracticada, CertificadoRetencion, NotaContabilidad(+Movimiento), Impuesto`.
Mapeo detallado del dominio: [`docs/modelo-datos.md`](docs/modelo-datos.md).

### PUC (catálogo global, `CuentaPUC`)
Dos sectores **separados** (varias cuentas difieren): `comercial` (marco **NIIF/IFRS**, 403 cuentas
con auxiliares de 8 dígitos; reemplazó al Decreto 2650 por decisión del cliente — Ley 1314/2009) y
`esal` (sin ánimo de lucro, marco **NIIF para Pymes**, 438 cuentas — modelo de referencia sobre la
Orientación Técnica 014 del CTCP; revisado por el agente `contador-tributario` antes de cargar).
Cargado desde `lib/data/pucComercial.json` (generado de `PUC_NIIF_Auxiliares.md`) y `pucEsal.json`
(generado de `Catalogo_Cuentas_ESAL_NIIF.md`). Seed: `POST /api/puc/seed`
(`?force=1` recarga). El catálogo Decreto 2650 anterior sigue en git (commit `ee203f0`).
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
- **Saldos de apertura**: el tipo de ajuste `apertura` es el ÚNICO que levanta el blindaje de
  cartera/proveedores/tesorería, y solo se admite **uno por ejercicio**. Sin él, el sistema no
  se podía estrenar con una empresa en marcha. Ojo: cargar cartera ahí **no** crea las facturas
  pendientes de cobro.
- ⚠️ **El catálogo PUC cargado no trae** cuentas de Impuesto al Consumo por pagar, salud y
  pensión por pagar (2370), cuentas por cobrar a trabajadores (1365) ni gastos generales
  (5195). Mientras el usuario no elija sus auxiliares, las facturas con INC y la nómina quedan
  pendientes por contabilizar.
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
- **Nómina**: salud y pensión 4% sobre salario proporcional + extras + comisiones (el auxilio de
  transporte NO cotiza).
- **Documento soporte**: ReteFuente en % (÷100) y **ReteICA por mil ‰ (÷1000)**.
- **Hubs**: agregados reales vía `GET /api/resumen` (IVA generado/descontable, IVA por pagar, etc.).

## Pendientes conocidos
- **Facturas**: retenciones fiscales manuales (ReteIVA/ReteICA modal) y medios de pago/instrumentos.
- **Facturación electrónica DIAN** (XML UBL, firma, CUFE, QR): track aparte, vía **proveedor
  tecnológico autorizado** — no construir el protocolo desde cero. Los PDF actuales
  (`lib/pdf/`) son **representación gráfica**, no el documento electrónico.
- **Reportes**: pendiente de nuevo enfoque del cliente.
- `lib/data/ciiu.json` y `Ciuu.json` están preservados pero **aún sin usar** (actividad económica).
