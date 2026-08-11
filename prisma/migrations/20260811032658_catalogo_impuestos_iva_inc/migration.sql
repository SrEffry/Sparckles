-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "inc" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otrosImpuestos" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "tratamientoIva" TEXT NOT NULL DEFAULT 'gravado';

-- CreateTable
CREATE TABLE "impuestos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigoDian" TEXT NOT NULL,
    "nombreDian" TEXT NOT NULL,
    "esNominal" BOOLEAN NOT NULL DEFAULT false,
    "tarifa" DECIMAL(6,3),
    "valorUnitario" DECIMAL(18,2),
    "unidadMedida" TEXT,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteHasta" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "impuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_impuestos" (
    "productoId" TEXT NOT NULL,
    "impuestoId" TEXT NOT NULL,

    CONSTRAINT "producto_impuestos_pkey" PRIMARY KEY ("productoId","impuestoId")
);

-- CreateTable
CREATE TABLE "factura_item_impuestos" (
    "id" TEXT NOT NULL,
    "facturaItemId" TEXT NOT NULL,
    "impuestoId" TEXT,
    "tipo" TEXT NOT NULL,
    "codigoDian" TEXT NOT NULL,
    "nombreDian" TEXT NOT NULL,
    "base" DECIMAL(18,2) NOT NULL,
    "esNominal" BOOLEAN NOT NULL DEFAULT false,
    "tarifa" DECIMAL(6,3),
    "valorUnitario" DECIMAL(18,2),
    "cantidad" DECIMAL(18,3),
    "valor" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "factura_item_impuestos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impuestos_tipo_idx" ON "impuestos"("tipo");

-- CreateIndex
CREATE INDEX "impuestos_vigenteDesde_idx" ON "impuestos"("vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "impuestos_usuarioId_codigo_key" ON "impuestos"("usuarioId", "codigo");

-- CreateIndex
CREATE INDEX "producto_impuestos_impuestoId_idx" ON "producto_impuestos"("impuestoId");

-- CreateIndex
CREATE INDEX "factura_item_impuestos_facturaItemId_idx" ON "factura_item_impuestos"("facturaItemId");

-- CreateIndex
CREATE INDEX "factura_item_impuestos_tipo_idx" ON "factura_item_impuestos"("tipo");

-- AddForeignKey
ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_impuestos" ADD CONSTRAINT "producto_impuestos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_impuestos" ADD CONSTRAINT "producto_impuestos_impuestoId_fkey" FOREIGN KEY ("impuestoId") REFERENCES "impuestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_item_impuestos" ADD CONSTRAINT "factura_item_impuestos_facturaItemId_fkey" FOREIGN KEY ("facturaItemId") REFERENCES "factura_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
