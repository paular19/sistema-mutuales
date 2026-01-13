const { PrismaClient } = require('@prisma/client');

(async () => {
    const p = new PrismaClient();
    try {
        const rows = await p.producto.findMany({ take: 10 });
        const out = rows.map(r => ({ id: r.id_producto, nombre: r.nombre, comision_gestion: r.comision_gestion, comision_comerc: r.comision_comerc }));
        console.log(JSON.stringify(out, null, 2));
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await p.$disconnect();
    }
})();
