import { getCancelacionDesdeLiquidacion } from "@/lib/queries/cancelacion";
import { cobrarCuotasDesdeCancelacion } from "@/lib/actions/cancelacion";

import { CancelacionesImport } from "@/components/cancelaciones/cancelaciones-import";
import { CancelacionesCobroForm } from "@/components/cancelaciones/cancelaciones-cobro-form";
import { Card, CardContent } from "@/components/ui/card";
import { getProductosOptions } from "@/lib/queries/productos";
import { ProductoFilterExport } from "@/components/shared/producto-filter-export";

interface SearchParams {
  productoId?: string;
}

export default async function CancelacionesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const productoIdRaw = Number(searchParams.productoId);
  const productoId = Number.isFinite(productoIdRaw) && productoIdRaw > 0 ? productoIdRaw : undefined;

  const data = await getCancelacionDesdeLiquidacion({ productoId });
  const productos = await getProductosOptions();

  if (!data) return null;

  const { liquidacionId, cuotasPendientes } = data;
  const handleCobrar = cobrarCuotasDesdeCancelacion.bind(null, liquidacionId);

  return (
    <div className="space-y-6">
      {/* 🧭 HEADER */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cancelaciones</h1>
          <p className="text-sm text-muted-foreground">Cuotas pendientes de cobro</p>
        </div>
      </div>

      <ProductoFilterExport
        productos={productos}
        pageBasePath="/dashboard/cancelaciones"
        exportBasePath="/endpoints/cancelaciones/export"
        selectedProductoId={productoId}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cuotas pendientes de cobro</h2>

        {/* ✅ Importador solo UNA VEZ (no dentro de la tabla) */}
        <CancelacionesImport />

        <Card>
          <CardContent className="pt-6">
            <CancelacionesCobroForm filas={cuotasPendientes} action={handleCobrar} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
