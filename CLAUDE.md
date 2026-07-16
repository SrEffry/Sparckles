# CLAUDE.md

Guía para trabajar en este repositorio. Léela antes de tocar código.

> ⚠️ **Next.js 16**: trae breaking changes respecto a versiones anteriores. Ver [`AGENTS.md`](AGENTS.md)
> y los docs incluidos en `node_modules/next/dist/docs/` antes de asumir APIs.

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
npx prisma dev          # (opcional) Postgres local efímero; imprime el DATABASE_URL
npx prisma db push      # crea/sincroniza las tablas
npm run dev             # http://localhost:3000
```
Luego, **cargar el catálogo PUC una vez**: `POST /api/puc/seed` (autenticado; idempotente).

**Base de datos:** en Prisma 7 la URL va en `prisma.config.ts` (CLI) y en `DATABASE_URL` del `.env`
(runtime); el `PrismaClient` recibe un **driver adapter** (`@prisma/adapter-pg`), no la url.
⚠️ El `DATABASE_URL` del `.env` apunta a un **Postgres local efímero** (`prisma dev`) usado para
desarrollo. **Para producción** reemplázalo por tu Postgres real (`npx create-db` o gestionado),
corre `npx prisma db push` y **cambia `JWT_SECRET`**.

## Estructura

```
/
├── app/
│   ├── (auth)/            # login, registro (layout de 2 paneles con logo + ilustración)
│   ├── (panel)/           # panel: layout compartido (Sidebar + guardia de sesión UNA vez)
│   │   ├── dashboard/ empresas/ clientes/ productos/ facturacion/ notas/
│   │   ├── compras/ documentos-soportes/ asientos-contables/ nomina/ recursos/
│   │   ├── operaciones/ finanzas/ configuracion/   # hubs
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
| **Operaciones** | Nueva factura, Facturas, Notas D/C, Compras, Asientos, Config. Facturación |
| **Finanzas** | Documentos soporte, Compras, Facturas (tabs Tesorería/Impuestos) |
| **Recursos** | Nómina |
| **Configuración** | Clientes, Mis productos, Config. Facturación, Empresas |
| **Reportes** | `ready:false` — el cliente le dará un enfoque nuevo (no migrado a propósito) |

## Arquitectura de datos

**Alcance: TODO se liga a un Usuario** (`usuarioId`). Cada usuario tiene sus propias empresas,
clientes, productos, facturas, etc. Nada es global salvo el catálogo PUC. (Confirmado por el cliente.)

Modelos: `Usuario, Empresa, Cliente, Producto, ConfigFacturacion, Factura(+Item), Nota(+Item),
Compra(+Item), DocumentoSoporte, Asiento(+Movimiento), Empleado, Nomina, CuentaPUC`.
Mapeo detallado del dominio: [`docs/modelo-datos.md`](docs/modelo-datos.md).

### PUC (catálogo global, `CuentaPUC`)
Dos sectores **separados** (varias cuentas difieren): `comercial` (Decreto 2650, 2.506 cuentas) y
`esal` (sin ánimo de lucro, 1.816). Cargado desde `lib/data/pucComercial.json` / `pucEsal.json`
(generados de `PUC.md` / `catalogo.md`). Seed: `POST /api/puc/seed` (`?force=1` recarga).
Búsqueda: `GET /api/puc?sector=&q=&imputables=1`.

## Convenciones para agregar/tocar un módulo
- Ruta: `app/(panel)/<modulo>/page.js` (`"use client"`), CSS module propio, paleta de arriba.
- **Trío por módulo**: `lib/<x>Validation.js` (servidor) + `app/api/<x>/route.js` (+ `[id]`) +
  `lib/<x>Api.js` (cliente). Los componentes **solo** hablan con `lib/<x>Api.js`.
- **El servidor es autoritativo**: nunca confiar en montos/cálculos del cliente; recalcular en
  el endpoint (ver `lib/facturaCalc.js`, `lib/nominaCalc.js`, `lib/compraValidation.js`).
- Todo endpoint valida sesión (`obtenerSesion`) y **filtra por `usuarioId`**.
- Dinero en `Decimal(18,2)`; nunca float.
- **Documentos fiscales son anulables, NO borrables** (facturas, asientos, soportes → `PATCH
  {accion:'anular'}`). Compras/notas sí se pueden editar/eliminar (notas revierten el saldo).
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
- **Asientos**: partida doble; balance (débitos=créditos) exigido solo para estado `registrado`.
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
