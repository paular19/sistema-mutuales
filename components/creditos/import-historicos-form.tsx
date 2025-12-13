"use client";

import { useState } from "react";
import { importHistoricosCreditosAction } from "@/lib/actions/import-historicos-creditos";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImportHistoricosForm() {
  const [isImporting, setIsImporting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsImporting(true);

    const formData = new FormData(e.currentTarget);
    const result = await importHistoricosCreditosAction(formData);

    setIsImporting(false);

    if (!result.ok) {
      const errorMsg =
        "error" in result
          ? result.error
          : result.errores?.join("\n") ?? "Error desconocido";

      toast.error("Error al importar", {
        description: errorMsg,
      });

      return;
    }

    if ("creditosCreados" in result && "cuotasCreadas" in result) {
      toast.success("Importación completada", {
        description: `Créditos: ${result.creditosCreados} | Cuotas: ${result.cuotasCreadas}`,
      });
    }
  }

  // ⬇️ JSX debe ir FUERA de handleSubmit
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
        className="block text-sm"
      />

      <Button type="submit" disabled={isImporting} className="w-full">
        {isImporting ? "Importando..." : "Importar desde Excel"}
      </Button>
    </form>
  );
}
