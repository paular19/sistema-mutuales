const { PrismaClient } = require('@prisma/client');
const { addMonths } = require('date-fns');

function ultimoDiaDelMes(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function ajustarAlMes(base, dia, regla) {
    const last = ultimoDiaDelMes(base);
    const target = regla === 'AJUSTAR_ULTIMO_DIA' && dia > last ? last : dia;
    return new Date(base.getFullYear(), base.getMonth(), target);
}

function primeraFechaVencimiento(hoy, dia, regla) {
    const candidato = ajustarAlMes(hoy, dia, regla);
    if (hoy.getTime() <= candidato.getTime()) return candidato;
    return ajustarAlMes(addMonths(candidato, 1), dia, regla);
}

(async () => {
    const prisma = new PrismaClient();
    try {
        const producto = await prisma.producto.findFirst({ where: { activo: true } });
        const asociado = await prisma.asociado.findFirst();

        if (!producto) {
            console.error('No se encontró producto activo en la base de datos');
            process.exit(1);
        }
        if (!asociado) {
            console.error('No se encontró asociado en la base de datos');
            process.exit(1);
        }

        // VALORES DE PRUEBA ESPECÍFICOS
        const adjustedMonto = 1078200.00; // F9 - monto final sobre el que se aplica la cuota
        const tasaMensualPercent = 9.58; // L10 - tasa mensual en porcentaje
        const numeroCuotas = 6; // F10 - número de cuotas

        const hoy = new Date();
        const tasaMensual = tasaMensualPercent / 100;

        const gestionPct = producto.comision_gestion && producto.comision_gestion > 0 ? producto.comision_gestion : 7.816712;
        const comercializadoraPct = producto.comision_comerc && producto.comision_comerc > 0 ? producto.comision_comerc : 3;

        // Calcular monto inicial desde adjustedMonto
        const monto = adjustedMonto / (1 + gestionPct / 100);

        const primera_venc = primeraFechaVencimiento(hoy, producto.dia_vencimiento, producto.regla_vencimiento);

        const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const primeraSinHora = new Date(primera_venc.getFullYear(), primera_venc.getMonth(), primera_venc.getDate());
        const msPorDia = 1000 * 60 * 60 * 24;
        const diasEntre = Math.max(0, Math.round((primeraSinHora.getTime() - hoySinHora.getTime()) / msPorDia));

        const diasExtra = Math.max(0, diasEntre - 30);
        const interesProrrateado = adjustedMonto * (tasaMensualPercent / 30) * (diasExtra / 100);

        console.log('📅 Cálculo de prorrateo:');
        console.log('  - Hoy:', hoy.toISOString().slice(0, 10));
        console.log('  - Primera vencimiento:', primera_venc.toISOString().slice(0, 10));
        console.log('  - Días entre fechas:', diasEntre);
        console.log('  - Días extra (para prorrateo):', diasExtra);
        console.log('  - Interés prorrateado:', interesProrrateado.toFixed(2));

        const i = tasaMensualPercent / 100;
        const pow = Math.pow(1 + i, numeroCuotas);
        const cuotaBruta = adjustedMonto * (pow * i) / (pow - 1);
        const primeraCuotaBruta = cuotaBruta + interesProrrateado;

        const cuotas = [];
        let outstanding = adjustedMonto;

        for (let idx = 0; idx < numeroCuotas; idx++) {
            const fecha_vencimiento = ajustarAlMes(addMonths(primera_venc, idx), producto.dia_vencimiento, producto.regla_vencimiento);
            const esPrimera = idx === 0;

            const interesEstandar = outstanding * tasaMensual;
            const monto_interes = esPrimera ? interesEstandar + interesProrrateado : interesEstandar;

            const principalPago = cuotaBruta - interesEstandar;
            const monto_capital = idx === numeroCuotas - 1 ? Math.round(outstanding * 100) / 100 : Math.round(principalPago * 100) / 100;

            const bruto = esPrimera ? primeraCuotaBruta : cuotaBruta;
            const monto_total = Math.round(bruto * (1 - comercializadoraPct / 100) * 100) / 100;

            cuotas.push({
                numero_cuota: idx + 1,
                estado: 'pendiente',
                fecha_vencimiento,
                monto_capital,
                monto_interes: Math.round(monto_interes * 100) / 100,
                monto_total,
            });

            outstanding = Math.round((outstanding - monto_capital) * 1000000) / 1000000;
        }

        const saldoInicial = cuotas.reduce((acc, c) => acc + c.monto_total, 0);

        const credito = await prisma.credito.create({
            data: {
                id_mutual: producto.id_mutual,
                id_asociado: asociado.id_asociado,
                id_producto: producto.id_producto,
                monto,
                tasa_interes: producto.tasa_interes,
                numero_cuotas: numeroCuotas,
                dia_vencimiento: producto.dia_vencimiento,
                regla_vencimiento: producto.regla_vencimiento,
                primera_venc,
                saldo_capital_inicial: saldoInicial,
                saldo_capital_actual: saldoInicial,
                cuotas_pagadas: 0,
                cuotas_pendientes: numeroCuotas,
                estado: 'activo',
                usuario_creacion: 'script_test',
            },
        });

        for (const c of cuotas) {
            await prisma.cuota.create({ data: { ...c, id_credito: credito.id_credito } });
        }

        console.log('Crédito creado:', credito.id_credito);
        console.log('Valores de entrada: F9 (adjustedMonto)=', adjustedMonto, 'L10 (tasa%)=', tasaMensualPercent, 'F10 (cuotas)=', numeroCuotas);
        console.log('Monto inicial calculado:', monto);
        console.log('Cuota bruta calculada:', cuotaBruta.toFixed(2));
        console.log('Primera cuota bruta (+ prorrateo):', primeraCuotaBruta.toFixed(2));
        console.log('Saldo inicial (suma cuotas netas):', saldoInicial);
        console.table(cuotas.map(q => ({ n: q.numero_cuota, fecha: q.fecha_vencimiento.toISOString().slice(0, 10), capital: q.monto_capital, interes: q.monto_interes, total: q.monto_total })));
    } catch (err) {
        console.error('Error creando crédito de prueba:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
