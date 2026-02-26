"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

interface CuotaRow {
  id_cuota: number;
  asociado: string | null;
  producto: string;
  numero_credito: number;
  numero_cuota: number;
  fecha_vencimiento: Date | string;
  monto_total: number;
  estado: EstadoCuota;
}

export function CancelacionesTable({
  filas = [],
  tipo,
}: {
  filas: CuotaRow[];
  tipo?: "abonadas" | "impagas";
}) {
  const checkboxAllRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filaIds = useMemo(() => filas.map((f) => f.id_cuota), [filas]);
  const totalFilas = filaIds.length;
  const allSelected = tipo === "impagas" && totalFilas > 0 && selectedIds.length === totalFilas;
  const someSelected = tipo === "impagas" && selectedIds.length > 0 && selectedIds.length < totalFilas;

  useEffect(() => {
    setSelectedIds([]);
  }, [filas, tipo]);

  useEffect(() => {
    if (!checkboxAllRef.current) return;
    checkboxAllRef.current.indeterminate = Boolean(someSelected);
  }, [someSelected]);

  const toggleOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filaIds);
  };

  if (!filas || filas.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        {tipo === "abonadas"
          ? "No hay cuotas abonadas en este período."
          : tipo === "impagas"
            ? "No hay cuotas impagas en este período."
            : "No hay datos disponibles."}
      </div>
    );
  }

  return (
    <div className="rounded-md border mt-2 overflow-auto shadow-sm">
      {tipo === "impagas" &&
        selectedIds.map((id) => (
          <input key={id} type="hidden" name="cuotaId" value={id} />
        ))}

      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            {tipo === "impagas" && (
              <TableHead className="w-[40px] text-center">
                <input
                  ref={checkboxAllRef}
                  type="checkbox"
                  checked={Boolean(allSelected)}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-emerald-600 cursor-pointer"
                  aria-label="Seleccionar todas las cuotas"
                  title="Seleccionar todas"
                />
              </TableHead>
            )}
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
          {filas.map((f) => (
            <TableRow key={f.id_cuota} className="hover:bg-muted/20 transition-colors">
              {tipo === "impagas" && (
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    value={f.id_cuota}
                    checked={selectedIds.includes(f.id_cuota)}
                    onChange={() => toggleOne(f.id_cuota)}
                    className="h-4 w-4 accent-emerald-600 cursor-pointer"
                    aria-label={`Seleccionar cuota ${f.numero_cuota}`}
                  />
                </TableCell>
              )}

              <TableCell>{f.asociado}</TableCell>
              <TableCell>{f.producto}</TableCell>
              <TableCell>{f.numero_credito}</TableCell>
              <TableCell>{f.numero_cuota}</TableCell>
              <TableCell>{formatDateUtc(new Date(f.fecha_vencimiento))}</TableCell>

              <TableCell className="text-right">
                {formatCurrency(f.monto_total)}
              </TableCell>

              <TableCell className="text-center">
                {f.estado === EstadoCuota.pagada ? (
                  <Badge className="bg-emerald-600 text-white">Pagada</Badge>
                ) : (
                  <Badge className="bg-red-600 text-white">Pendiente</Badge>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
