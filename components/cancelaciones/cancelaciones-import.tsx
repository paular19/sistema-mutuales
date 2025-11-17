"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileSpreadsheet, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { importCancelacionesAction } from "@/lib/actions/cancelacion";
import { useRouter } from "next/navigation";


export function CancelacionesImport() {
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsImporting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await importCancelacionesAction(formData);

      if (result?.error) {
        toast.error("Error al importar cancelaciones", {
          description: result.error,
          icon: <XCircle className="text-red-500 w-5 h-5" />,
        });
      } else {
        toast.success("Importación completada", {
          description: `✅ ${result.procesadas} créditos procesados, ${result.cuotasPagadas} cuotas pagadas.`,
          icon: <CheckCircle className="text-amber-500 w-5 h-5" />,
        });
        router.refresh();
      }

      e.currentTarget.reset();
    } catch (err: any) {
      console.error(err);
      toast.error("Error inesperado al procesar el archivo");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-3 border border-amber-300 bg-amber-50 rounded-md p-4">
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-amber-800">
            Importar cancelaciones desde Excel
          </p>
          <p className="text-sm text-amber-700">
            Solo se aceptan archivos Excel con el{" "}
            <a
              href="/templates/plantilla_cancelaciones.xlsx"
              className="underline font-medium hover:text-amber-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              formato oficial
            </a>
            . Cada fila corresponde a un pago aplicado a un crédito existente.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleImport}
        className="flex flex-col sm:flex-row items-start gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm"
      >
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls"
          required
          disabled={isImporting}
          className="w-full sm:flex-1 text-sm file:mr-2 file:rounded-md file:border file:px-3 file:py-2 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isImporting}
          className="w-full sm:w-auto min-w-[120px] bg-amber-600 hover:bg-amber-700"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            "Importar Excel"
          )}
        </Button>
      </form>
    </div>
  );
}
