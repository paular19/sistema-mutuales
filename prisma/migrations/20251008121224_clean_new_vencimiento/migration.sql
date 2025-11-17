-- CreateEnum
CREATE TYPE "EstadoCredito" AS ENUM ('activo', 'cancelado', 'vencido');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('pendiente', 'pagada', 'vencida', 'parcial');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('fisica', 'juridica');

-- CreateEnum
CREATE TYPE "VencimientoRegla" AS ENUM ('AJUSTAR_ULTIMO_DIA', 'ESTRICTO');

-- CreateTable
CREATE TABLE "mutuales" (
    "id_mutual" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "cuit" VARCHAR(20),
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mutuales_pkey" PRIMARY KEY ("id_mutual")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "apellido" VARCHAR(50),
    "email" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "id_mutual" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "asociados" (
    "id_asociado" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "nombre" VARCHAR(50),
    "apellido" VARCHAR(50),
    "cuit" VARCHAR(20),
    "sueldo_mes" DOUBLE PRECISION,
    "sueldo_ano" DOUBLE PRECISION,
    "fecha_nac" TIMESTAMP(3),
    "telefono" VARCHAR(20) NOT NULL,
    "email" VARCHAR(50),
    "profesion" VARCHAR(50),
    "dec_jurada" BOOLEAN NOT NULL,
    "calle" VARCHAR(100) NOT NULL,
    "codigo_postal" VARCHAR(10) NOT NULL,
    "departamento" VARCHAR(10),
    "es_extranjero" BOOLEAN NOT NULL DEFAULT false,
    "genero" VARCHAR(20),
    "id_tipo" INTEGER,
    "localidad" VARCHAR(50) NOT NULL,
    "numero_calle" INTEGER,
    "piso" VARCHAR(10),
    "provincia" VARCHAR(50) NOT NULL,
    "razon_social" VARCHAR(100),
    "recibe_notificaciones" BOOLEAN NOT NULL DEFAULT true,
    "tipo_persona" "TipoPersona" NOT NULL DEFAULT 'fisica',

    CONSTRAINT "asociados_pkey" PRIMARY KEY ("id_asociado")
);

-- CreateTable
CREATE TABLE "tipos_asociados" (
    "id_tipo" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,

    CONSTRAINT "tipos_asociados_pkey" PRIMARY KEY ("id_tipo")
);

-- CreateTable
CREATE TABLE "productos" (
    "id_producto" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "numero_cuotas" INTEGER NOT NULL,
    "tasa_interes" DOUBLE PRECISION NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dia_vencimiento" SMALLINT NOT NULL,
    "regla_vencimiento" "VencimientoRegla" NOT NULL DEFAULT 'AJUSTAR_ULTIMO_DIA',
    "comision_comerc" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "creditos" (
    "id_credito" SERIAL NOT NULL,
    "id_asociado" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DOUBLE PRECISION NOT NULL,
    "saldo_capital_inicial" DOUBLE PRECISION NOT NULL,
    "saldo_capital_actual" DOUBLE PRECISION NOT NULL,
    "cuotas_pagadas" INTEGER NOT NULL DEFAULT 0,
    "cuotas_pendientes" INTEGER NOT NULL,
    "estado" "EstadoCredito" NOT NULL DEFAULT 'activo',
    "usuario_creacion" VARCHAR(100) NOT NULL,
    "usuario_modificacion" VARCHAR(100),
    "observaciones" TEXT,
    "tasa_interes" DOUBLE PRECISION NOT NULL,
    "numero_cuotas" INTEGER NOT NULL,
    "dia_vencimiento" INTEGER NOT NULL,
    "regla_vencimiento" "VencimientoRegla" NOT NULL,
    "primera_venc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creditos_pkey" PRIMARY KEY ("id_credito")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id_cuota" SERIAL NOT NULL,
    "id_credito" INTEGER NOT NULL,
    "numero_cuota" INTEGER NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'pendiente',
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "monto_capital" DOUBLE PRECISION NOT NULL,
    "monto_interes" DOUBLE PRECISION NOT NULL,
    "monto_total" DOUBLE PRECISION NOT NULL,
    "interes_punitorio" DOUBLE PRECISION,

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id_cuota")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id_pago" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "monto_pago" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fecha_pago" TIMESTAMP(3) NOT NULL,
    "referencia" TEXT,
    "observaciones" VARCHAR(200),

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "pago_cuotas" (
    "id_pago_cuota" SERIAL NOT NULL,
    "id_pago" INTEGER NOT NULL,
    "id_cuota" INTEGER NOT NULL,
    "monto_pagado" DOUBLE PRECISION NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pago_cuotas_pkey" PRIMARY KEY ("id_pago_cuota")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_clerkId_key" ON "usuarios"("clerkId");

-- CreateIndex
CREATE INDEX "asociados_id_mutual_idx" ON "asociados"("id_mutual");

-- CreateIndex
CREATE INDEX "tipos_asociados_id_mutual_idx" ON "tipos_asociados"("id_mutual");

-- CreateIndex
CREATE INDEX "productos_id_mutual_idx" ON "productos"("id_mutual");

-- CreateIndex
CREATE INDEX "creditos_id_asociado_idx" ON "creditos"("id_asociado");

-- CreateIndex
CREATE INDEX "creditos_id_producto_idx" ON "creditos"("id_producto");

-- CreateIndex
CREATE UNIQUE INDEX "cuotas_id_credito_numero_cuota_key" ON "cuotas"("id_credito", "numero_cuota");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_referencia_key" ON "pagos"("referencia");

-- CreateIndex
CREATE INDEX "pagos_id_mutual_idx" ON "pagos"("id_mutual");

-- CreateIndex
CREATE INDEX "pago_cuotas_id_pago_idx" ON "pago_cuotas"("id_pago");

-- CreateIndex
CREATE INDEX "pago_cuotas_id_cuota_idx" ON "pago_cuotas"("id_cuota");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asociados" ADD CONSTRAINT "asociados_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asociados" ADD CONSTRAINT "asociados_id_tipo_fkey" FOREIGN KEY ("id_tipo") REFERENCES "tipos_asociados"("id_tipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_asociados" ADD CONSTRAINT "tipos_asociados_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditos" ADD CONSTRAINT "creditos_id_asociado_fkey" FOREIGN KEY ("id_asociado") REFERENCES "asociados"("id_asociado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditos" ADD CONSTRAINT "creditos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_id_credito_fkey" FOREIGN KEY ("id_credito") REFERENCES "creditos"("id_credito") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_cuotas" ADD CONSTRAINT "pago_cuotas_id_cuota_fkey" FOREIGN KEY ("id_cuota") REFERENCES "cuotas"("id_cuota") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_cuotas" ADD CONSTRAINT "pago_cuotas_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "pagos"("id_pago") ON DELETE RESTRICT ON UPDATE CASCADE;
