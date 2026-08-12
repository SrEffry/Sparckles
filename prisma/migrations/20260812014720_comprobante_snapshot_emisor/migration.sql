-- AlterTable
ALTER TABLE "comprobantes_tesoreria" ADD COLUMN     "emisorNit" TEXT,
ADD COLUMN     "emisorRazonSocial" TEXT,
ADD COLUMN     "emisorSnapshot" JSONB;
