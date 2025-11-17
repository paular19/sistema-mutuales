-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('generada', 'revisada', 'cerrada');

-- CreateTable
CREATE TABLE "configuraciones_cierre" (
    "id_configuracion" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "dia_cierre" INTEGER NOT NULL,
    "ultima_liquidacion" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_cierre_pkey" PRIMARY KEY ("id_configuracion")
);

-- CreateTable
CREATE TABLE "liquidaciones" (
    "id_liquidacion" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "id_configuracion" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "fecha_cierre" TIMESTAMP(3) NOT NULL,
    "total_monto" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'generada',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id_liquidacion")
);

-- CreateTable
CREATE TABLE "liquidaciones_detalle" (
    "id_detalle" SERIAL NOT NULL,
    "id_liquidacion" INTEGER NOT NULL,
    "id_cuota" INTEGER NOT NULL,
    "monto_liquidado" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "liquidaciones_detalle_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateIndex
CREATE INDEX "configuraciones_cierre_id_mutual_idx" ON "configuraciones_cierre"("id_mutual");

-- CreateIndex
CREATE INDEX "liquidaciones_id_mutual_periodo_idx" ON "liquidaciones"("id_mutual", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_id_configuracion_periodo_key" ON "liquidaciones"("id_configuracion", "periodo");

-- CreateIndex
CREATE INDEX "liquidaciones_detalle_id_liquidacion_idx" ON "liquidaciones_detalle"("id_liquidacion");

-- CreateIndex
CREATE INDEX "liquidaciones_detalle_id_cuota_idx" ON "liquidaciones_detalle"("id_cuota");

-- AddForeignKey
ALTER TABLE "configuraciones_cierre" ADD CONSTRAINT "configuraciones_cierre_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_id_configuracion_fkey" FOREIGN KEY ("id_configuracion") REFERENCES "configuraciones_cierre"("id_configuracion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_detalle" ADD CONSTRAINT "liquidaciones_detalle_id_liquidacion_fkey" FOREIGN KEY ("id_liquidacion") REFERENCES "liquidaciones"("id_liquidacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_detalle" ADD CONSTRAINT "liquidaciones_detalle_id_cuota_fkey" FOREIGN KEY ("id_cuota") REFERENCES "cuotas"("id_cuota") ON DELETE RESTRICT ON UPDATE CASCADE;
