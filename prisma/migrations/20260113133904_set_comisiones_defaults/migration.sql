/*
  Warnings:

  - Made the column `comision_gestion` on table `productos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "productos" ALTER COLUMN "comision_comerc" SET DEFAULT 3,
ALTER COLUMN "comision_gestion" SET NOT NULL,
ALTER COLUMN "comision_gestion" SET DEFAULT 7.25;
