# Plan de migración a Next.js — Sparkles

Documento técnico de referencia. Estado: **propuesta para revisión** (no se ha tocado código de la app).

## 1. Objetivo y alcance

Migrar el sitio actual (HTML/CSS/JS vanilla, persistencia en `localStorage`) a una app
**Next.js full-stack**, con dos metas:

1. **Mantenibilidad / componentes** — eliminar la duplicación del sidebar y la verificación
   de sesión (hoy copiados en 18 páginas) mediante componentes y un layout compartido.
2. **Facturación electrónica DIAN** — que exige backend, base de datos y persistencia real
   (imposible con `localStorage`).

**Regla rectora:** migración **incremental** (patrón *strangler*). La app sigue funcionando
en cada paso y **no se pierde ninguna función**. Cada módulo se verifica contra el actual
antes de retirar el viejo.

## 2. Estado actual (inventario)

| Capa | Tamaño | Notas |
|---|---|---|
| JS | ~12.100 líneas (21 archivos) | Los pesados: `Nueva-factura.js` (2.509), `Compras.js` (934), `Notas.js` (854), `catalogo-puc.js` (848), `nomina.js` (783) |
| CSS | ~12.000 líneas | Por módulo; portable casi tal cual |
| HTML | ~6.400 líneas (18 páginas) | Sidebar + guardia de sesión duplicados |
| Datos | `localStorage`/`sessionStorage` | Namespaced por email de usuario |
| Estáticos | `data/*.json` | `colombia.json`, `ciiu.json`, `Ciuu.json` — se quedan igual |
| Lógica pura | `tabla-retefuente.js`, `catalogo-puc.js` | Cálculos portables sin cambios |

### Deuda técnica a resolver durante la migración
- Contraseñas en **texto plano** → hashear (bcrypt/argon2).
- Datos solo en el navegador → base de datos.
- Sin validación de servidor → validar en API (nunca confiar en el cliente).
- Dinero en `Number` (float) → usar enteros en centavos o `Decimal` (Prisma) para evitar
  errores de redondeo en cálculos contables.

## 3. Stack destino y decisiones

| Área | Elección | Motivo |
|---|---|---|
| Framework | **Next.js (App Router)** | Front + backend en un solo proyecto/lenguaje |
| Lenguaje | **JSX (JS) al inicio**, TS incremental | Portar rápido; adoptar TypeScript archivo a archivo (clave en cálculos de dinero) |
| Base de datos | **PostgreSQL** | Relacional, robusto para contabilidad |
| ORM | **Prisma** | Modelo tipado, migraciones versionadas |
| Auth | **Auth.js (NextAuth)** | Sesiones seguras, contraseñas hasheadas |
| Estilos | Reutilizar los CSS actuales (CSS Modules) | Evita reescribir 12k líneas de estilo |
| Hosting | Vercel (front) + Postgres gestionado (Neon/Supabase/RDS) | Estándar Next.js; ajustable |

## 4. Modelo de datos (mapeo `localStorage` → Prisma)

El patrón actual `entidad_${email}` mapea **1:1** a tablas con clave foránea `usuarioId`.

| Clave de storage actual | Tabla destino | Ámbito |
|---|---|---|
| `usuarios` | `Usuario` | global |
| `usuarioActual` (session) | — (sesión de Auth.js) | — |
| `empresas` | `Empresa` | por usuario |
| `clientes_${email}` | `Cliente` | por usuario |
| `productos_${email}` | `Producto` | por usuario |
| `facturas_${email}` | `Factura` (+ `FacturaItem`) | por usuario |
| `notas_${email}` | `Nota` (débito/crédito) | por usuario |
| `asientos_${email}` | `AsientoContable` | por usuario |
| `empleados_${email}` | `Empleado` | por usuario |
| `nominas_${email}` | `Nomina` | por usuario |
| `soportes_${email}` | `DocumentoSoporte` | por usuario |
| `config_facturacion_${email}` | `ConfigFacturacion` | 1:1 por usuario |
| `facturaTemporal` (session) | borrador en cliente / tabla `FacturaBorrador` | — |

