"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { importCreditosAction } from "@/lib/actions/creditos";

/* ---------------------------------------------------------
   🔹 Types seguros para la importación
--------------------------------------------------------- */
type ImportResult =
  | { error: string }
  | {
    success: true;
    creados: number;
    asociadosNuevos: number;
    errores: { fila: number; mensaje: string }[];
  };

// Type guard
function isImportSuccess(
  r: ImportResult
): r is Extract<ImportResult, { success: true }> {
  return (r as any).success === true;
}

/* ---------------------------------------------------------
   🔹 Props del form
--------------------------------------------------------- */
interface CreditoFormProps {
  action: (formData: FormData) => Promise<any>;
  productos: any[];
  asociados: any[];
  initialData?: {
    id_credito?: number;
    id_asociado?: number;
    id_producto?: number;
    monto?: number;
    observaciones?: string;
  };
}

/* ---------------------------------------------------------
   🔹 COMPONENTE PRINCIPAL
--------------------------------------------------------- */
export function CreditoForm({
  action,
  productos,
  asociados,
  initialData,
}: CreditoFormProps) {
  const isEdit = !!initialData?.id_credito;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedProducto, setSelectedProducto] = useState<any>(
    productos.find((p) => p.id_producto === initialData?.id_producto) ?? null
  );

  const [monto, setMonto] = useState<number>(initialData?.monto ?? 0);
  const [totalCalculado, setTotalCalculado] = useState<number | null>(null);
  const [valorCuota, setValorCuota] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  /* ---------------------------------------------------------
     🔹 Cálculo dinámico de totales
  --------------------------------------------------------- */
  useEffect(() => {
    if (selectedProducto && monto > 0) {
      const tasa = selectedProducto.tasa_interes / 100;
      const comision = selectedProducto.comision_comerc / 100;
      const gestionFija = selectedProducto.comision_gestion ?? 0;

      const total = monto + monto * tasa + monto * comision + gestionFija;

      setTotalCalculado(total);
      setValorCuota(total / selectedProducto.numero_cuotas);
    } else {
      setTotalCalculado(null);
      setValorCuota(null);
    }
  }, [selectedProducto, monto]);

  const formatNumber = (num: number) =>
    num.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  /* ---------------------------------------------------------
     🔹 Importar créditos desde Excel
  --------------------------------------------------------- */
  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsImporting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = (await importCreditosAction(formData)) as ImportResult;

      // ❌ Caso error
      if (!isImportSuccess(result)) {
        toast.error("Error en importación", {
          description: result.error,
          icon: <XCircle className="text-red-500 w-6 h-6" />,
          duration: 5000,
        });
        return;
      }

      // ✔ Caso éxito
      const { creados, asociadosNuevos, errores } = result;

      toast.success("Importación completada", {
        description: `✅ ${creados} créditos creados (${asociadosNuevos} asociados nuevos, ${errores.length} errores).`,
        icon: <CheckCircle className="text-green-500 w-6 h-6" />,
        duration: 6000,
      });

      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      console.error("Error al importar créditos:", err);
      toast.error("Error inesperado al procesar el archivo", {
        icon: <XCircle className="text-red-500 w-6 h-6" />,
        duration: 4000,
      });
    } finally {
      setIsImporting(false);
    }
  }

  /* ---------------------------------------------------------
     🔹 Crear / Editar Crédito Manual
  --------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      setSubmitting(true);
      const result = await action(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit ? "Crédito actualizado correctamente" : "Crédito creado correctamente"
      );

      startTransition(() => {
        setTimeout(() => {
          router.push("/dashboard/creditos");
        }, 900);
      });
    } catch (err) {
      toast.error("Error al procesar el crédito");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------------------------------
     🔹 RENDER
  --------------------------------------------------------- */
  return (
    <div className="space-y-8 text-left max-w-2xl mx-0">
      {/* Importación Excel */}
      <div className="space-y-3 border border-green-300 bg-green-50 rounded-md p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-green-800">
              Importar créditos desde Excel
            </p>
            <p className="text-sm text-green-700 break-words">
              Solo se aceptan archivos Excel con el{" "}
              <a
                href="/templates/plantilla_creditos.xlsx"
                className="underline font-medium hover:text-green-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                formato oficial
              </a>
              . Si un asociado no existe, se creará automáticamente.
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
            className="w-full sm:w-auto min-w-[120px]"
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

      {/* Formulario manual */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {isEdit && (
          <input type="hidden" name="id_credito" value={initialData!.id_credito} />
        )}

        {/* Asociado */}
        <div>
          <label className="block font-medium mb-1">Asociado</label>
          <select
            name="id_asociado"
            defaultValue={initialData?.id_asociado ?? ""}
            className="w-full border rounded-md p-2"
            required
          >
            <option value="">Seleccionar asociado</option>

            {asociados.map((a) => {
              const etiqueta = a.tipo_persona === "juridica"
                ? a.razon_social || "(Sin razón social)"
                : `${a.apellido ?? ""} ${a.nombre ?? ""}`.trim() || "(Sin nombre)";

              return (
                <option key={a.id_asociado} value={a.id_asociado}>
                  {etiqueta}
                </option>
              );
            })}
          </select>
        </div>

        {/* Producto */}
        <div>
          <label className="block font-medium mb-1">Producto</label>
          <select
            name="id_producto"
            defaultValue={initialData?.id_producto ?? ""}
            onChange={(e) =>
              setSelectedProducto(
                productos.find((p) => p.id_producto === Number(e.target.value)) ||
                null
              )
            }
            className="w-full border rounded-md p-2"
            required
          >
            <option value="">Seleccionar producto</option>
            {productos.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Monto */}
        <div>
          <label className="block font-medium mb-1">Monto otorgado</label>
          <Input
            type="number"
            name="monto"
            step="0.01"
            min="0"
            value={monto || ""}
            onChange={(e) => setMonto(Number(e.target.value))}
            required
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="block font-medium mb-1">Observaciones</label>
          <textarea
            name="observaciones"
            defaultValue={initialData?.observaciones ?? ""}
            className="w-full border rounded-md p-2 text-sm"
            rows={3}
          />
        </div>

        {/* Resumen dinámico */}
        {selectedProducto && monto > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
            <p>
              <strong>Cuotas:</strong> {selectedProducto.numero_cuotas}
            </p>
            <p>
              <strong>Tasa de interés:</strong> {selectedProducto.tasa_interes.toFixed(2)}%
            </p>
            <p>
              <strong>Comisión comercializadora:</strong>{" "}
              {selectedProducto.comision_comerc.toFixed(2)}%
            </p>
            {selectedProducto.comision_gestion > 0 && (
              <p>
                <strong>Comisión de gestión (monto fijo):</strong>{" "}
                ${formatNumber(selectedProducto.comision_gestion)}
              </p>
            )}
            <hr />
            <p>
              💰 <strong>Total a financiar:</strong>{" "}
              {totalCalculado ? `$${formatNumber(totalCalculado)}` : "-"}
            </p>
            <p>
              📅 <strong>Valor estimado de cada cuota:</strong>{" "}
              {valorCuota ? `$${formatNumber(valorCuota)}` : "-"}
            </p>
            {selectedProducto.comision_gestion > 0 && (
              <p className="text-sm text-gray-600 italic">
                *La comisión de gestión se imputa a la primera cuota.
              </p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting || isPending}>
          {submitting
            ? isEdit
              ? "Actualizando..."
              : "Creando..."
            : isEdit
              ? "Actualizar crédito"
              : "Crear crédito"}
        </Button>
      </form>
    </div>
  );
}
