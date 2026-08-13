-- AlterTable
ALTER TABLE "documentos_soporte" ADD COLUMN     "conceptoRetencion" TEXT,
ADD COLUMN     "fechaAnulacion" TEXT,
ADD COLUMN     "motivoAnulacion" TEXT,
ADD COLUMN     "municipioIca" TEXT,
ADD COLUMN     "proveedorTipoDocumento" TEXT;

-- CreateTable
CREATE TABLE "retenciones_practicadas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origen" TEXT NOT NULL,
    "compraId" TEXT,
    "documentoSoporteId" TEXT,
    "comprobanteId" TEXT,
    "docRef" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "terceroNombre" TEXT NOT NULL,
    "terceroTipoDocumento" TEXT,
    "terceroNumeroDocumento" TEXT,
    "terceroDv" TEXT,
    "tipo" TEXT NOT NULL,
    "conceptoCodigo" TEXT,
    "conceptoNombre" TEXT,
    "base" DECIMAL(18,2) NOT NULL,
    "tarifa" DECIMAL(8,4) NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT '%',
    "valor" DECIMAL(18,2) NOT NULL,
    "municipio" TEXT,
    "vinculante" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "retenciones_practicadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retenciones_practicadas_usuarioId_anio_tipo_idx" ON "retenciones_practicadas"("usuarioId", "anio", "tipo");

-- CreateIndex
CREATE INDEX "retenciones_practicadas_usuarioId_terceroNumeroDocumento_an_idx" ON "retenciones_practicadas"("usuarioId", "terceroNumeroDocumento", "anio");

-- CreateIndex
CREATE INDEX "retenciones_practicadas_comprobanteId_idx" ON "retenciones_practicadas"("comprobanteId");

-- CreateIndex
CREATE INDEX "retenciones_practicadas_compraId_idx" ON "retenciones_practicadas"("compraId");

-- CreateIndex
CREATE INDEX "retenciones_practicadas_documentoSoporteId_idx" ON "retenciones_practicadas"("documentoSoporteId");

-- AddForeignKey
ALTER TABLE "retenciones_practicadas" ADD CONSTRAINT "retenciones_practicadas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retenciones_practicadas" ADD CONSTRAINT "retenciones_practicadas_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retenciones_practicadas" ADD CONSTRAINT "retenciones_practicadas_documentoSoporteId_fkey" FOREIGN KEY ("documentoSoporteId") REFERENCES "documentos_soporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retenciones_practicadas" ADD CONSTRAINT "retenciones_practicadas_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes_tesoreria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
