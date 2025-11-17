// import { prisma, setMutualContext } from '@/lib/db/prisma';
// import { getCurrentMutualId } from '@/lib/auth/get-tenant';
// import { Badge } from '@/components/ui/badge';
// import { formatCurrency } from '@/lib/utils/format';

// export async function UpcomingPayments() {
//   const mutualId = await getCurrentMutualId();
//   if (!mutualId) return null;

//   await setMutualContext(mutualId);

//   const proximasCuotas = await prisma.cuota.findMany({
//     where: {
//       id_mutual: mutualId,
//       estado: 'pendiente',
//       fecha_vencimiento: {
//         gte: new Date(),
//         lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // próximos 7 días
//       }
//     },
//     include: {
//       credito: {
//         include: {
//           asociado: {
//             select: {
//               nombre: true,
//               apellido: true
//             }
//           }
//         }
//       }
//     },
//     orderBy: { fecha_vencimiento: 'asc' },
//     take: 5
//   });

//   if (proximasCuotas.length === 0) {
//     return (
//       <p className="text-sm text-gray-500 text-center py-4">
//         No hay cuotas próximas a vencer
//       </p>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       {proximasCuotas.map((cuota) => {
//         const diasRestantes = Math.ceil(
//           (cuota.fecha_vencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
//         );

//         return (
//           <div key={cuota.id_cuota} className="flex items-center justify-between">
//             <div className="space-y-1">
//               <p className="text-sm font-medium">
//                 {cuota.credito.asociado.nombre} {cuota.credito.asociado.apellido}
//               </p>
//               <p className="text-xs text-gray-500">
//                 Cuota {cuota.numero_cuota} - {cuota.fecha_vencimiento.toLocaleDateString('es-AR')}
//               </p>
//             </div>
//             <div className="text-right space-y-1">
//               <p className="text-sm font-medium">
//                 {formatCurrency(cuota.monto_total)}
//               </p>
//               <Badge 
//                 variant={diasRestantes <= 1 ? 'destructive' : diasRestantes <= 3 ? 'secondary' : 'outline'}
//                 className="text-xs"
//               >
//                 {diasRestantes === 0 ? 'Hoy' : 
//                  diasRestantes === 1 ? 'Mañana' : 
//                  `${diasRestantes} días`}
//               </Badge>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }