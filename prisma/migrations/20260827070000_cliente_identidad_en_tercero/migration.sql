-- La identidad para exógena se unifica en `Tercero`.
--
-- Las ocho columnas que se eliminan estuvieron duplicadas en `clientes` y NUNCA tuvieron
-- formulario: verificado antes de migrar que las cuatro filas existentes las tenían todas en
-- NULL. No se pierde ningún dato.
--
-- El problema que cierra: un mismo NIT que era cliente y proveedor tenía DOS identidades, y la
-- DIAN cruza el 1007 del receptor contra el 1001 del pagador. Dos identidades para un NIT es un
-- cruce que no cuadra.

-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "codigoDepartamento",
DROP COLUMN "codigoMunicipio",
DROP COLUMN "codigoPais",
DROP COLUMN "otrosNombres",
DROP COLUMN "primerApellido",
DROP COLUMN "primerNombre",
DROP COLUMN "segundoApellido",
DROP COLUMN "tipoDocumentoDian",
ADD COLUMN     "terceroId" TEXT;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

