-- Normaliza `asiento_movimientos.tercero` en las filas ya escritas.
--
-- POR QUÉ. `lib/asientoAutomatico.js` normalizaba el documento, pero los comprobantes de
-- tesorería y las notas de contabilidad lo guardaban CRUDO, tal como se digitó. Con eso el mismo
-- tercero quedaba partido en varias filas del libro auxiliar —"900.123.456-7" y "900123456" son
-- dos— y de ahí sale el formato 1001, que agrupa el año entero por documento: el proveedor
-- aparecía dos veces, una con ficha y otra sin ella, y el cruce contra su 1007 no cuadraba.
--
-- El origen ya está corregido; esto arregla lo que quedó escrito antes. Sin este paso, los años
-- anteriores siguen partidos por más que el código nuevo esté bien.
--
-- Se replica `normalizarDocumento()`: se corta en el guion (el DV no es parte del documento) y
-- se dejan solo dígitos. Si no queda ningún dígito —alguien escribió un NOMBRE en el campo— se
-- pone NULL: mejor un movimiento sin tercero que un nombre en la casilla del NIT.

UPDATE "asiento_movimientos"
SET "tercero" = NULLIF(
      regexp_replace(split_part("tercero", '-', 1), '[^0-9]', '', 'g'),
      ''
    )
WHERE "tercero" IS NOT NULL
  AND "tercero" <> regexp_replace(split_part("tercero", '-', 1), '[^0-9]', '', 'g');
