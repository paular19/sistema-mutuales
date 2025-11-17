import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getCuotaDetalle } from "@/lib/queries/cuotas";

export default async function CuotaDetallePage({
  params,
}: {
  params: { id_cuota: string };
}) {
  const id_cuota = Number(params.id_cuota);
  if (isNaN(id_cuota)) throw new Error("ID de cuota inválido.");

  const { cuota } = await getCuotaDetalle(id_cuota);
  if (!cuota) return <p className="text-red-500">Cuota no encontrada.</p>;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Cuota #{cuota.numero_cuota}</h1>
          <p className="text-sm text-muted-foreground">
            Crédito #{cuota.id_credito} · {cuota.credito.asociado?.apellido}{" "}
            {cuota.credito.asociado?.nombre} · {cuota.credito.producto?.nombre}
          </p>
        </div>

        <Link href={`/dashboard/creditos/${cuota.id_credito}/cuotas`}>
          <Button variant="ghost">← Volver a cuotas</Button>
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Resumen label="Monto total" value={cuota.monto_total} />
        <Resumen label="Pagado" value={cuota.pagado} />
        <Resumen label="Saldo restante" value={cuota.saldo} />
      </div>

      {/* Estado y vencimiento */}
      <div className="flex items-center gap-4">
        <Badge
          className={
            cuota.estadoCalc === "pagada"
              ? "bg-emerald-600"
              : cuota.estadoCalc === "vencida"
              ? "bg-red-600"
              : "bg-gray-400"
          }
        >
          {cuota.estadoCalc.toUpperCase()}
        </Badge>
        <p className="text-sm text-muted-foreground">
          Vencimiento: {formatDate(new Date(cuota.fecha_vencimiento))}
        </p>
      </div>

      {/* Pagos */}
      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha de pago</TableHead>
              <TableHead>Monto pagado</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuota.pagoCuotas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                  No hay pagos registrados para esta cuota.
                </TableCell>
              </TableRow>
            ) : (
              cuota.pagoCuotas.map((pc: any) => (
                <TableRow key={pc.id_pago_cuota}>
                  <TableCell>{formatDate(new Date(pc.fecha_pago))}</TableCell>
                  <TableCell>{formatCurrency(pc.monto_pagado)}</TableCell>
                  <TableCell>{pc.pago.referencia ?? "-"}</TableCell>
                  <TableCell>{pc.pago.observaciones ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Botón registrar pago */}
      <div className="flex justify-end">
        <Button variant="secondary" disabled={cuota.estadoCalc === "pagada"}>
          Registrar pago
        </Button>
      </div>
    </div>
  );
}

function Resumen({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}
