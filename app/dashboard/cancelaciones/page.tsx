import { getCancelacionDesdeLiquidacion } from "@/lib/queries/cancelacion";
import { cobrarCuotasDesdeCancelacion } from "@/lib/actions/cancelacion";

import { CancelacionesTable } from "@/components/cancelaciones/cancelaciones-table";
import { CancelacionesImport } from "@/components/cancelaciones/cancelaciones-import";
import { CobrarSubmitButton } from "@/components/cancelaciones/cobrar-submit-button";
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

  async function handleCobrar(formData: FormData) {
    "use server";
    return cobrarCuotasDesdeCancelacion(liquidacionId, formData);
  }

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
            <form action={handleCobrar} className="space-y-6">
              <CancelacionesTable filas={cuotasPendientes} tipo="impagas" />

              {cuotasPendientes.length > 0 && (
                <div className="flex justify-end">
                  <CobrarSubmitButton />
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
