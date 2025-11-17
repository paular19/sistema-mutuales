// app/dashboard/liquidaciones/configuracion/page.tsx
import { getConfiguracionCierre } from "@/lib/queries/liquidaciones";
import { ConfigForm } from "@/components/liquidacion/config-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ConfiguracionLiquidacionesPage() {
  const config = await getConfiguracionCierre();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración de liquidaciones</h1>
        <Link href="/dashboard/liquidaciones">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>

      <ConfigForm initial={{ dia_cierre: config?.dia_cierre ?? 10, activo: config?.activo ?? true }} />
    </div>
  );
}
