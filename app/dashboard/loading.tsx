import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <LoadingSpinner className="h-5 w-5" />
                <span>Cargando seccion...</span>
            </div>

            <DashboardSkeleton />

            <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                    <div
                        key={index}
                        className="space-y-3 rounded-lg border bg-card p-6 shadow-sm"
                    >
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56" />
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
