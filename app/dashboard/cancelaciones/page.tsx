import { getCancelacionDesdeLiquidacion } from "@/lib/queries/cancelacion";
import {
  cobrarCuotasDesdeCancelacion,
  cerrarCancelacion,
} from "@/lib/actions/cancelacion";

import { CancelacionesTable } from "@/components/cancelaciones/cancelaciones-table";
import { CancelacionesImport } from "@/components/cancelaciones/cancelaciones-import";
import { CobrarSubmitButton } from "@/components/cancelaciones/cobrar-submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";
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

  const { periodo, liquidacionId, cuotasPagadas, cuotasPendientes, totalPagadas, totalPendientes } =
    data;

  async function handleCobrar(formData: FormData) {
    "use server";
    return cobrarCuotasDesdeCancelacion(liquidacionId, formData);
  }

  async function handleCerrar() {
    "use server";
    return cerrarCancelacion(periodo, liquidacionId);
  }

  return (
    <div className="space-y-12">
      {/* 🧭 HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cancelaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cuotas vencidas al período – <strong>Período {periodo}</strong>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/cancelaciones/historico">
            <Button variant="outline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ver histórico
            </Button>
          </Link>

          <form action={handleCerrar}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Registrar cierre período {periodo}
            </Button>
          </form>
        </div>
      </div>

      <ProductoFilterExport
        productos={productos}
        pageBasePath="/dashboard/cancelaciones"
        exportBasePath="/endpoints/cancelaciones/export"
        selectedProductoId={productoId}
      />

      {/* 🔴 IMPAGAS */}
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

      {/* 🟢 PAGADAS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cuotas ya cobradas</h2>

        <Card>
          <CardContent className="pt-6">
            <CancelacionesTable filas={cuotasPagadas} tipo="abonadas" />
          </CardContent>
        </Card>
      </section>

      {/* 💰 TOTALES */}
      <section className="text-right space-y-1 pt-4">
        <p className="font-semibold">
          Total pagado: {formatCurrency(totalPagadas)}
        </p>
        <p className="font-semibold text-red-600">
          Total pendiente: {formatCurrency(totalPendientes)}
        </p>
      </section>
    </div>
  );
}
