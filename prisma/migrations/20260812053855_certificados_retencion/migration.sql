-- CreateTable
CREATE TABLE "certificados_retencion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "periodo" TEXT,
    "terceroNombre" TEXT NOT NULL,
    "terceroTipoDocumento" TEXT,
    "terceroNumeroDocumento" TEXT NOT NULL,
    "terceroDv" TEXT,
    "totalBase" DECIMAL(18,2) NOT NULL,
    "totalValor" DECIMAL(18,2) NOT NULL,
    "detalle" JSONB NOT NULL,
    "emisorSnapshot" JSONB NOT NULL,
    "ciudadConsignacion" TEXT,
    "expedidoPor" TEXT,
    "expedidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "certificados_retencion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificados_retencion_usuarioId_anio_terceroNumeroDocument_idx" ON "certificados_retencion"("usuarioId", "anio", "terceroNumeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_retencion_usuarioId_numero_key" ON "certificados_retencion"("usuarioId", "numero");

-- AddForeignKey
ALTER TABLE "certificados_retencion" ADD CONSTRAINT "certificados_retencion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
