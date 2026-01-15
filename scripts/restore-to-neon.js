const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// URL de Neon - usando la primera URL comentada del .env
const NEON_URL = 'postgresql://neondb_owner:npg_7oqwGyxTM5kR@ep-bitter-silence-acljubyy-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: NEON_URL
        }
    }
});

async function getLatestBackup() {
    const backupsDir = path.join(__dirname, '..', 'prisma', 'backups');
    const files = fs.readdirSync(backupsDir)
        .filter(f => f.startsWith('backup-local-') && f.endsWith('.json'))
        .sort()
        .reverse();

    if (files.length === 0) {
        throw new Error('No se encontraron archivos de backup');
    }

    return path.join(backupsDir, files[0]);
}

async function restore() {
    console.log('🔄 Iniciando restauración a Neon...\n');

    try {
        const backupFile = process.argv[2] || await getLatestBackup();
        console.log(`📁 Usando backup: ${path.basename(backupFile)}\n`);

        const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

        // Limpiar base de datos de Neon (orden importa por foreign keys)
        console.log('🗑️  Limpiando base de datos de Neon...');
        await prisma.informe3688.deleteMany();
        await prisma.liquidacionDetalle.deleteMany();
        await prisma.liquidacion.deleteMany();
        await prisma.cancelacion.deleteMany();
        await prisma.pagoCuota.deleteMany(); // Primero la tabla intermedia
        await prisma.pago.deleteMany();
        await prisma.cuota.deleteMany();
        await prisma.credito.deleteMany();
        await prisma.producto.deleteMany();
        await prisma.asociado.deleteMany();
        await prisma.tipoAsociado.deleteMany();
        await prisma.usuario.deleteMany();
        await prisma.mutual.deleteMany();
        console.log('✅ Base de datos limpiada\n');

        // Restaurar datos
        console.log('📥 Restaurando datos...\n');

        // Mutuales
        if (data.mutuales.length > 0) {
            await prisma.mutual.createMany({ data: data.mutuales });
            console.log(`✅ Mutuales: ${data.mutuales.length}`);
        }

        // Usuarios
        if (data.usuarios.length > 0) {
            await prisma.usuario.createMany({ data: data.usuarios });
            console.log(`✅ Usuarios: ${data.usuarios.length}`);
        }

        // Tipos de Asociado
        if (data.tiposAsociado.length > 0) {
            await prisma.tipoAsociado.createMany({ data: data.tiposAsociado });
            console.log(`✅ Tipos de Asociado: ${data.tiposAsociado.length}`);
        }

        // Asociados
        if (data.asociados.length > 0) {
            await prisma.asociado.createMany({ data: data.asociados });
            console.log(`✅ Asociados: ${data.asociados.length}`);
        }

        // Productos
        if (data.productos.length > 0) {
            await prisma.producto.createMany({ data: data.productos });
            console.log(`✅ Productos: ${data.productos.length}`);
        }

        // Créditos y Cuotas
        if (data.creditos.length > 0) {
            let totalCuotas = 0;
            for (const credito of data.creditos) {
                const { id_credito, cuotas, ...creditoData } = credito;

                // Limpiar IDs de cuotas también
                const cuotasLimpias = (cuotas || []).map(({ id_cuota, id_credito, ...cuotaData }) => cuotaData);

                await prisma.credito.create({
                    data: {
                        ...creditoData,
                        cuotas: {
                            create: cuotasLimpias
                        }
                    }
                });

                totalCuotas += cuotas?.length || 0;
            }
            console.log(`✅ Créditos: ${data.creditos.length}`);
            console.log(`✅ Cuotas: ${totalCuotas}`);
        }

        // Pagos
        if (data.pagos.length > 0) {
            await prisma.pago.createMany({ data: data.pagos });
            console.log(`✅ Pagos: ${data.pagos.length}`);
        }

        // Cancelaciones
        if (data.cancelaciones.length > 0) {
            await prisma.cancelacion.createMany({ data: data.cancelaciones });
            console.log(`✅ Cancelaciones: ${data.cancelaciones.length}`);
        }

        // Liquidaciones
        if (data.liquidaciones.length > 0) {
            for (const liquidacion of data.liquidaciones) {
                const { detalle, ...liquidacionData } = liquidacion;

                await prisma.liquidacion.create({
                    data: {
                        ...liquidacionData,
                        detalle: {
                            create: detalle || []
                        }
                    }
                });
            }
            console.log(`✅ Liquidaciones: ${data.liquidaciones.length}`);
        }

        // Informes 3688
        if (data.informes3688.length > 0) {
            await prisma.informe3688.createMany({ data: data.informes3688 });
            console.log(`✅ Informes 3688: ${data.informes3688.length}`);
        }

        console.log('\n✅ Restauración completada exitosamente!');
    } catch (error) {
        console.error('\n❌ Error al restaurar:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

restore();
