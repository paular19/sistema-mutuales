
export const dynamic = "force-dynamic";

import { getPreLiquidacion } from "@/lib/queries/liquidaciones";
import { generarLiquidacion } from "@/lib/actions/liquidaciones";
import { LiquidacionesPageClient } from "@/components/liquidacion/liquidaciones-page-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

interface SearchParams {
  page?: string;
}

export default async function LiquidacionesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  // 🔥 Next.js 15: searchParams es Promise
  const searchParams = await props.searchParams;

  const page = Number(searchParams.page ?? 1);
  const limit = 10;

  // 🔹 Pre-liquidación on-demand (vencidas + arrastradas)
  const { cuotas, total } = await getPreLiquidacion();

  const totalPages = Math.max(1, Math.ceil(cuotas.length / limit));
  const startIndex = (page - 1) * limit;
  const paginatedRows = cuotas.slice(startIndex, startIndex + limit);

  return (
    <div className="space-y-6">
      {/* 🧭 HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Liquidaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Cuotas vencidas y arrastradas listas para liquidar
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await generarLiquidacion();
          }}
        >
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Generar liquidación
          </Button>
        </form>
      </div>

      {/* 📋 Tabla */}
      <Card>
        <CardContent>
          <LiquidacionesPageClient
            cuotas={paginatedRows}
            total={total}
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
