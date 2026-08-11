-- CreateTable
CREATE TABLE "mapa_cuentas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'comercial',
    "clientes" TEXT,
    "proveedores" TEXT,
    "anticipoClientes" TEXT,
    "reteFuenteFavor" TEXT,
    "reteIvaFavor" TEXT,
    "reteIcaFavor" TEXT,
    "reteFuentePorPagar" TEXT,
    "reteIvaPorPagar" TEXT,
    "reteIcaPorPagar" TEXT,
    "ivaGenerado" TEXT,
    "ivaDescontable" TEXT,
    "incPorPagar" TEXT,
    "gmf" TEXT,
    "descuentoProntoPago" TEXT,
    "ajusteAlPeso" TEXT,
    "retencionesEnCausacion" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mapa_cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_tesoreria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombre" TEXT NOT NULL,
    "cuentaPuc" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'banco',
    "medioPago" TEXT,
    "gravadaGmf" BOOLEAN NOT NULL DEFAULT true,
    "predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cuentas_tesoreria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mapa_cuentas_usuarioId_key" ON "mapa_cuentas"("usuarioId");

-- CreateIndex
CREATE INDEX "cuentas_tesoreria_usuarioId_idx" ON "cuentas_tesoreria"("usuarioId");

-- AddForeignKey
ALTER TABLE "mapa_cuentas" ADD CONSTRAINT "mapa_cuentas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_tesoreria" ADD CONSTRAINT "cuentas_tesoreria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
