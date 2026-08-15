-- El gasto de nómina del empleador se desagrega: una cuenta por componente. Las dos columnas
-- agregadas obligaban a contabilizar ARL y parafiscales bajo el nombre de otra cuenta.
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoSaludPatronal" TEXT;
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoPensionPatronal" TEXT;
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoArl" TEXT;
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoParafiscales" TEXT;
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoCesantias" TEXT;
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoInteresesCesantias" TEXT;
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoPrima" TEXT;
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoVacaciones" TEXT;

-- Lo ya configurado no se pierde: la cuenta agregada queda como punto de partida del componente
-- cuyo nombre llevaba. Los demás quedan vacíos y aparecen como pendientes en el mapa, que es
-- donde el usuario debe elegirlos.
UPDATE "mapa_cuentas" SET "gastoSaludPatronal" = "gastoAportesPatronales" WHERE "gastoAportesPatronales" IS NOT NULL;
UPDATE "mapa_cuentas" SET "gastoPrima" = "gastoPrestaciones" WHERE "gastoPrestaciones" IS NOT NULL;

ALTER TABLE "mapa_cuentas" DROP COLUMN "gastoAportesPatronales";
ALTER TABLE "mapa_cuentas" DROP COLUMN "gastoPrestaciones";
