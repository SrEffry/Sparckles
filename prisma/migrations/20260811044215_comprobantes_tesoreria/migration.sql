-- AlterTable
ALTER TABLE "compras" ADD COLUMN     "totalPagado" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "totalRecaudado" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "comprobantes_tesoreria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "prefijo" TEXT,
    "consecutivo" INTEGER,
    "anio" INTEGER,
    "numero" TEXT,
    "fecha" TEXT NOT NULL,
    "ciudad" TEXT,
    "terceroNombre" TEXT NOT NULL,
    "terceroDocumento" TEXT,
    "terceroDireccion" TEXT,
    "medioPago" TEXT,
    "cuentaTesoreriaId" TEXT,
    "cuentaTesoreriaPuc" TEXT,
    "cuentaTesoreriaNombre" TEXT,
    "bancoRef" TEXT,
    "numTransaccion" TEXT,
    "chequeBanco" TEXT,
    "chequeFecha" TEXT,
    "concepto" TEXT NOT NULL,
    "observaciones" TEXT,
    "valorBruto" DECIMAL(18,2) NOT NULL,
    "totalRetenciones" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otrosDescuentos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "neto" DECIMAL(18,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "motivoAnulacion" TEXT,
    "asientoId" TEXT,
    "reversaAId" TEXT,
    "reversadoEn" TEXT,
    "elaboradoPor" TEXT,
    "elaboradoEn" TIMESTAMP(3),
    "autorizadoPor" TEXT,
    "autorizadoEn" TIMESTAMP(3),

    CONSTRAINT "comprobantes_tesoreria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante_aplicaciones" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "facturaId" TEXT,
    "compraId" TEXT,
    "docRef" TEXT NOT NULL,
    "valorDocumento" DECIMAL(18,2) NOT NULL,
    "saldoAnterior" DECIMAL(18,2) NOT NULL,
    "valorAplicado" DECIMAL(18,2) NOT NULL,
    "saldoNuevo" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "comprobante_aplicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante_retenciones" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT,
    "base" DECIMAL(18,2) NOT NULL,
    "tarifa" DECIMAL(8,4) NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT '%',
    "valor" DECIMAL(18,2) NOT NULL,
    "municipio" TEXT,

    CONSTRAINT "comprobante_retenciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consecutivos_documento" (
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "actual" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "consecutivos_documento_pkey" PRIMARY KEY ("usuarioId","tipo","anio")
);

-- CreateIndex
CREATE INDEX "comprobantes_tesoreria_usuarioId_tipo_fecha_idx" ON "comprobantes_tesoreria"("usuarioId", "tipo", "fecha");

-- CreateIndex
CREATE INDEX "comprobantes_tesoreria_usuarioId_estado_idx" ON "comprobantes_tesoreria"("usuarioId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "comprobantes_tesoreria_usuarioId_tipo_anio_consecutivo_key" ON "comprobantes_tesoreria"("usuarioId", "tipo", "anio", "consecutivo");

-- CreateIndex
CREATE INDEX "comprobante_aplicaciones_comprobanteId_idx" ON "comprobante_aplicaciones"("comprobanteId");

-- CreateIndex
CREATE INDEX "comprobante_aplicaciones_facturaId_idx" ON "comprobante_aplicaciones"("facturaId");

-- CreateIndex
CREATE INDEX "comprobante_aplicaciones_compraId_idx" ON "comprobante_aplicaciones"("compraId");

-- CreateIndex
CREATE INDEX "comprobante_retenciones_comprobanteId_idx" ON "comprobante_retenciones"("comprobanteId");

-- AddForeignKey
ALTER TABLE "comprobantes_tesoreria" ADD CONSTRAINT "comprobantes_tesoreria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes_tesoreria" ADD CONSTRAINT "comprobantes_tesoreria_cuentaTesoreriaId_fkey" FOREIGN KEY ("cuentaTesoreriaId") REFERENCES "cuentas_tesoreria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_aplicaciones" ADD CONSTRAINT "comprobante_aplicaciones_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes_tesoreria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_aplicaciones" ADD CONSTRAINT "comprobante_aplicaciones_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_aplicaciones" ADD CONSTRAINT "comprobante_aplicaciones_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_retenciones" ADD CONSTRAINT "comprobante_retenciones_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes_tesoreria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consecutivos_documento" ADD CONSTRAINT "consecutivos_documento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
