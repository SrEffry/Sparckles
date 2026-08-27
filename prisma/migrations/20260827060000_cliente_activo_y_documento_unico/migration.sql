-- Cliente: inactivación en vez de borrado, y unicidad por documento.
--
-- POR QUÉ. `Factura.clienteId` no tiene llave foránea, así que borrar un cliente dejaba el id
-- apuntando a nada y sus facturas DESAPARECÍAN en silencio de los extractos de exógena (1003,
-- 1006 y 1007), dejando ingresos e IVA generado por debajo de lo declarado. Y sin unicidad por
-- documento, dos fichas del mismo NIT producían dos identidades distintas en un reporte que
-- agrupa el año entero por documento.

ALTER TABLE "clientes" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "documentoNormalizado" TEXT;

-- Backfill ANTES de crear el índice, para que un choque falle aquí y no deje datos a medias.
-- Se replica `normalizarDocumento()`: se corta en el guion (el DV no es parte del documento) y
-- se dejan solo dígitos. Verificado antes de migrar que no produce duplicados.
UPDATE "clientes"
SET "documentoNormalizado" = NULLIF(
      regexp_replace(split_part(COALESCE("nit", "numeroDocumento", ''), '-', 1), '[^0-9]', '', 'g'),
      ''
    );

CREATE UNIQUE INDEX "clientes_usuarioId_documentoNormalizado_key" ON "clientes"("usuarioId", "documentoNormalizado");
