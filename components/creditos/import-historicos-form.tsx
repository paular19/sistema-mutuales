"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { importHistoricosCreditosAction } from "@/lib/actions/import-historicos-creditos";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ImportHistoricosResult =
  | {
      ok: true;
      creditosCreados: number;
      cuotasCreadas: number;
      cuotasIgnoradas: number;
    }
  | {
      ok: false;
      error: string;
    };

export function ImportHistoricosForm() {
  const [isImporting, setIsImporting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsImporting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = (await importHistoricosCreditosAction(
        formData
      )) as ImportHistoricosResult;

      if (!result.ok) {
        toast.error("Error al importar", {
          description: result.error || "Error desconocido",
        });
        return;
      }

      toast.success("Importación completada", {
        description: `Créditos: ${result.creditosCreados} | Cuotas: ${result.cuotasCreadas} | Ignoradas: ${result.cuotasIgnoradas}`,
      });

      e.currentTarget.reset();
    } catch (err) {
      console.error(err);
      toast.error("Error al importar", {
        description: "Error inesperado al procesar el archivo",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded-md max-w-sm bg-white"
    >
      <h3 className="font-semibold text-lg">Importar Créditos Históricos</h3>

      <input
        type="file"
        name="file"
        accept=".xlsx,.xls"
        required
        disabled={isImporting}
        className="block text-sm"
      />

      <Button type="submit" disabled={isImporting} className="w-full">
        {isImporting ? "Importando..." : "Importar desde Excel"}
      </Button>
    </form>
  );
}
