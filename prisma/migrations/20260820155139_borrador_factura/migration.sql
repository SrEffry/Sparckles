-- CreateTable
CREATE TABLE "borradores_factura" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "clienteId" TEXT,
    "fecha" TEXT,
    "fechaVencimiento" TEXT,
    "formaPago" TEXT,
    "medioPago" TEXT,
    "observaciones" TEXT,
    "descuentoGlobalPorcentaje" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "reteIvaPorcentaje" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "reteIcaPorMil" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL,
    "instrumentos" JSONB,
    "totalRevisado" DECIMAL(18,2),
    "revisadoEn" TEXT,
    "revisadoPorId" TEXT,
    "facturaId" TEXT,
    "emitidoEn" TEXT,

    CONSTRAINT "borradores_factura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "borradores_factura_facturaId_key" ON "borradores_factura"("facturaId");

-- CreateIndex
CREATE INDEX "borradores_factura_usuarioId_estado_updatedAt_idx" ON "borradores_factura"("usuarioId", "estado", "updatedAt");

-- AddForeignKey
ALTER TABLE "borradores_factura" ADD CONSTRAINT "borradores_factura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borradores_factura" ADD CONSTRAINT "borradores_factura_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
