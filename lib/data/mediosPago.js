// Medios de pago — códigos DIAN (subconjunto común). El XML UBL 2.1 de la factura electrónica
// exige el CÓDIGO del medio de pago (PaymentMeans), no el nombre. Se guarda el código.
export const MEDIOS_PAGO = [
  { codigo: "10", nombre: "Efectivo" },
  { codigo: "42", nombre: "Consignación bancaria" },
  { codigo: "47", nombre: "Transferencia bancaria" },
  { codigo: "48", nombre: "Tarjeta de crédito" },
  { codigo: "49", nombre: "Tarjeta débito" },
  { codigo: "20", nombre: "Cheque" },
  { codigo: "71", nombre: "Bonos" },
  { codigo: "1", nombre: "Instrumento no definido" },
];

export const MEDIOS_PAGO_CODIGOS = new Set(MEDIOS_PAGO.map((m) => m.codigo));

export function nombreMedioPago(codigo) {
  return MEDIOS_PAGO.find((m) => m.codigo === String(codigo))?.nombre || null;
}
