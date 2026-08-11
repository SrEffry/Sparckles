-- AlterTable
ALTER TABLE "factura_items" ADD COLUMN     "tipoIva" TEXT NOT NULL DEFAULT 'gravado';

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "baseExcluida" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "baseExenta" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "baseGravada" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "baseNoResponsable" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "baseSinClasificar" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fechaAnulacion" TEXT,
ADD COLUMN     "motivoAnulacion" TEXT;

-- CreateIndex
CREATE INDEX "factura_items_facturaId_tipoIva_idx" ON "factura_items"("facturaId", "tipoIva");

-- CreateIndex
CREATE INDEX "facturas_usuarioId_fecha_idx" ON "facturas"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "facturas_usuarioId_estado_fecha_idx" ON "facturas"("usuarioId", "estado", "fecha");

-- CreateIndex
CREATE INDEX "facturas_usuarioId_clienteId_fecha_idx" ON "facturas"("usuarioId", "clienteId", "fecha");

-- CreateIndex
CREATE INDEX "facturas_usuarioId_numero_idx" ON "facturas"("usuarioId", "numero");
