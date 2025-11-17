import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { DashboardStats } from '@/components/dashboard/dashboard-stats';
// import { RecentCredits } from '@/components/dashboard/recent-credits';
//import { UpcomingPayments } from '@/components/dashboard/upcoming-payments';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vista general de su mutual y operaciones activas
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        {/* <DashboardStats /> */}
      </Suspense>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Créditos Recientes</CardTitle>
            <CardDescription>
              Últimos créditos otorgados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>}>
              {/* <RecentCredits /> */}
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimientos</CardTitle>
            <CardDescription>
              Cuotas que vencen en los próximos 7 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>}>
              {/* <UpcomingPayments /> */}
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}