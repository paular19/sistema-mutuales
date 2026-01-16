const { PrismaClient } = require('@prisma/client');

(async () => {
    const prisma = new PrismaClient();
    try {
        const email = 'fedemarconetto@hotmail.com';
        const mutualId = 2;

        const usuario = await prisma.usuario.findFirst({
            where: { email }
        });

        if (!usuario) {
            console.log('❌ Usuario no encontrado en la base de datos');
            console.log('   El usuario debe ingresar al sistema primero');
            process.exit(1);
        }

        await prisma.usuario.update({
            where: { id_usuario: usuario.id_usuario },
            data: { id_mutual: mutualId }
        });

        console.log(`✅ Mutual ${mutualId} asignada a ${email}`);
        console.log(`   ClerkId: ${usuario.clerkId}`);
        console.log('');
        console.log('⚠ IMPORTANTE: Actualiza en Clerk Dashboard el publicMetadata:');
        console.log(`   { "mutualId": ${mutualId} }`);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
