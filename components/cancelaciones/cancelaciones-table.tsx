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
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CancelacionesImport } from "@/components/cancelaciones/cancelaciones-import";
import { EstadoCuota } from "@prisma/client";

interface Cuota {
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
  filas: Cuota[];
  tipo?: "abonadas" | "impagas";
}) {
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
    <div className="space-y-6">
      {/* 📤 Importador Excel */}
      <CancelacionesImport />

      {/* 📋 Tabla de cuotas abonadas */}
      <div className="rounded-md border mt-2 overflow-auto shadow-sm">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
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
            {filas.map((f) => (
              <TableRow
                key={f.id_cuota}
                className="hover:bg-muted/20 transition-colors"
              >
                <TableCell>{f.asociado}</TableCell>
                <TableCell>{f.producto}</TableCell>
                <TableCell>{f.numero_credito}</TableCell>
                <TableCell>{f.numero_cuota}</TableCell>
                {formatDate(new Date(f.fecha_vencimiento))}
                <TableCell className="text-right">
                  {formatCurrency(f.monto_total)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-emerald-600 text-white">Pagada</Badge>
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
    </div>
  );
}
