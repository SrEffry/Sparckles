-- AlterTable
ALTER TABLE "compras" ADD COLUMN     "asientoId" TEXT;

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "asientoId" TEXT;

-- AlterTable
ALTER TABLE "mapa_cuentas" ADD COLUMN     "comprasInventario" TEXT,
ADD COLUMN     "devolucionesVentas" TEXT,
ADD COLUMN     "gastoNomina" TEXT,
ADD COLUMN     "gastosGenerales" TEXT,
ADD COLUMN     "ingresosVentas" TEXT,
ADD COLUMN     "otrasDeduccionesNomina" TEXT,
ADD COLUMN     "pensionPorPagar" TEXT,
ADD COLUMN     "prestamosEmpleados" TEXT,
ADD COLUMN     "salariosPorPagar" TEXT,
ADD COLUMN     "saludPorPagar" TEXT;

-- AlterTable
ALTER TABLE "nominas" ADD COLUMN     "asientoId" TEXT;

-- AlterTable
ALTER TABLE "notas" ADD COLUMN     "asientoId" TEXT;
