const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://mutuales:mutuales123@localhost:5432/mutualesdb'
        }
    }
});

async function backup() {
    console.log('🔄 Iniciando backup de la base de datos local...\n');

    try {
        const data = {
            mutuales: await prisma.mutual.findMany(),
            usuarios: await prisma.usuario.findMany(),
            tiposAsociado: await prisma.tipoAsociado.findMany(),
            asociados: await prisma.asociado.findMany(),
            productos: await prisma.producto.findMany(),
            creditos: await prisma.credito.findMany({
                include: {
                    cuotas: true
                }
            }),
            pagos: await prisma.pago.findMany(),
            cancelaciones: await prisma.cancelacion.findMany(),
            liquidaciones: await prisma.liquidacion.findMany({
                include: {
                    detalle: true
                }
            }),
            informes3688: await prisma.informe3688.findMany()
        };

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-local-${timestamp}.json`;
        const filepath = path.join(__dirname, '..', 'prisma', 'backups', filename);

        // Crear directorio si no existe
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

        console.log('✅ Backup completado exitosamente!');
        console.log(`📁 Archivo: ${filename}`);
        console.log('\n📊 Estadísticas:');
        console.log(`   - Mutuales: ${data.mutuales.length}`);
        console.log(`   - Usuarios: ${data.usuarios.length}`);
        console.log(`   - Tipos de Asociado: ${data.tiposAsociado.length}`);
        console.log(`   - Asociados: ${data.asociados.length}`);
        console.log(`   - Productos: ${data.productos.length}`);
        console.log(`   - Créditos: ${data.creditos.length}`);
        console.log(`   - Cuotas: ${data.creditos.reduce((sum, c) => sum + (c.cuotas?.length || 0), 0)}`);
        console.log(`   - Pagos: ${data.pagos.length}`);
        console.log(`   - Cancelaciones: ${data.cancelaciones.length}`);
        console.log(`   - Liquidaciones: ${data.liquidaciones.length}`);
        console.log(`   - Informes 3688: ${data.informes3688.length}`);

        return filepath;
    } catch (error) {
        console.error('❌ Error al hacer backup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

backup();
