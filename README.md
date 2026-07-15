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

> **Catálogo PUC incluido:** 4.322 cuentas cargables a la base de datos, **separadas por sector** —
> comercial (Decreto 2650) y entidades sin ánimo de lucro (ESAL), porque varias cuentas difieren.

---

## 🚀 Puesta en marcha

```bash
git clone https://github.com/SrEffry/Sparckles.git
cd Sparckles
npm install
```

**1. Base de datos** (elige una):

```bash
npx prisma dev      # Postgres local para desarrollo → copia el DATABASE_URL al .env
npx create-db       # Prisma Postgres en la nube
```

**2. Configura el `.env`:**

```env
DATABASE_URL="postgres://..."
JWT_SECRET="un-secreto-fuerte"
```

**3. Crea las tablas y arranca:**

```bash
npx prisma db push
npm run dev          # http://localhost:3000
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

- Apuntar `DATABASE_URL` a un Postgres real y correr `npx prisma db push`.
- Cambiar `JWT_SECRET` por un secreto fuerte.
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
