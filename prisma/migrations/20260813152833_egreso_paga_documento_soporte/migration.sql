-- AlterTable
ALTER TABLE "comprobante_aplicaciones" ADD COLUMN     "documentoSoporteId" TEXT;

-- AlterTable
ALTER TABLE "documentos_soporte" ADD COLUMN     "generadoDesdeComprobanteId" TEXT;

-- CreateIndex
CREATE INDEX "comprobante_aplicaciones_documentoSoporteId_idx" ON "comprobante_aplicaciones"("documentoSoporteId");

-- AddForeignKey
ALTER TABLE "comprobante_aplicaciones" ADD CONSTRAINT "comprobante_aplicaciones_documentoSoporteId_fkey" FOREIGN KEY ("documentoSoporteId") REFERENCES "documentos_soporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
