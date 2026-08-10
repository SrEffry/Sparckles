-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipoEntidad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "razonSocial" TEXT,
    "nit" TEXT,
    "dv" TEXT,
    "nombres" TEXT,
    "apellidos" TEXT,
    "nombreCompleto" TEXT,
    "tipoDocumento" TEXT,
    "numeroDocumento" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "repNombres" TEXT,
    "repApellidos" TEXT,
    "repTipoDocumento" TEXT,
    "repNumeroDocumento" TEXT,
    "repTelefono" TEXT,
    "repEmail" TEXT,
    "pais" TEXT,
    "departamento" TEXT,
    "ciudad" TEXT,
    "direccion" TEXT,
    "codigoPostal" TEXT,
    "tarifaIvaRetenido" TEXT,
    "aplicaIva" BOOLEAN NOT NULL DEFAULT false,
    "caracteristicasTributarias" TEXT[],

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "nombres" TEXT,
    "apellidos" TEXT,
    "tipoDocumento" TEXT,
    "numeroDocumento" TEXT,
    "razonSocial" TEXT,
    "nombreComercial" TEXT,
    "nit" TEXT,
    "dv" TEXT,
    "personaContacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "departamento" TEXT,
    "esAgenteRetenedor" BOOLEAN NOT NULL DEFAULT false,
    "esAutorretenedor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT,
    "comoCompra" TEXT,
    "comoVende" TEXT,
    "tarifaIva" TEXT,
    "precioVenta" DECIMAL(18,2) NOT NULL,
    "linea" TEXT,
    "retAplica" BOOLEAN NOT NULL DEFAULT false,
    "retNombre" TEXT,
    "retTarifa" DECIMAL(6,3),
    "retCategoria" TEXT,
    "retConcepto" TEXT,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_facturacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "logo" TEXT,
    "razonSocial" TEXT,
    "nit" TEXT,
    "regimen" TEXT,
    "responsableIva" BOOLEAN NOT NULL DEFAULT true,
    "direccion" TEXT,
    "ciudad" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "actividadEconomica" TEXT,
    "pieFact" TEXT,
    "observaciones" TEXT,
    "resNumero" TEXT,
    "resFecha" TEXT NOT NULL,
    "prefijo" TEXT,
    "numeracionDesde" INTEGER,
    "numeracionHasta" INTEGER,
    "numeracionActual" INTEGER,
    "resVencimiento" TEXT NOT NULL,

    CONSTRAINT "config_facturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numero" INTEGER NOT NULL,
    "prefijo" TEXT NOT NULL,
    "numeroCompleto" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "fechaVencimiento" TEXT,
    "formaPago" TEXT,
    "medioPago" TEXT,
    "instrumentos" JSONB,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'emitida',
    "clienteId" TEXT,
    "clienteNombre" TEXT NOT NULL,
    "clienteTipo" TEXT,
    "clienteTipoDocumento" TEXT,
    "clienteNumeroDocumento" TEXT,
    "clienteDv" TEXT,
    "clienteTelefono" TEXT,
    "clienteEmail" TEXT,
    "clienteDireccion" TEXT,
    "clienteEsAgenteRetenedor" BOOLEAN NOT NULL DEFAULT false,
    "clienteEsAutorretenedor" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "totalDescuentos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "retenciones" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "totalACobrar" DECIMAL(18,2) NOT NULL,
    "retencionesFiscales" JSONB,
    "retencionesPorConcepto" JSONB,
    "emisorRazonSocial" TEXT,
    "emisorNit" TEXT,
    "emisorRegimen" TEXT,
    "emisorSnapshot" JSONB,
    "saldoAplicadoNC" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldoAplicadoND" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "motivoCodigo" TEXT NOT NULL,
    "motivoLabel" TEXT NOT NULL,
    "facturaId" TEXT,
    "facturaRef" TEXT,
    "clienteNombre" TEXT,
    "clienteDocumento" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "totalDescuentos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalIva" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalNota" DECIMAL(18,2) NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_items" (
    "id" TEXT NOT NULL,
    "notaId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "precioUnitario" DECIMAL(18,2) NOT NULL,
    "descuento" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "iva" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "base" DECIMAL(18,2) NOT NULL,
    "subtotalItem" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "nota_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "tipoContrato" TEXT,
    "salarioBase" DECIMAL(18,2) NOT NULL,
    "eps" TEXT,
    "afp" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empleadoId" TEXT,
    "fechaLiquidacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empleadoNombre" TEXT NOT NULL,
    "empleadoDocumento" TEXT,
    "empleadoCargo" TEXT,
    "salarioBase" DECIMAL(18,2) NOT NULL,
    "diasTrabajados" INTEGER NOT NULL DEFAULT 30,
    "salarioProporcional" DECIMAL(18,2) NOT NULL,
    "transporte" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "extras" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "comisiones" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "salud" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pension" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "prestamos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otrasDeducciones" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDevengos" DECIMAL(18,2) NOT NULL,
    "totalDeducciones" DECIMAL(18,2) NOT NULL,
    "neto" DECIMAL(18,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numFactura" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "fechaVencimiento" TEXT,
    "tipoDoc" TEXT,
    "condicionPago" TEXT,
    "medioPago" TEXT,
    "proveedorNombre" TEXT NOT NULL,
    "proveedorNit" TEXT,
    "proveedorTel" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "totalDescuentos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalIva" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalRetenciones" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBruto" DECIMAL(18,2) NOT NULL,
    "totalAPagar" DECIMAL(18,2) NOT NULL,
    "retenciones" JSONB,
    "observaciones" TEXT,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_items" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "precioUnitario" DECIMAL(18,2) NOT NULL,
    "descuento" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "iva" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "base" DECIMAL(18,2) NOT NULL,
    "subtotalItem" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "compra_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_puc" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "naturaleza" TEXT,
    "imputable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cuentas_puc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asientos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numero" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'comercial',
    "fecha" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'manual',
    "documentoRef" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'registrado',
    "totalDebitos" DECIMAL(18,2) NOT NULL,
    "totalCreditos" DECIMAL(18,2) NOT NULL,
    "diferencia" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,

    CONSTRAINT "asientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asiento_movimientos" (
    "id" TEXT NOT NULL,
    "asientoId" TEXT NOT NULL,
    "cuenta" TEXT NOT NULL,
    "nombreCuenta" TEXT NOT NULL,
    "debito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tercero" TEXT,

    CONSTRAINT "asiento_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_soporte" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numero" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "proveedorNombre" TEXT NOT NULL,
    "proveedorDocumento" TEXT,
    "concepto" TEXT NOT NULL,
    "bruto" DECIMAL(18,2) NOT NULL,
    "porcReteFuente" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "porcReteIca" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "reteFuente" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reteIca" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "neto" DECIMAL(18,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Emitido',

    CONSTRAINT "documentos_soporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_items" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "productoCodigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "precioUnitario" DECIMAL(18,2) NOT NULL,
    "descuento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "base" DECIMAL(18,2) NOT NULL,
    "tarifaIva" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "valorIva" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "extra" JSONB,

    CONSTRAINT "factura_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "empresas_usuarioId_idx" ON "empresas"("usuarioId");

-- CreateIndex
CREATE INDEX "clientes_usuarioId_idx" ON "clientes"("usuarioId");

-- CreateIndex
CREATE INDEX "productos_usuarioId_idx" ON "productos"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_usuarioId_codigo_key" ON "productos"("usuarioId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "config_facturacion_usuarioId_key" ON "config_facturacion"("usuarioId");

-- CreateIndex
CREATE INDEX "facturas_usuarioId_idx" ON "facturas"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_usuarioId_numeroCompleto_key" ON "facturas"("usuarioId", "numeroCompleto");

-- CreateIndex
CREATE INDEX "notas_usuarioId_idx" ON "notas"("usuarioId");

-- CreateIndex
CREATE INDEX "notas_facturaId_idx" ON "notas"("facturaId");

-- CreateIndex
CREATE UNIQUE INDEX "notas_usuarioId_numero_key" ON "notas"("usuarioId", "numero");

-- CreateIndex
CREATE INDEX "nota_items_notaId_idx" ON "nota_items"("notaId");

-- CreateIndex
CREATE INDEX "empleados_usuarioId_idx" ON "empleados"("usuarioId");

-- CreateIndex
CREATE INDEX "nominas_usuarioId_idx" ON "nominas"("usuarioId");

-- CreateIndex
CREATE INDEX "nominas_empleadoId_idx" ON "nominas"("empleadoId");

-- CreateIndex
CREATE INDEX "compras_usuarioId_idx" ON "compras"("usuarioId");

-- CreateIndex
CREATE INDEX "compra_items_compraId_idx" ON "compra_items"("compraId");

-- CreateIndex
CREATE INDEX "cuentas_puc_sector_idx" ON "cuentas_puc"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_puc_sector_codigo_key" ON "cuentas_puc"("sector", "codigo");

-- CreateIndex
CREATE INDEX "asientos_usuarioId_idx" ON "asientos"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "asientos_usuarioId_numero_key" ON "asientos"("usuarioId", "numero");

-- CreateIndex
CREATE INDEX "asiento_movimientos_asientoId_idx" ON "asiento_movimientos"("asientoId");

-- CreateIndex
CREATE INDEX "documentos_soporte_usuarioId_idx" ON "documentos_soporte"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_soporte_usuarioId_numero_key" ON "documentos_soporte"("usuarioId", "numero");

-- CreateIndex
CREATE INDEX "factura_items_facturaId_idx" ON "factura_items"("facturaId");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_facturacion" ADD CONSTRAINT "config_facturacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_items" ADD CONSTRAINT "nota_items_notaId_fkey" FOREIGN KEY ("notaId") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos" ADD CONSTRAINT "asientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_movimientos" ADD CONSTRAINT "asiento_movimientos_asientoId_fkey" FOREIGN KEY ("asientoId") REFERENCES "asientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_soporte" ADD CONSTRAINT "documentos_soporte_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_items" ADD CONSTRAINT "factura_items_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
