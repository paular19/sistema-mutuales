/*
  Warnings:

  - A unique constraint covering the columns `[id_credito,numero_cuota,fecha_vencimiento,monto_total]` on the table `cuotas` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "cuotas_id_credito_numero_cuota_key";

-- CreateIndex
CREATE UNIQUE INDEX "cuotas_id_credito_numero_cuota_fecha_vencimiento_monto_tota_key" ON "cuotas"("id_credito", "numero_cuota", "fecha_vencimiento", "monto_total");
