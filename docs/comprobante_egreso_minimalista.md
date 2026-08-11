# Comprobante de egreso (comprobante de pago)

> **Plantilla de referencia corregida.** La original tenía tres problemas graves: no llevaba
> **ni una línea de retención**, pagaba el **bruto** en vez del neto, y usaba la cuenta
> `23359501`, que **no existe** en el catálogo NIIF del sistema. Además decía "factura
> electrónica de venta" en un documento de pago, donde el documento es la factura *del
> proveedor*.

## Naturaleza

Igual que el comprobante de ingreso: comprobante de contabilidad, no facturación electrónica.
Ver esa plantilla para la base normativa y el plazo de conservación.

⚠️ **El comprobante de egreso prueba que se pagó, no que el gasto sea deducible.** El soporte
fiscal de la deducción sigue siendo la factura electrónica o el documento soporte
(art. 771-2 E.T.).

---

## Estructura

```
[RAZÓN SOCIAL]                                    ┌─────────────────────────┐
NIT · Dirección · Teléfono · Email                │  COMPROBANTE DE EGRESO  │
                                                  │      CE-2026-00001      │
                                                  │  Fecha · Ciudad         │
                                                  └─────────────────────────┘

PAGADO A             NIT / C.C.        MEDIO DE PAGO      N.º TRANSACCIÓN / CHEQUE
Dirección del beneficiario (necesaria para el certificado de retención)
CUENTA: banco o caja de donde salió el dinero

CONCEPTO
Texto que explica el movimiento en los libros.

DOCUMENTOS APLICADOS
Documento │ Valor │ Saldo antes │ Aplicado │ Saldo después

RETENCIONES PRACTICADAS AL PROVEEDOR
Retención │ Concepto │ Base │ Tarifa │ Valor

                        Valor bruto        $ …
Son: [NETO EN LETRAS]   (−) Retenciones    $ …
                        NETO PAGADO        $ …

IMPUTACIÓN CONTABLE
Cuenta │ Descripción │ Tercero │ Débito │ Crédito
                       SUMAS IGUALES

Elaborado por: … · fecha-hora · Autorizado por: … · Asiento CE-2026-00001
[Firma de recibido del beneficiario — solo si es efectivo o cheque]
```

---

## Bloque de liquidación: bruto → retenciones → neto

Es lo que faltaba por completo. La retención se practica **en el pago o abono en cuenta, lo que
ocurra primero**: un pago de servicios a una persona jurídica hecho por un agente retenedor
**nunca sale por el bruto**.

**Ejemplo** — mantenimiento por $1.000.000 + IVA 19%:

| Concepto | Base | Tarifa | Valor |
|---|---|---|---|
| Subtotal | | | 1.000.000 |
| IVA 19% | 1.000.000 | 19% | 190.000 |
| **Bruto** | | | **1.190.000** |
| ReteFuente servicios | 1.000.000 | 4% | (40.000) |
| ReteIVA | 190.000 | 15% | (28.500) |
| ReteICA | 1.000.000 | 9,66‰ | (9.660) |
| **Neto pagado** | | | **1.111.840** |

El **valor en letras y el "recibí" van sobre el neto**: es lo que el beneficiario firma haber
recibido.

> ⚠️ La tarifa y la base de **ReteICA dependen del municipio y de la actividad**, y hay
> municipios donde el sujeto ni siquiera es agente de retención de ICA. La tarifa se toma del
> Estatuto Tributario Municipal vigente; el sistema no la cablea. Las tarifas y bases mínimas de
> **ReteFuente** salen de `lib/data/tablaRetefuente.js` y cambian por año gravable.
>
> Nota de unidad: **el ICA va por mil (‰), no en porcentaje.** Con 9,66‰ sobre $1.000.000 son
> $9.660, no $114.954.

---

## Imputación contable

**Escenario A — la compra ya fue causada** (es el que genera el sistema):

| Cuenta | Nombre | Tercero | Débito | Crédito |
|---|---|---|---|---|
| `220510` | Proveedores de servicios | proveedor | 1.111.840 | |
| `11100501` | Bancos Nacionales Cuenta Corriente | propio NIT | | 1.111.840 |
| | **SUMAS IGUALES** | | **1.111.840** | **1.111.840** |

Las retenciones ya son un pasivo desde la causación, así que el egreso paga solo el neto.

Si la cuenta bancaria está gravada, se añade el **GMF (4x1000)** sobre el valor pagado. El
sistema lo propone y se puede quitar: hay cuentas exentas y topes que no conoce.

**Escenario B — causación y pago en un solo acto.** El egreso llevaría además el gasto, el IVA
descontable y las retenciones por pagar (`23654001`, `23670501`, `23680501`). **El sistema no lo
genera automáticamente**: la cuenta de gasto la decide un contador, y adivinarla es donde el
software se equivoca. Ese caso se arma a mano en Asientos.

---

## Regla que hay que codificar y no equivocar

> Las retenciones que **yo practico** son un **pasivo** (2365/2367/2368 — le debo a la DIAN o al
> municipio). Las que **me practican** son un **activo** (1355 — anticipo de impuesto a mi
> favor).

Nunca al revés, y nunca como menor valor del gasto ni del ingreso. Por eso el mapa de cuentas
las separa en dos grupos distintos.

El comprobante impreso **debe mostrar concepto, base y tarifa de cada retención**: es la
información con la que después se expide el **certificado de retención** al proveedor y se
llenan las declaraciones mensuales.

---

## Firmas

Igual que en el comprobante de ingreso. La diferencia: la **firma de recibido del beneficiario**
tiene más peso aquí, porque es la prueba práctica del pago — pero sigue siendo **condicional**:
se imprime en efectivo y cheque, y se omite en transferencia, donde el soporte es el extracto
bancario y el número de transacción.
