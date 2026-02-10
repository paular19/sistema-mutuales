'use client';

import Link from "next/link";
import { useState, useMemo } from "react";
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
import { formatCurrency, formatDateUtc } from "@/lib/utils/format";
import { CuotasFilters } from "./cuotas-filters";
import { usePagoSelection } from "@/hooks/usePagoSelection";

interface Cuota {
  id_cuota: number;
  numero_cuota: number;
  fecha_vencimiento: string | Date;
  monto_capital: number;
  monto_interes: number;
  monto_total: number;
  pagoCuotas: { monto_pagado: number }[];
}

interface CuotasTableProps {
  cuotas: Cuota[];
  comisionGestion?: number;
}

export function CuotasTable({ cuotas, comisionGestion = 0 }: CuotasTableProps) {
  const { selectedIds, toggle, selectAll, clear } = usePagoSelection();
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const now = new Date();

  // 🔹 Calculamos estado de cada cuota una sola vez (optimizado)
  const cuotasConEstado = useMemo(() => {
    return cuotas.map((c) => {
      const pagado = c.pagoCuotas.reduce((acc, p) => acc + p.monto_pagado, 0);
      const saldo = Math.max(c.monto_total - pagado, 0);
      const vencida = new Date(c.fecha_vencimiento) < now && saldo > 0;
      const estadoCalc =
        saldo <= 0 ? "pagada" : vencida ? "vencida" : "pendiente";
      return { ...c, pagado, saldo, estadoCalc };
    });
  }, [cuotas]);

  // 🔸 Manejo del “Seleccionar todo”
  const handleSelectAll = () => {
    if (selectAllChecked) {
      clear();
    } else {
      // Solo seleccionar cuotas disponibles (no pagadas ni parciales)
      const disponibles = cuotasConEstado
        .filter((c) => c.estadoCalc !== "pagada" && c.estadoCalc !== "parcial")
        .map((c) => c.id_cuota);
      selectAll(disponibles);
    }
    setSelectAllChecked(!selectAllChecked);
  };

  return (
    <div className="space-y-4">
      <CuotasFilters />

      {/* 🔹 Botón de acción masiva */}
      {selectedIds.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              const ids = selectedIds.join(",");
              window.location.href = `/dashboard/pagos/nuevo?cuotas=${ids}`;
            }}
          >
            Generar recibos de pago ({selectedIds.length})
          </Button>
        </div>
      )}

      {/* 🔹 Tabla */}
      <div className="rounded-2xl border overflow-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">
                <input
                  type="checkbox"
                  checked={selectAllChecked}
                  onChange={handleSelectAll}
                  className="cursor-pointer h-4 w-4 accent-emerald-600"
                />
              </TableHead>
              <TableHead>#</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Capital</TableHead>
              <TableHead className="text-right">Interés</TableHead>
              <TableHead className="text-right">Gestión</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {cuotasConEstado.map((c) => (
              <TableRow key={c.id_cuota}>
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id_cuota)}
                    onChange={() => toggle(c.id_cuota)}
                    disabled={c.estadoCalc === "pagada" || c.estadoCalc === "parcial"}
                    className="h-4 w-4 accent-emerald-600 disabled:opacity-40 cursor-pointer"
                    title={
                      c.estadoCalc === "pagada"
                        ? "Esta cuota ya fue pagada"
                        : c.estadoCalc === "parcial"
                          ? "Pago parcial registrado"
                          : "Seleccionar para generar recibo"
                    }
                  />
                </TableCell>

                <TableCell>{c.numero_cuota}</TableCell>
                <TableCell>{formatDateUtc(new Date(c.fecha_vencimiento))}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.monto_capital)}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.monto_interes)}</TableCell>
                <TableCell className="text-right">
                  {c.numero_cuota === 1 && comisionGestion > 0
                    ? formatCurrency(comisionGestion)
                    : "–"}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(c.monto_total)}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.pagado)}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.saldo)}</TableCell>

                <TableCell>
                  {c.estadoCalc === "pagada" && (
                    <Badge className="bg-emerald-600 text-white">Pagada</Badge>
                  )}
                  {c.estadoCalc === "pendiente" && (
                    <Badge variant="secondary">Pendiente</Badge>
                  )}
                  {c.estadoCalc === "vencida" && (
                    <Badge className="bg-red-600 text-white">Vencida</Badge>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <Link href={`/dashboard/cuotas/${c.id_cuota}/detalle`}>
                    <Button size="sm" variant="outline">
                      Detalle de cuota
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
