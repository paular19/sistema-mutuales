"use client";

import { LiquidacionesTable } from "@/components/liquidacion/liquidaciones-table";
import { formatCurrency } from "@/lib/utils/format";
import { EstadoCuota } from "@prisma/client";

export interface LiquidacionCuotaUI {
  id_cuota: number;
  asociado: string;
  producto: string;
  numero_credito: number;
  numero_cuota: number;
  fecha_vencimiento: Date;
  monto_total: number;
  estado: EstadoCuota;
}

interface LiquidacionesPageClientProps {
  cuotas: LiquidacionCuotaUI[];
  total: number;
}

export function LiquidacionesPageClient({
  cuotas,
  total,
}: LiquidacionesPageClientProps) {
  return (
    <div className="space-y-6">
      {/* 📋 Tabla solo informativa */}
      <LiquidacionesTable filas={cuotas} />

      {/* 💰 Total liquidado */}
      <div className="text-right font-semibold text-lg">
        Total liquidado: {formatCurrency(total)}
      </div>
    </div>
  );
}
