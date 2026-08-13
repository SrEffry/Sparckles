-- AlterTable
ALTER TABLE "certificados_retencion" ADD COLUMN     "anuladoEn" TIMESTAMP(3),
ADD COLUMN     "anuladoPor" TEXT,
ADD COLUMN     "motivoAnulacion" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "periodoDesde" TEXT,
ADD COLUMN     "periodoHasta" TEXT,
ADD COLUMN     "reemplazaAId" TEXT,
ADD COLUMN     "totalOperacion" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "compras" ADD COLUMN     "proveedorTipoDocumento" TEXT;

-- AlterTable
ALTER TABLE "retenciones_practicadas" ADD COLUMN     "baseOperacion" DECIMAL(18,2);
