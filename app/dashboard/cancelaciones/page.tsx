import { getCancelacionesDelDia } from "@/lib/queries/cancelacion";
import { cobrarCuotasSeleccionadas, registrarCancelacion } from "@/lib/actions/cancelacion";
import { getPeriodoActual } from "@/lib/utils/getPeriodoActual";
import { revalidatePath } from "next/cache";
import { CancelacionesTable } from "@/components/cancelaciones/cancelaciones-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

export default async function CancelacionesPage() {
  const {
    periodo,
    cuotasPagadas,
    cuotasPendientes,
    totalPagadas,
    totalPendientes,
  } = await getCancelacionesDelDia();

  const periodoActual = await getPeriodoActual();

  async function handleRegistrarCancelacion() {
    "use server";
    await registrarCancelacion(periodoActual.periodo);
    revalidatePath("/dashboard/cancelaciones");
  }

  return (
    <div className="space-y-12">
      {/* 🧭 HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cancelaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Basadas en la última liquidación – <strong>Período {periodo}</strong>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/cancelaciones/historico">
            <Button variant="outline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ver histórico
            </Button>
          </Link>

          <form action={handleRegistrarCancelacion}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Registrar período {periodoActual.periodo}
            </Button>
          </form>
        </div>
      </div>

      {/* 🔴 IMPAGAS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cuotas pendientes de cobro</h2>

        <Card>
          <CardContent className="pt-6">
            <form action={cobrarCuotasSeleccionadas} className="space-y-6">
              <CancelacionesTable filas={cuotasPendientes} tipo="impagas" />

              {cuotasPendientes.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Cobrar seleccionadas
                  </Button>
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
