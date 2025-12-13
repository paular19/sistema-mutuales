/*
  Warnings:

  - You are about to drop the column `id_configuracion` on the `liquidaciones` table. All the data in the column will be lost.
  - You are about to drop the `configuraciones_cierre` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "configuraciones_cierre" DROP CONSTRAINT "configuraciones_cierre_id_mutual_fkey";

-- DropForeignKey
ALTER TABLE "liquidaciones" DROP CONSTRAINT "liquidaciones_id_configuracion_fkey";

-- DropIndex
DROP INDEX "liquidaciones_id_configuracion_periodo_key";

-- AlterTable
ALTER TABLE "liquidaciones" DROP COLUMN "id_configuracion";

-- DropTable
DROP TABLE "configuraciones_cierre";
