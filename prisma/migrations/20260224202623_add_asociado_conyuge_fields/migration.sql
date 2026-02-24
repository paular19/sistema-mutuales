-- AlterTable
ALTER TABLE "asociados" ADD COLUMN     "dni_conyuge" VARCHAR(20),
ADD COLUMN     "nombre_conyuge" VARCHAR(100),
ADD COLUMN     "tiene_conyuge" BOOLEAN NOT NULL DEFAULT false;
