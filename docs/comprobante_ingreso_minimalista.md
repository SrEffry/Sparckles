# Comprobante de ingreso (recibo de caja)

> **Plantilla de referencia corregida.** La versión original usaba códigos del PUC del Decreto
> 2650 y omitía las retenciones y la aplicación a documentos. Los códigos de abajo existen en
> el catálogo NIIF que carga el sistema (`lib/data/pucComercial.json`).
>
> Las cuentas concretas las define **cada usuario** en Configuración → Mapa de cuentas: las de
> aquí son las sugeridas por defecto, no valores fijos.

## Naturaleza

Comprobante de contabilidad, **no** documento de facturación electrónica: sin resolución DIAN,
sin prefijo autorizado, sin CUFE, no se transmite.

Es exigencia normativa igualmente. El Código de Comercio (art. 53) manda que los asientos se
hagan con base en comprobantes, y el Decreto 2649 de 1993 (arts. 123 y 124, vigentes por
remisión del Decreto 2420 de 2015) exige numeración consecutiva, español, día de preparación,
las personas que lo elaboraron y autorizaron, y correspondencia con los libros.

**Conservación: 10 años** (C.Co. art. 60, modificado por la Ley 962 de 2005). Se admite medio
electrónico si garantiza reproducción exacta.

---

## Estructura

```
[RAZÓN SOCIAL]                                    ┌──────────────────────────┐
NIT · Dirección · Teléfono · Email                │  COMPROBANTE DE INGRESO  │
                                                  │      CI-2026-00001       │
                                                  │  Fecha · Ciudad          │
                                                  └──────────────────────────┘

RECIBIDO DE          NIT / C.C.        MEDIO DE PAGO      N.º TRANSACCIÓN
CUENTA: banco o caja donde entró el dinero

CONCEPTO
Texto que explica el movimiento en los libros.

DOCUMENTOS APLICADOS
Documento │ Valor │ Saldo antes │ Aplicado │ Saldo después

RETENCIONES QUE NOS PRACTICARON
Retención │ Concepto │ Base │ Tarifa │ Valor

                        Valor bruto        $ …
Son: [NETO EN LETRAS]   (−) Retenciones    $ …
                        NETO RECIBIDO      $ …

IMPUTACIÓN CONTABLE
Cuenta │ Descripción │ Tercero │ Débito │ Crédito
                       SUMAS IGUALES

Elaborado por: … · fecha-hora · Autorizado por: … · Asiento CI-2026-00001
[Firma de recibido — solo si el medio de pago es efectivo o cheque]
```

---

## Campos que la plantilla original no tenía

| Campo | Por qué hace falta |
|---|---|
| **Tabla de documentos aplicados** con saldo antes y después | La original decía "abono del 50%" en el concepto, pero sin registrar la aplicación nada impide emitir dos recibos del 50% y luego uno del 100% |
| **Retenciones recibidas** con concepto, base y tarifa | Es lo que soporta el activo por retención y se cruza contra el certificado que expide el cliente |
| **Ciudad de expedición** | Práctica estándar |
| **Número del asiento** | Trazabilidad comprobante ↔ libro, que el art. 124 sí exige |
| **Banco, número y fecha del cheque** | Cuando el medio es cheque |

**Cambio de rótulo:** la original decía "DOCUMENTO SOPORTE N.º". En Colombia *documento soporte*
es un documento fiscal específico —el de compras a no obligados a facturar, que el sistema ya
modela aparte—. Aquí es **documento de referencia**.

---

## Imputación contable

**Escenario:** factura FV-1205 por $1.190.000 (base $1.000.000 + IVA 19%). El cliente es gran
contribuyente y practica ReteFuente 2,5%, ReteIVA 15% del IVA y ReteICA 7‰. Consigna $1.129.500.

| Cuenta | Nombre | Tercero | Débito | Crédito |
|---|---|---|---|---|
| `11100501` | Bancos Nacionales Cuenta Corriente | propio NIT | 1.129.500 | |
| `13551501` | Retefuente por Ventas | cliente | 25.000 | |
| `13551701` | ReteIVA por Ventas | cliente | 28.500 | |
| `13551801` | ReteICA por Ventas | cliente | 7.000 | |
| `13050501` | Clientes Nacionales | cliente | | 1.190.000 |
| | **SUMAS IGUALES** | | **1.190.000** | **1.190.000** |

Puntos que suelen fallar:

- **La cartera se cancela por el BRUTO**, no por lo consignado. El cliente pagó $1.129.500 pero
  canceló $1.190.000: la diferencia son impuestos que él le girará a la DIAN por nosotros.
- Las cuentas `13551701` y `13551801` **no existían** en el catálogo hasta que se agregaron: sin
  ellas este asiento no cuadra y los $35.500 terminaban en cualquier parte.
- **Si las retenciones ya se registraron al causar la factura**, este comprobante NO vuelve a
  debitarlas: solo `D Banco / C Clientes` por el neto. Lo gobierna la política del mapa de
  cuentas. Repetirlas infla el activo y la declaración de renta.
- **Las retenciones no se prorratean entre abonos.** El cliente las practica una sola vez.

**Si el dinero no corresponde a una factura emitida**, no es cancelación de cartera: es
**anticipo de cliente**, un pasivo. Es una decisión de fondo que cambia el IVA del periodo, y el
sistema no la toma solo.

---

## Firmas

El art. 124 pide indicación de **las personas que lo elaboraron y autorizaron** — personas, no
rúbrica manuscrita. Un comprobante que imprime el usuario autenticado con fecha y hora cumple
mejor que una raya en blanco.

| Bloque | ¿Necesario? |
|---|---|
| Elaborado por | **Sí.** Se imprime automáticamente con fecha y hora |
| Autorizado por | **Sí.** El usuario que confirmó la contabilización |
| Revisado por — Contador Público | **No.** Costumbre. El contador firma estados financieros, no cada comprobante |
| "Contabilizado — firma y sello" | **No.** No es una persona, es un estado: se reemplaza por el número del asiento |
| Firma de quien recibe | **Condicional.** Solo en efectivo o cheque; en transferencia el soporte es el extracto |
