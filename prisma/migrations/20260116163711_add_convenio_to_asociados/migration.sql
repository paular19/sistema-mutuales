-- CreateEnum
CREATE TYPE "Convenio" AS ENUM ('TRES_DE_ABRIL', 'CENTRO', 'CLINICA_SAN_RAFAEL');

-- AlterTable
ALTER TABLE "asociados" ADD COLUMN     "convenio" "Convenio";

-- AlterTable
ALTER TABLE "productos" ALTER COLUMN "comision_gestion" SET DEFAULT 7.816712;
