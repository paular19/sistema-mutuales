const { PrismaClient } = require('@prisma/client');

(async () => {
    const prisma = new PrismaClient();
    try {
        console.log('=== MUTUALES ===');
        const mutuales = await prisma.mutual.findMany();
        console.table(mutuales.map(m => ({ id: m.id_mutual, nombre: m.nombre, cuit: m.cuit })));

        console.log('\n=== USUARIOS ===');
        const usuarios = await prisma.usuario.findMany({
            include: { mutual: true }
        });
        console.table(usuarios.map(u => ({
            email: u.email,
            clerkId: u.clerkId.substring(0, 20) + '...',
            mutual_id: u.id_mutual,
            mutual_nombre: u.mutual?.nombre || 'N/A'
        })));

    } catch (err) {
        console.error('❌ Error:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
