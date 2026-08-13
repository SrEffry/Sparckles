-- AlterTable
ALTER TABLE "comprobantes_tesoreria" ADD COLUMN     "modo" TEXT NOT NULL DEFAULT 'aplicacion';

-- AlterTable
ALTER TABLE "mapa_cuentas" ADD COLUMN     "aportesSociales" TEXT,
ADD COLUMN     "obligacionesFinancieras" TEXT;

-- CreateTable
CREATE TABLE "comprobante_imputaciones" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "cuentaPuc" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "detalle" TEXT,
    "documentoSoporteRef" TEXT,

    CONSTRAINT "comprobante_imputaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comprobante_imputaciones_comprobanteId_idx" ON "comprobante_imputaciones"("comprobanteId");

-- AddForeignKey
ALTER TABLE "comprobante_imputaciones" ADD CONSTRAINT "comprobante_imputaciones_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes_tesoreria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
