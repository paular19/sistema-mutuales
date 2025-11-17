-- CreateTable
CREATE TABLE "Cancelacion" (
    "id_cancelacion" SERIAL NOT NULL,
    "id_mutual" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cancelacion_pkey" PRIMARY KEY ("id_cancelacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cancelacion_id_mutual_periodo_key" ON "Cancelacion"("id_mutual", "periodo");

-- AddForeignKey
ALTER TABLE "Cancelacion" ADD CONSTRAINT "Cancelacion_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;
