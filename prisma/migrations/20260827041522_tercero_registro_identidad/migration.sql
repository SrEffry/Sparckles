-- AlterTable
ALTER TABLE "compras" ADD COLUMN     "terceroId" TEXT;

-- AlterTable
ALTER TABLE "documentos_soporte" ADD COLUMN     "terceroId" TEXT;

-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "codigoDepartamento" TEXT,
ADD COLUMN     "codigoMunicipio" TEXT,
ADD COLUMN     "codigoPais" TEXT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "otrosNombres" TEXT,
ADD COLUMN     "primerApellido" TEXT,
ADD COLUMN     "primerNombre" TEXT,
ADD COLUMN     "segundoApellido" TEXT,
ADD COLUMN     "tipoDocumentoDian" TEXT;

-- CreateTable
CREATE TABLE "terceros" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documento" TEXT NOT NULL,
    "dv" TEXT,
    "tipoDocumentoDian" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'juridica',
    "nombre" TEXT NOT NULL,
    "razonSocial" TEXT,
    "primerApellido" TEXT,
    "segundoApellido" TEXT,
    "primerNombre" TEXT,
    "otrosNombres" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "codigoDepartamento" TEXT,
    "codigoMunicipio" TEXT,
    "codigoPais" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "terceros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terceros_usuarioId_idx" ON "terceros"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "terceros_usuarioId_documento_key" ON "terceros"("usuarioId", "documento");

-- AddForeignKey
ALTER TABLE "terceros" ADD CONSTRAINT "terceros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_soporte" ADD CONSTRAINT "documentos_soporte_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;
