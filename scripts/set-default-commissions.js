const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Conectando a la base de datos...');

    // Use raw SQL to avoid Prisma filter issues with null for numeric columns
    const resGestion = await prisma.$executeRawUnsafe(
        `UPDATE productos SET comision_gestion = 7 WHERE comision_gestion IS NULL OR comision_gestion = 0;`
    );

    const resComerc = await prisma.$executeRawUnsafe(
        `UPDATE productos SET comision_comerc = 3 WHERE comision_comerc IS NULL OR comision_comerc = 0;`
    );

    console.log(`Query raw affected rows (gestion): ${resGestion}`);
    console.log(`Query raw affected rows (comerc): ${resComerc}`);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
