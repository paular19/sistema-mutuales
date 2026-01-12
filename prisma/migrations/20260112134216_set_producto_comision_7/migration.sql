/*
  Warnings:

  - You are about to drop the column `numero_cuotas` on the `productos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "productos" DROP COLUMN "numero_cuotas",
ALTER COLUMN "comision_comerc" SET DEFAULT 7;
