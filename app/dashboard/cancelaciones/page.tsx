import { getCancelacionesDelPeriodo } from "@/lib/queries/cancelacion";
import { getPeriodoActual } from "@/lib/utils/getPeriodoActual";
import { registrarCancelacion } from "@/lib/queries/cancelacion";
import { revalidatePath } from "next/cache";
import { CancelacionesTable } from "@/components/cancelaciones/cancelaciones-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils/format";

export default async function CancelacionesPage() {
  const { periodo, cuotas, total, proximoCierre } = await getCancelacionesDelPeriodo();
  const periodoActual = await getPeriodoActual();

  // 🟢 Acción servidor: registrar cancelación
  async function handleRegistrarCancelacion() {
    "use server";
    const res = await registrarCancelacion(periodoActual);
    revalidatePath("/dashboard/cancelaciones");
    return res;
  }

  return (
    <div className="space-y-6">
      {/* 🧭 HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cancelaciones</h1>
          <p className="text-sm text-muted-foreground">
            Cuotas cobradas del período actual
          </p>

          {proximoCierre && (
            <p className="text-xs text-muted-foreground mt-1">
              Mostrando cuotas pagadas con vencimiento hasta{" "}
              <strong>{formatDate(proximoCierre)}</strong>.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* ⚙️ Configuración */}
          <Link href="/dashboard/liquidaciones/configuracion">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
          </Link>

          {/* 🕓 Histórico */}
          <Link href="/dashboard/cancelaciones/historico">
            <Button variant="default" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ver histórico
            </Button>
          </Link>

          {/* 🧾 Registrar período */}
          <form action={handleRegistrarCancelacion}>
            <Button
              type="submit"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Registrar período {periodoActual}
            </Button>
          </form>
        </div>
      </div>

      {/* 📋 Tabla */}
      <Card>
        <CardContent>
          <CancelacionesTable filas={cuotas} />
        </CardContent>
      </Card>

      {/* 💰 Total */}
      <div className="text-right font-semibold text-lg">
        Total cobrado: {formatCurrency(total)}
      </div>
    </div>
  );
}

