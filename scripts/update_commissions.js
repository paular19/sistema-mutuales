const { PrismaClient } = require('@prisma/client');

(async () => {
    const p = new PrismaClient();
    try {
        const res1 = await p.$executeRawUnsafe("UPDATE productos SET comision_gestion = 7.816712 WHERE comision_gestion IN (7.25, 7, 7.167, 7.8167);");
        const res2 = await p.$executeRawUnsafe("UPDATE productos SET comision_comerc = 3 WHERE comision_comerc = 0;");
        console.log('gestion updated (rows):', res1);
        console.log('comerc updated (rows):', res2);
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await p.$disconnect();
    }
})();