> Antes de escribir el `schema.prisma` definitivo hay que **volcar las formas reales** de cada
> objeto (campos) leyendo los `push({...})` de cada módulo. Bosquejo inicial:

```prisma
model Usuario {
  id        String   @id @default(cuid())
  nombre    String
  apellido  String
  email     String   @unique
  password  String   // hash
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
  empresas          Empresa[]
  clientes          Cliente[]
  productos         Producto[]
  facturas          Factura[]
  // ...resto de relaciones
}

model Cliente {
  id        String  @id @default(cuid())
  tipo      String  // 'empresa' | 'persona'
  nombre    String
  documento String
  // ...campos reales tomados de Clientes.js
  usuario   Usuario @relation(fields: [usuarioId], references: [id])
  usuarioId String
}
// Empresa, Producto, Factura, FacturaItem, Nota, AsientoContable,
// Empleado, Nomina, DocumentoSoporte, ConfigFacturacion: mismo patrón
```

## 5. Estructura destino

```
app/
├── (auth)/
│   ├── login/page.jsx
│   └── registro/page.jsx
├── (panel)/
│   ├── layout.jsx              # Sidebar + guardia de sesión (UNA vez)
│   ├── dashboard/page.jsx
│   ├── empresas/page.jsx
│   ├── empresas/nueva/page.jsx
│   ├── operaciones/page.jsx
│   ├── facturas/page.jsx           # historial
│   ├── facturas/nueva/page.jsx
│   ├── facturas/configurar/page.jsx
│   ├── notas/page.jsx
│   ├── productos/page.jsx
│   ├── clientes/page.jsx
│   ├── asientos-contables/page.jsx
│   ├── nomina/page.jsx
│   ├── documentos-soportes/page.jsx
│   ├── finanzas/page.jsx
│   ├── recursos/page.jsx
│   ├── reportes/page.jsx
│   └── configuracion/page.jsx
├── api/
│   ├── auth/[...nextauth]/route.js
│   ├── clientes/route.js
│   ├── facturas/route.js
│   └── dian/route.js
components/         # Sidebar, Modal, tablas reutilizables
lib/
│   ├── db.js                   # cliente Prisma
│   ├── calc/retefuente.js      # <- tabla-retefuente.js
│   └── calc/puc.js             # <- catalogo-puc.js
prisma/schema.prisma
data/colombia.json, ciiu.json  # estáticos (sin cambios)
```

## 6. Mapa módulo → ruta

| Página actual | Ruta Next.js | Datos |
|---|---|---|
| `index.html` | `/login`, `/registro` | `Usuario` + Auth |
| `dashboard.html` | `/dashboard` | agregados |
| `empresas.html` | `/empresas` | `Empresa` |
| `nueva-empresa.html` | `/empresas/nueva` | `Empresa` + `colombia.json`/`ciiu.json` |
| `Operaciones.html` | `/operaciones` | hub |
| `Nueva-factura.html` | `/facturas/nueva` | `Factura`, `Cliente`, `Producto`, config |
| `Historial-facturas.html` | `/facturas` | `Factura` |
| `Configurar-facturacion.html` | `/facturas/configurar` | `ConfigFacturacion` |
| `Notas.html` | `/notas` | `Nota` |
| `Mis-productos.html` | `/productos` | `Producto` (+ retefuente) |
| `Clientes.html` / `Modal-cliente.html` | `/clientes` (+ modal) | `Cliente` |
| `asientos-contables.html` | `/asientos-contables` | `AsientoContable` + PUC |
| `Nomina.html` | `/nomina` | `Empleado`, `Nomina` |
| `documentos-soportes.html` | `/documentos-soportes` | `DocumentoSoporte` |
| `finanzas.html` | `/finanzas` | agregados |
| `recursos.html` | `/recursos` | — |
| `reportes.html` | `/reportes` | agregados |
| `Configuracion.html` | `/configuracion` | hub |

## 7. Fases y checklist

### Fase 0 — Preparación
- [ ] Confirmar decisiones §3 (BD, hosting, JS vs TS).
- [ ] Crear proyecto Next.js en rama nueva (no tocar el sitio actual, que sigue vivo).
- [ ] Volcar las formas reales de cada objeto de storage para cerrar el `schema.prisma`.

