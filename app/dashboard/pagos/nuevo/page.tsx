"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NuevoPagoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🔥 SE CORRIGE ACA: Ahora usamos useSearchParams()
  const cuotasParam = searchParams.get("cuotas");
  const cuotasIds = cuotasParam?.split(",").map((id) => Number(id)) || [];

  const [isGenerated, setIsGenerated] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.append("cuotasIds", JSON.stringify(cuotasIds));

    // ⬇️ Enviar al endpoint (PDF)
    const response = await fetch("/endpoints/pagos/descargar", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      alert("Error al generar el recibo");
      return;
    }

    // ⬇️ Descargar PDF
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "recibo.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setIsGenerated(true);
  }

  if (!cuotasIds.length) {
    return (
      <div className="p-6 text-center text-gray-600">
        No se seleccionaron cuotas para generar el pago.
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      <h1 className="text-2xl font-bold">Generar recibo de pago</h1>

      {isGenerated ? (
        <div className="text-center space-y-4">
          <p className="text-gray-600 font-medium">
            Recibo generado y descargado correctamente.
          </p>

          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push("/dashboard/creditos")}
          >
            Volver a creditos
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border rounded-xl p-6 bg-white shadow-sm"
        >
          <input
            type="hidden"
            name="cuotasIds"
            value={JSON.stringify(cuotasIds)}
          />

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

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Generar Recibo
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
