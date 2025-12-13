/*
  Warnings:

  - A unique constraint covering the columns `[codigo_externo]` on the table `creditos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "creditos" ADD COLUMN     "codigo_externo" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "creditos_codigo_externo_key" ON "creditos"("codigo_externo");
