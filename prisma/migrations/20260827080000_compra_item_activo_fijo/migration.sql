-- El IVA en compra de activos fijos NO es descontable (art. 491 E.T.), y en el formato 1001
-- los activos fijos van al concepto 5008 y los movibles al 5007 (art. 60 E.T.).

-- AlterTable
ALTER TABLE "compra_items" ADD COLUMN     "esActivoFijo" BOOLEAN NOT NULL DEFAULT false;

