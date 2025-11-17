-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fecha_baja" TIMESTAMP(3);
