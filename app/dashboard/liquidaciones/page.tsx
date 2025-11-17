import Link from "next/link";
import { getPreLiquidacionActual } from "@/lib/queries/liquidaciones";
import { LiquidacionesFilters } from "@/components/liquidacion/liquidaciones-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Settings, Clock } from "lucide-react";
import { LiquidacionesPageClient } from "@/components/liquidacion/liquidaciones-page-client";

interface SearchParams {
  search?: string;
  producto?: string;
  page?: string;
}

export default async function LiquidacionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = parseInt(searchParams.page || "1");
  const limit = 10;

  // 🔹 Traemos las cuotas
  const { filas, total, proximoCierre } = await getPreLiquidacionActual(searchParams ?? {});

  const totalPages = Math.ceil(filas.length / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedRows = filas.slice(startIndex, startIndex + limit);

  return (
    <div className="space-y-6">
      {/* 🧭 HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liquidaciones</h1>
          <p className="text-sm text-muted-foreground">
            Cuotas a cobrar del período actual
          </p>

          {proximoCierre && (
            <p className="text-xs text-muted-foreground mt-1">
              Mostrando cuotas con vencimiento hasta{" "}
              <strong>{formatDate(proximoCierre)}</strong>.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/liquidaciones/configuracion">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
          </Link>

          <Link href="/dashboard/liquidaciones/historico">
            <Button variant="default" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ver histórico
            </Button>
          </Link>
        </div>
      </div>

      {/* 🔍 Filtros */}
      <LiquidacionesFilters />

      {/* 📋 Tabla y acciones */}
      <Card>
        <CardContent>
          <LiquidacionesPageClient
            cuotas={paginatedRows}
            total={total}
            page={page}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>

      {/* 📄 Paginación */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl="/dashboard/liquidaciones"
        />
      )}
    </div>
  );
}
