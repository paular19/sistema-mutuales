(async () => {
    try {
        const email = 'fedemarconetto@hotmail.com';
        const mutualId = 2;
        const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_A9fkAAN0PNcMOK7DYcDzWkAljMkG4yMz2AuLDfOrlz';

        // 1. Obtener usuarios de Clerk
        console.log('🔍 Buscando usuario en Clerk...\n');
        const response = await fetch('https://api.clerk.com/v1/users', {
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`
            }
        });

        const allUsers = await response.json();

        if (!Array.isArray(allUsers)) {
            console.log('Respuesta de Clerk:', allUsers);
            throw new Error('Formato inesperado de respuesta');
        }

        const clerkUser = allUsers.find(u =>
            u.email_addresses && u.email_addresses.some(e => e.email_address === email)
        );

        if (!clerkUser) {
            console.log(`❌ Usuario ${email} no encontrado en Clerk`);
            console.log('   El usuario debe registrarse primero en la aplicación');
            process.exit(1);
        }

        console.log(`✓ Usuario encontrado: ${clerkUser.id}`);
        console.log(`  Nombre: ${clerkUser.first_name} ${clerkUser.last_name}`);
        console.log(`  Mutual actual en Clerk: ${clerkUser.public_metadata?.mutualId || 'No asignada'}\n`);

        // 2. Actualizar metadata en Clerk
        console.log(`🔄 Actualizando mutualId a ${mutualId} en Clerk...`);
        const updateResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUser.id}/metadata`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_metadata: {
                    mutualId: mutualId
                }
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(`Error al actualizar Clerk: ${JSON.stringify(error)}`);
        }

        console.log(`✅ Metadata actualizado en Clerk\n`);
        console.log('Ahora ejecuta el script de sincronización:');
        console.log('  node scripts\\sync_clerk_users.js');

    } catch (err) {
        console.error('❌ Error:', err);
        process.exitCode = 1;
    }
})();
