"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LiquidacionesTable } from "@/components/liquidacion/liquidaciones-table";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils/format";

interface Cuota {
  id_cuota: number;
  asociado: string;
  producto: string;
  numero_credito: number;
  numero_cuota: number;
  fecha_vencimiento: string | Date;
  monto_total: number;
  estado: string;
}

interface LiquidacionesPageClientProps {
  cuotas: Cuota[];
  total: number;
  page: number;
  totalPages: number;
}

export function LiquidacionesPageClient({
  cuotas,
  total,
  page,
  totalPages,
}: LiquidacionesPageClientProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const router = useRouter();

  const handleGenerarPago = () => {
    if (selectedIds.length === 0) return;
    const query = selectedIds.join(",");
    router.push(`/dashboard/pagos/nuevo?cuotas=${query}`);
  };

  return (
    <div className="space-y-6">
      <LiquidacionesTable filas={cuotas} onSelectionChange={setSelectedIds} />

      {/* 💰 Total general */}
      <div className="text-right font-semibold text-lg">
        Total a cobrar: {formatCurrency(total)}
      </div>

      {/* 🧾 Acción para generar pago */}
      {selectedIds.length > 0 && (
        <div className="flex justify-end">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleGenerarPago}
          >
            Generar pago ({selectedIds.length})
          </Button>
        </div>
      )}
    </div>
  );
}
