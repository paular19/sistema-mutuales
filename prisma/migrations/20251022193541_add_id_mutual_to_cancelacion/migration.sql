-- DropForeignKey
ALTER TABLE "Cancelacion" DROP CONSTRAINT "Cancelacion_id_mutual_fkey";

-- AlterTable
ALTER TABLE "Cancelacion" ALTER COLUMN "id_mutual" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Cancelacion" ADD CONSTRAINT "Cancelacion_id_mutual_fkey" FOREIGN KEY ("id_mutual") REFERENCES "mutuales"("id_mutual") ON DELETE SET NULL ON UPDATE CASCADE;
