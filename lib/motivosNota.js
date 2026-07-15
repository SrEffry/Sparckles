// Motivos oficiales DIAN — Anexo Técnico 1.9 (Resolución 165 de 2023).
export const MOTIVOS_CREDITO = [
  { codigo: "1", label: "Devolución parcial de bienes y/o no aceptación parcial del servicio" },
  { codigo: "2", label: "Anulación de factura electrónica de venta" },
  { codigo: "3", label: "Rebaja o descuento parcial o total" },
  { codigo: "4", label: "Ajuste de precio" },
  { codigo: "5", label: "Otras" },
  { codigo: "6", label: "Descuento comercial por pronto pago" },
  { codigo: "7", label: "Descuento comercial por volumen de ventas" },
];

export const MOTIVOS_DEBITO = [
  { codigo: "1", label: "Intereses" },
  { codigo: "2", label: "Gastos por cobrar" },
  { codigo: "3", label: "Cambio del valor" },
  { codigo: "4", label: "Otros" },
];

export function motivosDe(tipo) {
  return tipo === "debito" ? MOTIVOS_DEBITO : MOTIVOS_CREDITO;
}
