"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateUtc } from "@/lib/utils/format";
import { EstadoCuota } from "@prisma/client";
import type { LiquidacionCuotaUI } from "./liquidaciones-page-client";

interface LiquidacionesTableProps {
  filas: LiquidacionCuotaUI[];
}

export function LiquidacionesTable({ filas }: LiquidacionesTableProps) {
  const hoy = new Date();

  if (!filas || filas.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        No hay cuotas vencidas o arrastradas para liquidar.
      </div>
    );
  }

  return (
    <div className="rounded-md border mt-4 overflow-auto shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asociado</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Crédito</TableHead>
            <TableHead>Cuota</TableHead>
            <TableHead>Fecha de Cierre</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filas.map((f) => {
            const fechaVenc = new Date(f.fecha_vencimiento);
            const vencida =
              fechaVenc < hoy && f.estado !== EstadoCuota.pagada;

            const estadoFinal =
              f.estado === EstadoCuota.pagada
                ? EstadoCuota.pagada
                : vencida
                  ? EstadoCuota.vencida
                  : EstadoCuota.pendiente;

            return (
              <TableRow key={f.id_cuota}>
                <TableCell>{f.asociado}</TableCell>
                <TableCell>{f.producto}</TableCell>
                <TableCell>{f.numero_credito}</TableCell>
                <TableCell>{f.numero_cuota}</TableCell>
                <TableCell>{formatDateUtc(fechaVenc)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(f.monto_total)}
                </TableCell>

                <TableCell className="text-center">
                  {estadoFinal === EstadoCuota.vencida && (
                    <Badge className="bg-red-600 text-white">
                      Vencida
                    </Badge>
                  )}
                  {estadoFinal === EstadoCuota.pagada && (
                    <Badge className="bg-emerald-600 text-white">
                      Pagada
                    </Badge>
                  )}
                  {estadoFinal === EstadoCuota.pendiente && (
                    <Badge variant="secondary">
                      Pendiente
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <Link href={`/dashboard/cuotas/${f.id_cuota}/detalle`}>
                    <Button size="sm" variant="outline">
                      Ver detalle
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
