-- Recargos separados de las horas extra: ambos cotizan, pero el trabajo suplementario no entra
-- en la base de vacaciones (art. 192 num. 2 CST).
ALTER TABLE "nominas" ADD COLUMN "recargos" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Periodo liquidado ("AAAA-MM"). Se agrega nullable, se rellena desde la fecha de liquidación y
-- solo entonces se vuelve obligatorio: las nóminas ya emitidas no se pueden perder.
ALTER TABLE "nominas" ADD COLUMN "periodo" TEXT;

UPDATE "nominas" SET "periodo" = to_char("fechaLiquidacion", 'YYYY-MM') WHERE "periodo" IS NULL;

-- Antes de la restricción sí podían existir dos liquidaciones del mismo empleado y periodo. No se
-- borra ninguna: a las repetidas se les marca el periodo con un sufijo para que la restricción
-- entre y quede visible cuál hay que revisar.
UPDATE "nominas" n
SET "periodo" = n."periodo" || '-dup' || d.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "empleadoId", "periodo" ORDER BY "createdAt") AS rn
  FROM "nominas"
) d
WHERE d."id" = n."id" AND d.rn > 1;

ALTER TABLE "nominas" ALTER COLUMN "periodo" SET NOT NULL;

CREATE UNIQUE INDEX "nominas_empleadoId_periodo_key" ON "nominas"("empleadoId", "periodo");
