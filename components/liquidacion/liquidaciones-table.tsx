"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface Cuota {
  id_cuota: number;
  asociado: string | null;
  producto: string;
  numero_credito: number;
  numero_cuota: number;
  fecha_vencimiento: string | Date;
  monto_total: number;
  estado: string;
}

interface LiquidacionesTableProps {
  filas: Cuota[];
  onSelectionChange?: (ids: number[]) => void;
}

export function LiquidacionesTable({ filas, onSelectionChange }: LiquidacionesTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const hoy = new Date();

  const toggle = (id: number) => {
    const updated =
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
    setSelectedIds(updated);
    onSelectionChange?.(updated);
  };

  const toggleAll = () => {
    const allIds = filas.map((f) => f.id_cuota);
    const updated =
      selectedIds.length === filas.length ? [] : allIds;
    setSelectedIds(updated);
    onSelectionChange?.(updated);
  };

  if (!filas || filas.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        No hay cuotas a cobrar en el período actual.
      </div>
    );
  }

  return (
    <div className="rounded-md border mt-4 overflow-auto shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] text-center">
              <Checkbox
                checked={selectedIds.length === filas.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Asociado</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Crédito</TableHead>
            <TableHead>Cuota</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filas.map((f) => {
            const fechaVenc = new Date(f.fecha_vencimiento);
            const vencida = fechaVenc < hoy && f.estado !== "pagada";
            const estadoFinal =
              f.estado === "pagada"
                ? "pagada"
                : vencida
                ? "vencida"
                : "pendiente";

            return (
              <TableRow
                key={f.id_cuota}
                className={`hover:bg-muted/20 transition-colors ${
                  selectedIds.includes(f.id_cuota)
                    ? "bg-muted/30"
                    : ""
                }`}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedIds.includes(f.id_cuota)}
                    onCheckedChange={() => toggle(f.id_cuota)}
                  />
                </TableCell>
                <TableCell>{f.asociado}</TableCell>
                <TableCell>{f.producto}</TableCell>
                <TableCell>{f.numero_credito}</TableCell>
                <TableCell>{f.numero_cuota}</TableCell>
                <TableCell>{formatDate(fechaVenc)}</TableCell>
                <TableCell className="text-right">{formatCurrency(f.monto_total)}</TableCell>
                <TableCell className="text-center">
                  {estadoFinal === "vencida" && (
                    <Badge className="bg-red-600 text-white">Vencida</Badge>
                  )}
                  {estadoFinal === "pagada" && (
                    <Badge className="bg-emerald-600 text-white">Pagada</Badge>
                  )}
                  {estadoFinal === "pendiente" && (
                    <Badge variant="secondary">Pendiente</Badge>
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

