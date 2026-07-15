# Modelo de datos — mapeo del sitio actual (fuente de verdad para el backend)

Resultado de revisar los `.js` del sitio actual. Captura la **forma real** de cada entidad,
sus **vínculos entre módulos** y las **inconsistencias** detectadas. Es la base para el
`schema.prisma`. Estado: entidades del núcleo confirmadas a nivel de campo; nómina, asientos,
soportes y compras se finalizan al portar cada módulo.

## Cómo persiste hoy (localStorage)

Todo se guarda por **usuario** (email), no por empresa:

| Clave | Entidad | Notas |
|---|---|---|
| `usuarios` | Usuario | global; contraseña en texto plano |
| `usuarioActual` (session) | sesión | |
| `empresas` | Empresa | array global, filtrado por `usuarioId === email` |
| `clientes_${email}` | Cliente | |
| `productos_${email}` | Producto | clave natural = `codigo` |
| `config_facturacion_${email}` | ConfigFacturacion | 1 por usuario; incluye resolución DIAN |
| `facturas_${email}` | Factura | numeración secuencial por resolución |
| `notas_${email}` | Nota (débito/crédito) | |
| `asientos_${email}` | AsientoContable | usa PUC |
| `empleados_${email}` | Empleado | |
| `nominas_${email}` | Nomina | |
| `soportes_${email}` | DocumentoSoporte | alimenta Finanzas |
| `facturaTemporal` (session) | borrador de factura | |

## ⚠️ Inconsistencias detectadas (a unificar en el backend)

1. **Doble modelo de Empresa.** `empresas.js` (modal rápido) guarda `{nombre, nit, regimen,
   direccion, telefono, ciudad, estado, contacto, email}`. Pero `nueva-empresa.js` (wizard real
   de 4 pasos) guarda un modelo MUCHO más completo (abajo). **El wizard es el autoritativo**; el
   modal rápido queda obsoleto. `regimen` solo existe en el modal; el wizard usa
   `caracteristicasTributarias`.
2. **Alcance de datos por usuario, no por empresa** (ver decisión pendiente §Decisiones).
3. **Contraseñas en texto plano**; sin auth real.
4. **Dinero como `Number`/string** (float). En backend: enteros en centavos o `Decimal`.
5. **Facturas se pueden borrar** en el front. Legalmente una factura emitida **no se borra**, se
   **anula**. El backend debe impedir el hard-delete de documentos fiscales.

## Entidades (campos reales)

### Usuario
`id, nombre, apellido, nombreCompleto, email (único), password (→ hash), fechaRegistro, activo`

### Empresa  (autoritativo = wizard `nueva-empresa.js`)
Comunes: `id, usuarioId, tipoEntidad ('juridica'|'natural'), estado, fechaCreacion`
Ubicación: `pais, departamento, ciudad, direccion, codigoPostal`
Tributario: `tarifaIvaRetenido, aplicaIva (bool), caracteristicasTributarias (string[])`
- Si **jurídica**: `razonSocial, nit, dv, telefono, email` +
  `representanteLegal { nombres, apellidos, tipoDocumento, numeroDocumento, telefono, email }`
- Si **natural**: `nombres, apellidos, nombreCompleto, tipoDocumento, numeroDocumento, telefono, email`

### Cliente
Comunes: `id, usuarioId, tipo ('natural'|'empresa'), nombreCompleto, telefono, email, direccion,
ciudad, departamento, fechaRegistro`
Retención (**clave para facturación**): `esAgenteRetenedor (bool), esAutorretenedor (bool)`
- **natural**: `nombres, apellidos, tipoDocumento, numeroDocumento` (autorretenedor siempre false)
- **empresa**: `razonSocial, nombreComercial, nit, dv, personaContacto`

### Producto
`codigo (único), descripcion, unidad, comoCompra, comoVende, tarifaIva, precioVenta, linea,
retencion { aplica (bool), nombre, tarifa, categoria, concepto }, fechaCreacion`

### ConfigFacturacion  (datos del emisor + resolución DIAN)
`logo (base64), razonSocial, nit, regimen, direccion, ciudad, telefono, email,
actividadEconomica, pieFact, observaciones, fechaConfiguracion,
resolucion { numero, fecha, prefijo, numeracionDesde, numeracionHasta, numeracionActual,
vencimiento }`
- `numeracionActual` se **incrementa** tras emitir cada factura → numeración secuencial DIAN.

### Factura  (entidad transaccional central)
`id, numero, prefijo, numeroCompleto, fecha, fechaVencimiento, formaPago, medioPago,
instrumentos[], observaciones,
cliente { snapshot: id, nombre, tipo, tipoDocumento, numeroDocumento, dv, telefono, email,
direccion, esAgenteRetenedor, esAutorretenedor },
items[] (líneas de producto con base, IVA, descuento, subtotal),
subtotal, totalDescuentos, iva, retenciones,
retencionesFiscales { retefuente{base,tarifa,valor}, reteiva{...}, reteica{...} },
retencionesPorConcepto, total, totalACobrar,
config { snapshot emisor: razonSocial, nit, regimen, ... }`
- **Vínculos:** toma retención de `cliente.esAgenteRetenedor` + `producto.retencion` +
  `tabla-retefuente.js`; consume/incrementa `ConfigFacturacion.resolucion.numeracionActual`.

### Pendientes de mapear a nivel campo (al portar cada módulo)
- **Nota** (débito/crédito) — `notas_${email}`, referida desde Historial-facturas.
- **AsientoContable** — `asientos_${email}`, usa `catalogo-puc.js` (PUC).
- **Empleado** — `empleados_${email}`: incluye `activo`, `salarioBase` (usados por Recursos/Finanzas).
- **Nomina** — `nominas_${email}`.
- **DocumentoSoporte** — `soportes_${email}`: `estado ('Emitido')`, `totales{neto, reteFuente,
  reteIca}` (consumidos por Finanzas: CxP e impuestos).
- **Compra / Proveedor** — `Compras.js`.

## Mapa de vínculos entre módulos (lo "independiente pero ligado")

- Cliente `esAgenteRetenedor/esAutorretenedor` → **Factura** (aplica retenciones).
- Producto `retencion` + `tarifaIva` + `tabla-retefuente.js` → **Factura** (impuestos por línea).
- ConfigFacturacion `resolucion.numeracionActual` ↔ **Factura** (número secuencial DIAN).
- Empleado (`activo`, `salarioBase`) → **Recursos** (KPIs) y **Nómina**.
- DocumentoSoporte (`estado`, `totales`) → **Finanzas** (CxP, retefuente, reteica).
- catalogo-puc.js (PUC) → **Asientos contables** y clasificación.

## Datos de referencia (no son del usuario)
- `data/colombia.json` (departamentos/ciudades), `data/ciiu.json` (CIIU).
- `catalogo-puc.js` (Plan Único de Cuentas), `tabla-retefuente.js` (tabla retención en la fuente).
- En el backend: tablas de catálogo (seed) o JSON versionado.

## Reglas de producción a respetar en el backend
- Dinero en **enteros (centavos)** o `Decimal`; nunca float.
- Documentos fiscales (facturas, notas, soportes): **inmutables / anulables**, no borrables.
- **Numeración secuencial** de facturas garantizada por la BD (transacción sobre la resolución).
- Validación en servidor (nunca confiar en el cliente).
- Campos de auditoría: `createdAt, updatedAt, createdBy`.
- Contraseñas hasheadas (bcrypt/argon2); sesiones seguras.
