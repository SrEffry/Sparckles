-- CreateTable
CREATE TABLE "notas_contabilidad" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numero" TEXT,
    "sector" TEXT NOT NULL DEFAULT 'comercial',
    "fecha" TEXT NOT NULL,
    "ciudad" TEXT,
    "periodoAfectado" TEXT NOT NULL,
    "tipoAjuste" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "documentoRef" TEXT,
    "anexos" TEXT,
    "totalDebitos" DECIMAL(18,2) NOT NULL,
    "totalCreditos" DECIMAL(18,2) NOT NULL,
    "diferencia" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "asientoId" TEXT,
    "reversaAId" TEXT,
    "reversadaPorId" TEXT,
    "motivoReversion" TEXT,
    "elaboradoPor" TEXT,
    "elaboradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorizadoPor" TEXT,
    "emisorSnapshot" JSONB,

    CONSTRAINT "notas_contabilidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_contabilidad_movimientos" (
    "id" TEXT NOT NULL,
    "notaId" TEXT NOT NULL,
    "cuenta" TEXT NOT NULL,
    "nombreCuenta" TEXT NOT NULL,
    "debito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tercero" TEXT,
    "detalle" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nota_contabilidad_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notas_contabilidad_usuarioId_estado_idx" ON "notas_contabilidad"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "notas_contabilidad_usuarioId_periodoAfectado_idx" ON "notas_contabilidad"("usuarioId", "periodoAfectado");

-- CreateIndex
CREATE UNIQUE INDEX "notas_contabilidad_usuarioId_numero_key" ON "notas_contabilidad"("usuarioId", "numero");

-- CreateIndex
CREATE INDEX "nota_contabilidad_movimientos_notaId_idx" ON "nota_contabilidad_movimientos"("notaId");

-- AddForeignKey
ALTER TABLE "notas_contabilidad" ADD CONSTRAINT "notas_contabilidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_contabilidad_movimientos" ADD CONSTRAINT "nota_contabilidad_movimientos_notaId_fkey" FOREIGN KEY ("notaId") REFERENCES "notas_contabilidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
