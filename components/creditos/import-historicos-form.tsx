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
    creditosOmitidosNoAutorizados: number;
    creditosOmitidosSinAsociado: number;
    creditosOmitidosOtraMutual: number;
    creditosCreadosSinCodigoExterno: number;
    filasInvalidas: number;
  }
  | {
    ok: false;
    error: string;
  };

export function ImportHistoricosForm() {
  const [isImporting, setIsImporting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setIsImporting(true);

    try {
      const formData = new FormData(form);
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
        description: `Créditos: ${result.creditosCreados} | Cuotas: ${result.cuotasCreadas} | Ignoradas: ${result.cuotasIgnoradas} | No autorizados: ${result.creditosOmitidosNoAutorizados} | Sin asociado: ${result.creditosOmitidosSinAsociado} | Otra mutual: ${result.creditosOmitidosOtraMutual} | Sin código externo: ${result.creditosCreadosSinCodigoExterno} | Filas inválidas: ${result.filasInvalidas}`,
      });

      form.reset();
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
      <p className="text-sm text-muted-foreground">
        Columnas esperadas: concepto, codigo, ayuda, fechaven, cancuo, nrocuo, garantia, debe (valor de la cuota).
      </p>

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
