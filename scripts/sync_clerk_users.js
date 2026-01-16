const { PrismaClient } = require('@prisma/client');

(async () => {
    const prisma = new PrismaClient();
    try {
        const emails = ['ramospaula1996@gmail.com', 'fedemarconetto@hotmail.com'];

        console.log('Buscando usuarios en Clerk...\n');

        const response = await fetch('https://api.clerk.com/v1/users', {
            headers: {
                'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`
            }
        });

        const allUsers = await response.json();

        if (!Array.isArray(allUsers)) {
            console.log('Respuesta de Clerk:', allUsers);
            throw new Error('Formato inesperado de respuesta');
        }

        for (const email of emails) {
            const clerkUser = allUsers.find(u =>
                u.email_addresses && u.email_addresses.some(e => e.email_address === email)
            );

            if (!clerkUser) {
                console.log(`⚠ ${email} - No encontrado en Clerk`);
                continue;
            }

            const mutualId = clerkUser.public_metadata?.mutualId;
            console.log(`✓ ${email}`);
            console.log(`  ClerkId: ${clerkUser.id}`);
            console.log(`  MutualId en Clerk: ${mutualId || 'No asignado'}`);

            // Buscar en DB local
            const dbUser = await prisma.usuario.findFirst({
                where: { email }
            });

            if (!dbUser) {
                // Crear usuario en DB
                if (mutualId) {
                    await prisma.usuario.create({
                        data: {
                            clerkId: clerkUser.id,
                            email: email,
                            nombre: clerkUser.first_name || 'Usuario',
                            apellido: clerkUser.last_name || '',
                            id_mutual: mutualId
                        }
                    });
                    console.log(`  ✓ Usuario creado en DB con mutual ${mutualId}`);
                } else {
                    console.log(`  ⚠ No se puede crear en DB: falta mutualId en Clerk`);
                }
            } else {
                console.log(`  ✓ Ya existe en DB - Mutual: ${dbUser.id_mutual}`);

                // Actualizar si el mutualId de Clerk es diferente
                if (mutualId && dbUser.id_mutual !== mutualId) {
                    await prisma.usuario.update({
                        where: { id_usuario: dbUser.id_usuario },
                        data: { id_mutual: mutualId }
                    });
                    console.log(`  ✓ Mutual actualizada: ${dbUser.id_mutual} → ${mutualId}`);
                }
            }
            console.log('');
        }

        console.log('✅ Sincronización completada');

    } catch (err) {
        console.error('❌ Error:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
