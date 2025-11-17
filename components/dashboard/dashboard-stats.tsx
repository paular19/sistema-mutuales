import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { getDashboardStats } from '@/lib/queries/creditos';
// import { 
//   CreditCard, 
//   Users, 
//   TrendingUp, 
//   AlertTriangle,
//   Clock,
//   DollarSign
// } from 'lucide-react';

// export async function DashboardStats() {
  // const stats = await getDashboardStats();

  // const statCards = [
  //   {
  //     title: 'Total Créditos',
  //     value: stats.totalCreditos.toString(),
  //     icon: CreditCard,
  //     color: 'text-blue-600'
  //   },
  //   {
  //     title: 'Créditos Activos',
  //     value: stats.creditosActivos.toString(),
  //     icon: TrendingUp,
  //     color: 'text-green-600'
  //   },
  //   {
  //     title: 'Total Asociados',
  //     value: stats.totalAsociados.toString(),
  //     icon: Users,
  //     color: 'text-purple-600'
  //   },
  //   {
  //     title: 'Saldo Capital',
  //     value: new Intl.NumberFormat('es-AR', {
  //       style: 'currency',
  //       currency: 'ARS'
  //     }).format(stats.totalSaldoCapital),
  //     icon: DollarSign,
  //     color: 'text-green-600'
  //   },
  //   {
  //     title: 'Cuotas Vencidas',
  //     value: stats.cuotasVencidas.toString(),
  //     icon: AlertTriangle,
  //     color: 'text-red-600'
  //   },
  //   {
  //     title: 'Próximas a Vencer',
  //     value: stats.proximasVencer.toString(),
  //     icon: Clock,
  //     color: 'text-orange-600'
  //   }
  // ];

//   return (
//     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//       {statCards.map((stat, index) => (
//         <Card key={index}>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium text-gray-600">
//               {stat.title}
//             </CardTitle>
//             <stat.icon className={`h-4 w-4 ${stat.color}`} />
//           </CardHeader>
//           <CardContent>
//             <div className={`text-2xl font-bold ${stat.color}`}>
//               {stat.value}
//             </div>
//           </CardContent>
//         </Card>
//       ))}
//     </div>
//   );
// }