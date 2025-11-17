// import { getCreditos } from '@/lib/queries/creditos';
// import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
// import { formatCurrency } from '@/lib/utils/format';

// export async function RecentCredits() {
//   const { creditos } = await getCreditos({ limit: 5 });

//   if (creditos.length === 0) {
//     return (
//       <p className="text-sm text-gray-500 text-center py-4">
//         No hay créditos registrados
//       </p>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       {creditos.map((credito) => (
//         <div key={credito.id_credito} className="flex items-center space-x-4">
//           <Avatar>
//             <AvatarFallback>
//               {credito.asociado.nombre[0]}{credito.asociado.apellido[0]}
//             </AvatarFallback>
//           </Avatar>
//           <div className="flex-1 space-y-1">
//             <p className="text-sm font-medium">
//               {credito.asociado.nombre} {credito.asociado.apellido}
//             </p>
//             <p className="text-xs text-gray-500">
//               {credito.producto.convenio.nombre} - {credito.producto.numero_cuotas} cuotas
//             </p>
//           </div>
//           <div className="text-right">
//             <p className="text-sm font-medium">
//               {formatCurrency(credito.monto)}
//             </p>
//             <p className="text-xs text-gray-500">
//               {credito.fecha_creacion.toLocaleDateString('es-AR')}
//             </p>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }