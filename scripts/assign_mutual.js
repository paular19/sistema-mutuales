const { PrismaClient } = require('@prisma/client');

(async () => {
    const prisma = new PrismaClient();
    try {
        // 1. Buscar la mutual de Paula
        const paulaUser = await prisma.usuario.findFirst({
            where: { email: 'ramospaula1996@gmail.com' },
            include: { mutual: true }
        });

        if (!paulaUser || !paulaUser.id_mutual) {
            console.error('❌ No se encontró la mutual de Paula');
            process.exit(1);
        }

        console.log('✓ Mutual encontrada:');
        console.log(`  ID: ${paulaUser.id_mutual}`);
        console.log(`  Nombre: ${paulaUser.mutual?.nombre}`);
        console.log('');

        const mutualId = paulaUser.id_mutual;
        const usuarios = ['ramospaula1996@gmail.com', 'fedemarconetto@hotmail.com'];

        // 2. Verificar y actualizar ambos usuarios
        for (const email of usuarios) {
            const usuario = await prisma.usuario.findFirst({
                where: { email }
            });

            if (!usuario) {
                console.log(`⚠ ${email} no tiene registro en la DB`);
                console.log(`   El usuario debe ingresar al sistema primero para que se cree su registro`);
                continue;
            }

            // Actualizar mutual si es diferente
            if (usuario.id_mutual !== mutualId) {
                await prisma.usuario.update({
                    where: { id_usuario: usuario.id_usuario },
                    data: { id_mutual: mutualId }
                });
                console.log(`✓ ${email} - Mutual actualizada en DB`);
            } else {
                console.log(`✓ ${email} - Ya tiene la mutual correcta en DB`);
            }

            console.log(`  ClerkId: ${usuario.clerkId}`);
            console.log(`  Verificar Clerk publicMetadata: { "mutualId": ${mutualId} }`);
            console.log('');
        }

        console.log('✅ Proceso completado');
        console.log('⚠ IMPORTANTE: Verifica que en Clerk Dashboard ambos usuarios tengan:');
        console.log(`   publicMetadata: { "mutualId": ${mutualId} }`);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
