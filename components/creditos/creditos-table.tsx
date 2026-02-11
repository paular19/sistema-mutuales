"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import { CreditosFilters } from "./creditos-filters";
import { Pagination } from "@/components/ui/pagination";
import { FileText, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface Credito {
  id_credito: number;
  monto: number;
  saldo_capital_inicial: number;
  saldo_capital_actual: number;
  cuotas_pagadas: number;
  cuotas_pendientes: number;
  estado: string;
  hasPagos?: boolean;
  asociado?: {
    nombre: string | null;
    apellido: string | null;
    razon_social: string | null;
    tipo_persona: "fisica" | "juridica" | null;
    convenio?: string | null;
  };
  producto?: { nombre: string | null };
}

interface CreditosTableProps {
  creditos: Credito[];
  totalPages: number;
  currentPage: number;
  onAnularCredito: (id_credito: number) => Promise<{ success?: boolean; error?: string }>;
}

export function CreditosTable({
  creditos,
  totalPages,
  currentPage,
  onAnularCredito,
}: CreditosTableProps) {
  const router = useRouter();
  const [loadingPdf, setLoadingPdf] = useState<number | null>(null);
  const [loadingAnular, setLoadingAnular] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<number | null>(null);

  const handleDescargarPDF = async (idCredito: number) => {
    try {
      setLoadingPdf(idCredito);

      // ✅ ZIP con todos los PDFs
      const response = await fetch(
        `/endpoints/creditos/documento?id=${idCredito}&all=1`,
        { method: "GET" }
      );

      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        throw new Error(`Error al generar ZIP (${response.status}): ${txt}`);
      }

      // ✅ tomar filename desde Content-Disposition si existe
      const cd = response.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/i);
      const filename = match?.[1] ?? `documentos-${idCredito}.zip`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar ZIP:", error);
      alert("Error al generar/descargar los documentos");
    } finally {
      setLoadingPdf(null);
    }
  };

  if (creditos.length === 0) {
    return (
      <>
        <CreditosFilters />
        <div className="border rounded-lg p-6 text-center text-gray-500">
          No hay créditos registrados.
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <CreditosFilters />

      <div className="overflow-auto border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asociado</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Saldo inicial</TableHead>
              <TableHead>Saldo actual</TableHead>
              <TableHead>Cuotas pagadas</TableHead>
              <TableHead>Cuotas pendientes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {creditos.map((c) => (
              <TableRow key={c.id_credito}>
                <TableCell>
                  {c.asociado?.razon_social
                    ? c.asociado.razon_social
                    : `${c.asociado?.apellido ?? ""} ${c.asociado?.nombre ?? ""}`.trim() ||
                    "(Sin nombre)"}
                </TableCell>

                <TableCell>{c.producto?.nombre}</TableCell>
                <TableCell>{formatCurrency(c.monto)}</TableCell>
                <TableCell>{formatCurrency(c.saldo_capital_inicial)}</TableCell>
                <TableCell>{formatCurrency(c.saldo_capital_actual)}</TableCell>
                <TableCell>{c.cuotas_pagadas}</TableCell>
                <TableCell>{c.cuotas_pendientes}</TableCell>
                <TableCell className="capitalize">{c.estado}</TableCell>

                <TableCell>
                  <div className="flex justify-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="flex items-center gap-1">
                      <Link href={`/dashboard/creditos/${c.id_credito}/cuotas`}>
                        <span>Ver cuotas</span>
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDescargarPDF(c.id_credito)}
                      disabled={loadingPdf === c.id_credito}
                      className="flex items-center gap-1"
                      title="Descargar todos los documentos (ZIP)"
                    >
                      <FileText className="w-4 h-4" />
                      {loadingPdf === c.id_credito ? "..." : "PDFs"}
                    </Button>

                    <AlertDialog
                      open={openId === c.id_credito}
                      onOpenChange={(open) => setOpenId(open ? c.id_credito : null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          disabled={
                            c.estado === "cancelado" ||
                            c.hasPagos ||
                            loadingAnular === c.id_credito ||
                            isPending
                          }
                          title={
                            c.hasPagos
                              ? "No se puede anular: hay pagos registrados"
                              : c.estado === "cancelado"
                                ? "Crédito ya cancelado"
                                : "Anular crédito"
                          }
                          aria-label="Anular crédito"
                        >
                          {loadingAnular === c.id_credito ? "..." : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar anulación</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El crédito quedará cancelado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              setLoadingAnular(c.id_credito);
                              startTransition(async () => {
                                const res = await onAnularCredito(c.id_credito);
                                if (res?.error) {
                                  toast.error(res.error);
                                } else {
                                  toast.success("Crédito anulado");
                                  router.refresh();
                                }
                                setLoadingAnular(null);
                                setOpenId(null);
                              });
                            }}
                            disabled={isPending}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            {loadingAnular === c.id_credito ? "Procesando..." : "Anular"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination totalPages={totalPages} currentPage={currentPage} baseUrl="/dashboard/creditos" />
    </div>
  );
}
