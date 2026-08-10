# Sparkles

**Software contable y de gestión tributaria para Colombia.** Aplicación web full-stack:
facturación con IVA y retenciones, notas débito/crédito, compras, documentos soporte,
contabilidad de partida doble sobre el **PUC**, nómina y tableros financieros.

`Next.js 16` · `React 19` · `PostgreSQL` · `Prisma 7` · Auth propia (JWT httpOnly + bcrypt)

---

## ✨ Módulos

| Módulo | Qué hace |
|---|---|
| **Facturación** | Emisión con cálculo autoritativo en servidor: IVA por ítem y **ReteFuente automática**. Numeración DIAN **secuencial garantizada por transacción**. Snapshots inmutables de cliente y emisor. Anulable (no borrable). PDF. |
| **Notas débito/crédito** | Motivos oficiales DIAN (Anexo 1.9), consecutivo `NC-/ND-`, afectan el saldo de la factura y lo revierten al eliminarse. PDF. |
| **Clientes** | Persona natural / empresa, con banderas de **agente retenedor** y **autorretenedor** que dirigen las retenciones al facturar. |
| **Productos** | Catálogo con IVA y **retención** (categoría → concepto → tarifa) desde la tabla ReteFuente 2026. |
| **Empresas** | Wizard de 4 pasos: jurídica/natural, representante legal, ubicación (Colombia) y configuración tributaria. |
| **Compras** | Facturas de proveedor con retenciones manuales (ReteFuente / ReteIVA / ReteICA). |
| **Documentos soporte** | Adquisiciones a no obligados a facturar: ReteFuente (%) y ReteICA (por mil ‰). |
| **Asientos contables** | Partida doble sobre el **PUC** (comercial y ESAL), con autocompletado de cuentas y validación de balance. |
| **Nómina** | Empleados y liquidación (salario proporcional, salud/pensión 4%, devengos y deducciones). |
| **Dashboard / Operaciones / Finanzas** | Hubs con datos reales agregados: facturado, IVA generado/descontable, **IVA por pagar**, retenciones. |

> **Catálogo PUC incluido:** 841 cuentas bajo **NIIF** cargables a la base de datos, **separadas por
> sector** — comercial (403) y entidades sin ánimo de lucro (438, NIIF para Pymes), porque varias
> cuentas difieren.

---

## 🚀 Puesta en marcha

```bash
git clone https://github.com/SrEffry/Sparckles.git
cd Sparckles
npm install
```

**1. Base de datos.** Con PostgreSQL instalado, crea un rol y una base dedicados
(como superusuario `postgres`):

```sql
CREATE ROLE sparkles WITH LOGIN CREATEDB PASSWORD 'tu-contraseña';
CREATE DATABASE sparkles OWNER sparkles;
```

> `CREATEDB` solo hace falta en desarrollo: `prisma migrate dev` crea una *shadow database*
> temporal. En producción se usa `migrate deploy` y el rol va sin ese permiso.

**2. Configura el `.env`** (copia la plantilla y rellena):

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://sparkles:tu-contraseña@localhost:5432/sparkles?schema=public"
JWT_SECRET="genéralo con: openssl rand -base64 32"
```

**3. Aplica las migraciones y arranca:**

```bash
npx prisma migrate dev    # crea las tablas y genera el cliente Prisma
npm run dev               # http://localhost:3000
```

**4. Carga el catálogo PUC** (una sola vez): crea tu cuenta en la app y llama a
`POST /api/puc/seed` (requiere sesión iniciada; es idempotente).

---

## 📁 Estructura

```
app/
├── (auth)/          # login y registro
├── (panel)/         # panel: sidebar + guardia de sesión compartidos
│   ├── dashboard/ empresas/ clientes/ productos/ facturacion/ notas/
│   ├── compras/ documentos-soportes/ asientos-contables/ nomina/ recursos/
│   └── operaciones/ finanzas/ configuracion/     # hubs
└── api/             # endpoints
components/          # Sidebar, EmpresaWizard
lib/                 # auth, prisma, validaciones, cálculos, data/, pdf/
prisma/schema.prisma
public/img/
docs/                # modelo de datos y notas de migración
```

**Convención por módulo:** `lib/<x>Validation.js` (servidor) + `app/api/<x>/` (endpoints) +
`lib/<x>Api.js` (cliente). El servidor **siempre** recalcula; nunca se confía en montos del cliente.

---

## 🔐 Antes de producción

- Postgres gestionado (backups + TLS), desplegando el esquema con `npx prisma migrate deploy`.
- Rol de aplicación **sin `CREATEDB`** y `JWT_SECRET` **distinto** al de desarrollo, ambos en el
  gestor de secretos de la plataforma y no en un `.env` en disco.
- **Facturación electrónica DIAN** (XML UBL, firma digital, CUFE, QR): requiere integrar un
  **proveedor tecnológico autorizado**. Los PDF incluidos son la **representación gráfica**, no
  reemplazan el documento electrónico.

## 📌 Estado

Todos los módulos operan sobre PostgreSQL con validación de servidor. **Reportes** está pendiente
de un enfoque nuevo. Otros refinamientos: retenciones fiscales manuales (ReteIVA/ReteICA) en la
factura de venta y medios de pago.

## 📚 Documentación

- [`CLAUDE.md`](CLAUDE.md) — guía técnica, convenciones y reglas de negocio.
- [`docs/modelo-datos.md`](docs/modelo-datos.md) — modelo de datos del dominio.
