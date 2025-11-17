import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Simulamos que este request es de la Mutual 1
  await prisma.$executeRawUnsafe(`SET app.mutual_id = '1'`);
  const asociados1 = await prisma.asociado.findMany();
  console.log("Asociados visibles para mutual 1:", asociados1);

  // Ahora cambiamos a Mutual 2
  await prisma.$executeRawUnsafe(`SET app.mutual_id = '2'`);
  const asociados2 = await prisma.asociado.findMany();
  console.log("Asociados visibles para mutual 2:", asociados2);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
