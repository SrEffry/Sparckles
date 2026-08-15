-- La unicidad de empleado + periodo solo debe regir entre las nóminas VIVAS. Con el índice total
-- había que renombrarle el periodo a la anulada para poder rehacer el mes, y eso muta el campo
-- que identifica un documento fiscal ya emitido.

-- Primero se suelta el índice total: mientras esté, ni siquiera se pueden restaurar los periodos.
DROP INDEX IF EXISTS "nominas_empleadoId_periodo_key";

-- Se les devuelve su periodo real a las que se renombraron al anularlas. Que coincida con una
-- nómina viva del mismo mes ya no es problema: el índice de abajo no cuenta las anuladas.
UPDATE "nominas"
SET "periodo" = split_part("periodo", '-anulada-', 1)
WHERE "periodo" LIKE '%-anulada-%';

CREATE INDEX IF NOT EXISTS "nominas_empleadoId_periodo_idx" ON "nominas"("empleadoId", "periodo");

CREATE UNIQUE INDEX "nominas_empleado_periodo_vivas"
  ON "nominas"("empleadoId", "periodo")
  WHERE "estado" <> 'Anulada';