### Fase 1 — Andamiaje + layout compartido  ← *mayor retorno de mantenibilidad*
- [ ] Scaffold Next.js + configuración de CSS Modules.
- [ ] `layout.jsx` del panel con Sidebar + guardia de sesión (una sola implementación).
- [ ] Componente `Sidebar` con navegación activa.
- [ ] Portar login/registro a `/login` y `/registro`.

### Fase 2 — Capa de datos abstraída
- [ ] `lib/dataService` con la misma API que hoy, respaldado **todavía** por `localStorage`.
- [ ] Todos los módulos leen/escriben vía `dataService` (no acceden a `localStorage` directo).
- [ ] Objetivo: cuando llegue la BD, se cambia **1 archivo, no 21**.

### Fase 3 — Portar módulos (strangler, del simple al complejo)
Orden sugerido: `recursos` → `finanzas` → `empresas` → `clientes` → `productos` →
`asientos-contables` → `nomina` → `documentos-soportes` → `notas` → `historial-facturas` →
**`nueva-factura` (el último, 2.509 líneas)**.
- [ ] Por cada módulo: portar UI a componente, mover lógica pura a `lib/`, verificar contra
      el actual, retirar el viejo.

### Fase 4 — Backend real
- [ ] `schema.prisma` + primera migración; Postgres en marcha.
- [ ] Auth.js con contraseñas hasheadas (migrar usuarios existentes).
- [ ] Endpoints/Server Actions por entidad con validación de servidor.
- [ ] `dataService`: cambiar backend de `localStorage` → API. (Los componentes no cambian.)
- [ ] Script de importación de datos de `localStorage` → BD (para no perder datos de demo).

### Fase 5 — Facturación electrónica DIAN
- [ ] Elegir **proveedor tecnológico autorizado** por la DIAN.
- [ ] Modelar estados del documento (borrador → firmado → validado DIAN → rechazado).
- [ ] Integrar API del proveedor: envío, CUFE, respuesta, representación gráfica (PDF+QR).
- [ ] Almacenar XML UBL 2.1 y acuses. Manejo de resolución de numeración.

## 8. Facturación electrónica DIAN (nota crítica)

**No es un trabajo de frontend.** Implica: XML **UBL 2.1**, **firma digital** con certificado,
generación de **CUFE**, envío a los **web services de la DIAN** para validación previa, manejo
de la respuesta y **representación gráfica** (PDF con QR).

**Recomendación fuerte:** integrar con un **proveedor tecnológico autorizado por la DIAN**
(consumiendo su API) en vez de implementar el protocolo desde cero. Ahorra meses de
cumplimiento normativo, firma, certificación y auditoría. El backend (Fase 4) es requisito
previo porque se necesita dónde firmar, almacenar y consultar los documentos.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Reescritura total "big bang" rompe funciones | Migración incremental; el sitio actual sigue vivo en paralelo |
| Divergencia de comportamiento al portar | Verificar cada módulo contra el actual antes de retirarlo |
| Acoplamiento a `localStorage` disperso | Fase 2 (capa de datos) antes del backend |
| Errores de redondeo en dinero | `Decimal`/centavos desde el inicio |
| Complejidad/alcance DIAN | Delegar en proveedor tecnológico autorizado |
| Pérdida de datos de demo existentes | Script de importación `localStorage` → BD |

## 10. Esfuerzo (orden de magnitud)

Proyecto grande (~30k líneas JS/CSS/HTML). Reparto aproximado del valor:
- **Fases 1–3** entregan casi todo el valor de **mantenibilidad**.
- **Fase 4** habilita la **persistencia real** (prerequisito de DIAN).
- **Fase 5** es la más pesada y la que conviene apoyar en un proveedor.

Al ser incremental, se puede pausar entre fases sin dejar la app rota.

---

### Próximo paso sugerido
Cerrar la Fase 0 (confirmar BD/hosting y JS-vs-TS) y arrancar con una **PoC**: scaffold +
`layout` compartido + portar `empresas` de punta a punta para validar el patrón.
