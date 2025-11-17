"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CancelacionesHeader } from "@/components/cancelaciones/cancelaciones-header";
import { CancelacionesTable } from "@/components/cancelaciones/cancelaciones-table";
import { CancelacionesResumen } from "@/components/cancelaciones/cancelaciones-resumen";
import { CancelacionesImport } from "@/components/cancelaciones/cancelaciones-import"; // 👈 NUEVO IMPORT

interface CancelacionesPageClientProps {
  periodo: string;
  periodoActual: string;
  abonadas: any[];
  impagas: any[];
  totalAbonadas: number;
  totalImpagas: number;
  handleRegistrarCancelacion: () => Promise<any>;
}

export default function CancelacionesPageClient({
  periodo,
  periodoActual,
  abonadas,
  impagas,
  totalAbonadas,
  totalImpagas,
  handleRegistrarCancelacion,
}: CancelacionesPageClientProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const router = useRouter();

  const handleGenerarRecibo = () => {
    if (selectedIds.length === 0) return;
    const query = selectedIds.join(",");
    router.push(`/dashboard/pagos/nuevo?cuotas=${query}`);
  };

  return (
    <div className="space-y-8">
      {/* 🔹 Header y acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <CancelacionesHeader periodo={periodo} />

        <div className="flex gap-3">
          <form action={handleRegistrarCancelacion}>
            <Button
              type="submit"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Registrar período {periodoActual}
            </Button>
          </form>

          <Link href="/dashboard/cancelaciones/historico">
            <Button variant="outline">Ver histórico</Button>
          </Link>
        </div>
      </div>

      {/* 🔹 Cuotas abonadas */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-emerald-700">
          Cuotas abonadas en el período
        </h2>

        <CancelacionesTable filas={abonadas} tipo="abonadas" />
      </section>

      {/* 🔹 Cuotas impagas */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-red-700">
            Cuotas impagas del período
          </h2>
        </div>

        {/* 🟡 Importador Excel de cancelaciones */}
        <CancelacionesImport />

        {/* Botón de generación de recibo manual */}
        {selectedIds.length > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={handleGenerarRecibo}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Generar recibo ({selectedIds.length})
            </Button>
          </div>
        )}

        {/* Tabla de cuotas impagas */}
        <CancelacionesTable
          filas={impagas}
          tipo="impagas"
          selectable
          onSelectionChange={setSelectedIds}
        />
      </section>

      {/* 🔹 Resumen final */}
      <CancelacionesResumen
        totalAbonadas={totalAbonadas}
        totalImpagas={totalImpagas}
      />
    </div>
  );
}
