-- AlterTable
ALTER TABLE "creditos" ADD COLUMN     "fuente_financiamiento_externa" TEXT NOT NULL DEFAULT 'fondo-propio',
ADD COLUMN     "moneda" VARCHAR(10) NOT NULL DEFAULT 'ARS',
ADD COLUMN     "tipo_operacion" VARCHAR(50) NOT NULL DEFAULT 'credito';

-- CreateTable
CREATE TABLE "Informe3688" (
    "id_informe" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_registros" INTEGER NOT NULL,
    "total_monto" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Informe3688_pkey" PRIMARY KEY ("id_informe")
);

-- AddForeignKey
ALTER TABLE "Informe3688" ADD CONSTRAINT "Informe3688_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;
