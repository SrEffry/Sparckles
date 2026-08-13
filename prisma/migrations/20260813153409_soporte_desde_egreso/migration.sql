-- AlterTable
ALTER TABLE "documentos_soporte" ADD COLUMN     "emisorSnapshot" JSONB,
ADD COLUMN     "totalPagado" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "mapa_cuentas" ADD COLUMN     "anticiposPorLegalizar" TEXT;
