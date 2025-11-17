// import { PrismaClient, EstadoCuota, TipoPersona } from '@prisma/client';

// const prisma = new PrismaClient();

// async function crearMutualCompleta(nombre: string, cuit: string, clerkId: string, email: string) {
//   // Crear mutual
//   const mutual = await prisma.mutual.create({
//     data: { nombre, cuit, estado: true },
//   });
//   console.log(`✅ Mutual creada: ${mutual.nombre}`);

//   // Crear productos
//   const productos = await Promise.all([
//     prisma.producto.create({
//       data: {
//         id_mutual: mutual.id_mutual,
//         nombre: 'Crédito Personal 12 Cuotas',
//         numero_cuotas: 12,
//         tasa_interes: 30.0,
//         comision_comerc: 5.0,
//       },
//     }),
//     prisma.producto.create({
//       data: {
//         id_mutual: mutual.id_mutual,
//         nombre: 'Crédito Personal 24 Cuotas',
//         numero_cuotas: 24,
//         tasa_interes: 35.0,
//         comision_comerc: 7.0,
//       },
//     }),
//   ]);
//   console.log(`✅ Productos creados para ${mutual.nombre}`);

//   // Crear asociados
//   const asociados = await Promise.all([
//     prisma.asociado.create({
//       data: {
//         id_mutual: mutual.id_mutual,
//         tipo_persona: TipoPersona.fisica,
//         nombre: 'Juan',
//         apellido: 'Pérez',
//         cuit: '20301234567', // sin guiones, 11 dígitos
//         email: `${nombre.toLowerCase().replace(/\s/g, "")}+juan@email.com`,
//         telefono: '1123456789',
//         profesion: 'Contador',
//         sueldo_mes: 150000,
//         sueldo_ano: 1800000,
//         fecha_nac: new Date('1985-05-15'),
//         dec_jurada: true,
//         provincia: 'Buenos Aires',
//         localidad: 'CABA',
//         calle: 'Av. Corrientes',
//         numero_calle: 1234,
//         codigo_postal: '1414',
//         recibe_notificaciones: true,
//         es_extranjero: false,
//       },
//     }),
//     prisma.asociado.create({
//       data: {
//         id_mutual: mutual.id_mutual,
//         tipo_persona: TipoPersona.fisica,
//         nombre: 'María',
//         apellido: 'González',
//         cuit: '27259876543',
//         email: `${nombre.toLowerCase().replace(/\s/g, "")}+maria@email.com`,
//         telefono: '1134567890',
//         profesion: 'Docente',
//         sueldo_mes: 120000,
//         sueldo_ano: 1440000,
//         fecha_nac: new Date('1990-08-22'),
//         dec_jurada: false,
//         provincia: 'Córdoba',
//         localidad: 'Córdoba',
//         calle: 'Calle Falsa',
//         numero_calle: 456,
//         codigo_postal: '5000',
//         recibe_notificaciones: true,
//         es_extranjero: false,
//       },
//     }),
//     prisma.asociado.create({
//       data: {
//         id_mutual: mutual.id_mutual,
//         tipo_persona: TipoPersona.juridica,
//         razon_social: 'Agro S.A.',
//         cuit: '30765432109',
//         email: `${nombre.toLowerCase().replace(/\s/g, "")}+agro@email.com`,
//         telefono: '1144556677',
//         profesion: 'Comercio',
//         sueldo_mes: 0,
//         sueldo_ano: 0,
//         dec_jurada: true,
//         provincia: 'Santa Fe',
//         localidad: 'Rosario',
//         calle: 'Av. San Martín',
//         numero_calle: 789,
//         codigo_postal: '2000',
//         recibe_notificaciones: true,
//         es_extranjero: false,
//       },
//     }),
//   ]);
//   console.log(`✅ Asociados creados para ${mutual.nombre}`);

//   // Crear créditos con cuotas
//   for (let i = 0; i < 2; i++) {
//     const asociado = asociados[i % asociados.length];
//     const producto = productos[i % productos.length];
//     const monto = 50000 + i * 25000;

//     const credito = await prisma.credito.create({
//       data: {
//         id_asociado: asociado.id_asociado,
//         id_producto: producto.id_producto,
//         monto,
//         saldo_capital_inicial: monto,
//         saldo_capital_actual: monto,
//         cuotas_pendientes: producto.numero_cuotas,
//         usuario_creacion: "system",
//       },
//     });

//     const cuotasData = [];
//     const tasaMensual = producto.tasa_interes / 100 / 12;
//     const cuotaCapital = monto / producto.numero_cuotas;

//     for (let j = 1; j <= producto.numero_cuotas; j++) {
//       const saldoCapital = monto - cuotaCapital * (j - 1);
//       const interes = saldoCapital * tasaMensual;
//       const total = cuotaCapital + interes;

//       const fechaVencimiento = new Date();
//       fechaVencimiento.setMonth(fechaVencimiento.getMonth() + j);

//       cuotasData.push({
//         id_credito: credito.id_credito,
//         numero_cuota: j,
//         monto_capital: Math.round(cuotaCapital * 100) / 100,
//         monto_interes: Math.round(interes * 100) / 100,
//         monto_total: Math.round(total * 100) / 100,
//         fecha_vencimiento: fechaVencimiento,
//         estado: j <= 1 && i < 1 ? EstadoCuota.pagada : EstadoCuota.pendiente,
//       });
//     }
//     await prisma.cuota.createMany({ data: cuotasData });

//     if (i === 0) {
//       await prisma.pago.create({
//         data: {
//           id_mutual: mutual.id_mutual,
//           monto_pago: cuotasData[0].monto_total,
//           fecha_pago: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
//           referencia: `PAG-${credito.id_credito}-001`,
//         },
//       });

//       await prisma.credito.update({
//         where: { id_credito: credito.id_credito },
//         data: {
//           saldo_capital_actual: monto - cuotaCapital,
//           cuotas_pagadas: 1,
//           cuotas_pendientes: producto.numero_cuotas - 1,
//         },
//       });
//     }
//   }
//   console.log(`✅ Créditos y cuotas creados para ${mutual.nombre}`);

//   // Crear usuario administrador Clerk real
//   await prisma.usuario.create({
//     data: {
//       clerkId,
//       email,
//       nombre: 'Admin',
//       apellido: nombre,
//       id_mutual: mutual.id_mutual,
//     },
//   });
//   console.log(`✅ Usuario administrador creado para ${mutual.nombre}`);
// }

// async function main() {
//   console.log('🌱 Iniciando seed con 2 mutuales...');

//   // 👇 Reemplazá clerkId y email por valores reales de tu Clerk
//   await crearMutualCompleta("Mutual Demo 1", "20123456789", "real_clerk_id_1", "admin1@tudominio.com");
//   await crearMutualCompleta("Mutual Demo 2", "20987654321", "real_clerk_id_2", "admin2@tudominio.com");

//   console.log("🎉 Seed completado exitosamente con 2 mutuales!");
// }

// main()
//   .catch((e) => {
//     console.error('Error durante el seed:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
