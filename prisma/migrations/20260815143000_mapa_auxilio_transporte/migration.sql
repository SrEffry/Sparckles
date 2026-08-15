-- El auxilio de transporte va a su propia cuenta de gasto: no es salario (art. 128 CST) y la
-- nómina electrónica lo exige identificado. Antes caía dentro de "Salario Básico Administrativo".
ALTER TABLE "mapa_cuentas" ADD COLUMN "gastoAuxilioTransporte" TEXT;
