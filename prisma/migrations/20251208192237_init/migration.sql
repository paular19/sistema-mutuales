/*
  Warnings:

  - Added the required column `id_mutual` to the `creditos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "asociados" ADD COLUMN     "saldo_disponible" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "creditos" ADD COLUMN     "id_mutual" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "creditos" ADD CONSTRAINT "creditos_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE RESTRICT ON UPDATE CASCADE;
