# Nota de contabilidad

> **Plantilla de referencia corregida — pendiente de implementar.**
>
> La versión original tenía la imputación **mal en los dos renglones**: `51651001` no existe en
> el catálogo (la correcta es `51650501`), y `17100501` sí existe pero es **"Marca Corporativa"**,
> no "Cargos Diferidos". Ejecutada tal cual, esa nota **habría desvalorizado la marca en
> $850.000** y creado una cuenta fantasma en el gasto.
>
> Ese es el caso más peligroso de todos: el código existe, así que una validación ingenua lo
> daría por bueno. Por eso el sistema ahora valida contra `CuentaPUC` y **toma el nombre del
> catálogo**, no del cliente.

## Para qué sirve — y para qué NO

La nota de contabilidad es para **ajustes**: reclasificaciones, provisiones, depreciaciones y
amortizaciones, causación de diferidos, cierres y corrección de errores.

**No se usa para registrar operaciones que tienen documento propio**: ventas, compras, recaudos,
pagos y nómina van por su módulo. Esta regla debe estar escrita en la interfaz cuando se
implemente, porque es el mal uso más común.

## Prefijo

⚠️ La plantilla original proponía `NC-`, que **ya lo usa la nota crédito** (`Nota.numero`,
`lib/motivosNota.js`). Es una colisión real. Usar **`CC-`** (comprobante de contabilidad) o
`NTC-`, con consecutivo propio por tipo y año.

---

## Estructura

```
[RAZÓN SOCIAL]                                    ┌─────────────────────────┐
NIT · Dirección · Teléfono · Email                │  NOTA DE CONTABILIDAD   │
                                                  │      CC-2026-00001      │
                                                  │  Fecha · Ciudad         │
                                                  └─────────────────────────┘

PERIODO CONTABLE AFECTADO      TIPO DE AJUSTE        DOCUMENTO REFERENCIA
julio 2026                     Amortización          DIF-2026-07

CONCEPTO Y JUSTIFICACIÓN
Texto que explica el ajuste y su soporte.

IMPUTACIÓN CONTABLE (PARTIDA DOBLE)
Cuenta │ Descripción │ Tercero │ Débito │ Crédito
                      SUMAS IGUALES

Anexos que la soportan: tabla de amortización, cálculo actuarial, etc.
Elaborado por: … · fecha-hora · Autorizado por: … · Asiento CC-2026-00001
```

### Campos que la original no tenía

| Campo | Por qué |
|---|---|
| **Periodo contable afectado** | Es lo que distingue un ajuste de un registro corriente |
| **Tipo de ajuste** | Ajuste · reclasificación · provisión · depreciación/amortización · reversión · cierre · corrección de error |
| **Comprobante corregido** | Si corrige o reversa otro, hay que referenciarlo |
| **Anexos** | El soporte del cálculo |
| **Número del asiento** | Trazabilidad con el libro |

---

## Imputación contable, corregida

**Escenario:** amortización mensual de la licencia anual de un ERP, $850.000.

| Cuenta | Nombre | Débito | Crédito |
|---|---|---|---|
| `51650501` | Amortización Licencias Software | 850.000 | |
| `17980501` | Amortización acumulada — ERP | | 850.000 |
| | **SUMAS IGUALES** | **850.000** | **850.000** |

Con el activo en `17050501 Licencias ERP`.

Dos correcciones de fondo respecto a la original:

1. **La amortización se acredita a la amortización acumulada (17 98), no al activo.** Bajo NIIF
   (NIC 38 / Sección 18 de NIIF para Pymes) una licencia de software **no es un "cargo
   diferido"**: es un **intangible**. "Cargo diferido" es lenguaje del Decreto 2650, donde 1710
   era esa cuenta; en el catálogo NIIF del sistema 1710 es **Patentes y marcas**.

2. **Sobra el tercero.** La original ponía el NIT de Softwaresolutions S.A.S. en la amortización.
   Una amortización interna no es una operación con un tercero, y poner un NIT ahí ensucia los
   auxiliares por tercero y los medios magnéticos.

**Y una corrección de redacción:** el valor en letras decía "OCHO CIENTOS CINCUENTA MIL". Es
**OCHOCIENTOS**. La utilidad `lib/numeroALetras.js` ya lo genera correctamente.

---

## Firmas

Mismo criterio que los comprobantes de tesorería: elaborado y autorizado se imprimen desde el
usuario autenticado con fecha y hora; "Revisado por — Contador Público" es costumbre y se puede
omitir. Aquí no hay firma de recibido: no hay beneficiario.
