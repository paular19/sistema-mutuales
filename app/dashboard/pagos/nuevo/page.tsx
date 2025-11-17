import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "lucide-react";

export default function NuevoPagoPage({
  searchParams,
}: {
  searchParams: { cuotas?: string };
}) {
  if (!searchParams.cuotas) {
    return (
      <div className="p-6 text-center text-gray-600">
        No se seleccionaron cuotas para generar el pago.
      </div>
    );
  }

  const cuotasIds = searchParams.cuotas.split(",").map(Number);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Generar recibo de pago</h1>

      {/* 
        ✅ Enviamos los datos a la ruta /dashboard/pagos/descargar
        que devuelve directamente el PDF.
      */}
      <form
        action="/dashboard/pagos/descargar"
        method="POST"
        className="space-y-4 border rounded-xl p-6 bg-white shadow-sm"
      >
        <input type="hidden" name="cuotasIds" value={JSON.stringify(cuotasIds)} />

        <div>
          <label className="block font-medium mb-1">Fecha de pago</label>
          <Input
            type="date"
            name="fecha_pago"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Observaciones</label>
          <Textarea
            name="observaciones"
            placeholder="Ej. Pago en efectivo, transferencia, etc."
          />
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <Link href="/dashboard/cuotas">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
            Generar Recibo
          </Button>
        </div>
      </form>
    </div>
  );
}
