import { formatCurrency } from "@/lib/utils/format";

interface CancelacionesResumenProps {
  totalAbonadas: number;
  totalImpagas: number;
}

export function CancelacionesResumen({
  totalAbonadas,
  totalImpagas,
}: CancelacionesResumenProps) {
  const total = totalAbonadas + totalImpagas;

  return (
    <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="text-muted-foreground text-sm">
        <p>Total de cuotas abonadas: <strong>{formatCurrency(totalAbonadas)}</strong></p>
        <p>Total de cuotas impagas: <strong>{formatCurrency(totalImpagas)}</strong></p>
      </div>

      <div className="text-right font-semibold text-lg">
        Total general del período: {formatCurrency(total)}
      </div>
    </div>
  );
}
