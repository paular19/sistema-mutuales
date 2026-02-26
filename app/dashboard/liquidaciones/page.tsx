
export const dynamic = "force-dynamic";

import { getPreLiquidacion } from "@/lib/queries/liquidaciones";
import { LiquidacionesPageClient } from "@/components/liquidacion/liquidaciones-page-client";
import { ProductoFilterExport } from "@/components/shared/producto-filter-export";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { getProductosOptions } from "@/lib/queries/productos";

interface SearchParams {
  page?: string;
  productoId?: string;
}

export default async function LiquidacionesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  // 🔥 Next.js 15: searchParams es Promise
  const searchParams = await props.searchParams;

  const page = Number(searchParams.page ?? 1);
  const productoIdRaw = Number(searchParams.productoId);
  const productoId = Number.isFinite(productoIdRaw) && productoIdRaw > 0 ? productoIdRaw : undefined;
  const limit = 10;

  // 🔹 Pre-liquidación on-demand (vencidas + arrastradas)
  const { cuotas, total } = await getPreLiquidacion({ productoId });
  const productos = await getProductosOptions();

  const totalPages = Math.max(1, Math.ceil(cuotas.length / limit));
  const startIndex = (page - 1) * limit;
  const paginatedRows = cuotas.slice(startIndex, startIndex + limit);

  return (
    <div className="space-y-6">
      {/* 🧭 HEADER */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Liquidaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Cuotas vencidas y arrastradas listas para liquidar
          </p>
        </div>
      </div>

      <ProductoFilterExport
        productos={productos}
        pageBasePath="/dashboard/liquidaciones"
        exportBasePath="/endpoints/liquidaciones/export"
        selectedProductoId={productoId}
      />

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
