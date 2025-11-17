"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { importAsociadosAction } from "@/lib/actions/asociados";

// -----------------------------
// TIPOS
// -----------------------------
interface TipoAsociado {
  id_tipo: number;
  nombre: string;
}

interface AsociadoFormProps {
  initialData?: Record<string, any>;
  action: (
    prevState: { error?: string; fieldErrors?: Record<string, string[]> } | undefined,
    formData: FormData
  ) => Promise<any>;
  mode: "create" | "edit";
  tiposAsociado: TipoAsociado[];
}

export function AsociadoForm({
  initialData,
  action,
  mode,
  tiposAsociado,
}: AsociadoFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(
    null
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const [tipoPersona, setTipoPersona] = useState(
    initialData?.tipo_persona ?? "fisica"
  );

  // -------------------------------------------------------------
  // IMPORTAR ARCHIVO EXCEL
  // -------------------------------------------------------------
  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setIsImporting(true);

  const form = e.currentTarget;

  try {
    const formData = new FormData(form);
    const result = await importAsociadosAction(formData);

    // ⛔ Error inesperado
    if (result?.error) {
      toast.error("Error al importar", {
        description: result.error,
        icon: <XCircle className="text-red-500 w-6 h-6" />,
      });
      return;
    }

    // 👉 Fix TS: fallback seguro
    const success = result.successCount ?? 0;
    const errors = result.errorCount ?? 0;

    // ✔ Importaciones OK
    if (success > 0) {
      toast.success("Importación completa", {
        description: `Se importaron ${success} asociado${success !== 1 ? "s" : ""} correctamente.`,
        icon: <CheckCircle className="text-green-500 w-6 h-6" />,
      });
    }

    // ❌ Filas rechazadas
    if (errors > 0) {
      toast.error("Algunas filas no se importaron", {
        description: `${errors} errores detectados`,
        icon: <XCircle className="text-red-500 w-6 h-6" />,
      });

      console.table(result.results);
    }

    form.reset();
    router.refresh();
    router.push("/dashboard/asociados");
  } catch (err) {
    toast.error("Error inesperado", {
      description: "Ocurrió un error al procesar el archivo",
      icon: <XCircle className="text-red-500 w-6 h-6" />,
    });
  } finally {
    setIsImporting(false);
  }
}


  // -------------------------------------------------------------
  // CREAR / EDITAR ASOCIADO
  // -------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    setError(null);
    setFieldErrors(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await action(undefined, formData);

      // ⛔ Errores de validación (Zod)
      if (result?.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        toast.error("Hay errores en el formulario", {
          description: "Revisá los campos en rojo.",
          icon: <XCircle className="text-red-500 w-6 h-6" />,
        });
        return;
      }

      // ⛔ Errores generales
      if (result?.error) {
        setError(result.error);
        toast.error("Error al guardar", {
          description: result.error,
          icon: <XCircle className="text-red-500 w-6 h-6" />,
        });
        return;
      }

      // ✔ Éxito
      toast.success(mode === "edit" ? "Asociado actualizado" : "Asociado creado", {
        description:
          mode === "edit"
            ? "Los cambios se guardaron correctamente."
            : "El nuevo asociado fue creado.",
        icon: <CheckCircle className="text-green-500 w-6 h-6" />,
      });

      router.push("/dashboard/asociados");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper para error de campo
  const FE = (field: string) =>
    fieldErrors?.[field] ? (
      <p className="text-sm text-red-600">{fieldErrors[field][0]}</p>
    ) : null;

  // -------------------------------------------------------------
  // FORMULARIO COMPLETO
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 text-left max-w-2xl mx-0">
      {/* IMPORTACIÓN */}
      <div className="space-y-3 border border-blue-300 bg-blue-50 rounded-md p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-6 h-6 text-blue-500" />
          <div>
            <p className="font-medium text-blue-800">Importar desde Excel</p>
            <p className="text-sm text-blue-700">
              Solo archivos Excel con el{" "}
              <a
                href="/templates/plantilla_asociados.xlsx"
                className="underline font-medium"
                target="_blank"
              >
                formato oficial.
              </a>
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
            className="w-full sm:flex-1 text-sm file:rounded-md file:border file:px-3 file:py-2 file:bg-gray-100 hover:file:bg-gray-200"
          />

          <Button type="submit" size="sm" disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...
              </>
            ) : (
              "Importar"
            )}
          </Button>
        </form>
      </div>

      {/* FORMULARIO MANUAL */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo asociado */}
        <div>
          <label className="block font-medium mb-1">Tipo de Asociado</label>
          <select
            name="id_tipo"
            defaultValue={initialData?.id_tipo ?? ""}
            className="w-full border rounded-md px-3 py-2"
            required
          >
            <option value="">Seleccionar...</option>
            {tiposAsociado.map((t) => (
              <option key={t.id_tipo} value={t.id_tipo}>
                {t.nombre}
              </option>
            ))}
          </select>
          {FE("id_tipo")}
        </div>

        {/* Tipo persona */}
        <div>
          <label className="block font-medium mb-1">Tipo de persona</label>
          <select
            name="tipo_persona"
            value={tipoPersona}
            onChange={(e) => setTipoPersona(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="fisica">Física</option>
            <option value="juridica">Jurídica</option>
          </select>
          {FE("tipo_persona")}
        </div>

        {tipoPersona === "fisica" ? (
          <>
            <div>
              <label className="block font-medium">Nombre</label>
              <Input name="nombre" defaultValue={initialData?.nombre || ""} />
              {FE("nombre")}
            </div>

            <div>
              <label className="block font-medium">Apellido</label>
              <Input name="apellido" defaultValue={initialData?.apellido || ""} />
              {FE("apellido")}
            </div>

            <div>
              <label className="block font-medium">Fecha nacimiento</label>
              <Input
                name="fecha_nac"
                type="date"
                defaultValue={
                  initialData?.fecha_nac
                    ? new Date(initialData.fecha_nac).toISOString().split("T")[0]
                    : ""
                }
              />
              {FE("fecha_nac")}
            </div>

            <div>
              <label className="block font-medium">Género</label>
              <Input name="genero" defaultValue={initialData?.genero || ""} />
              {FE("genero")}
            </div>
          </>
        ) : (
          <div>
            <label className="block font-medium">Razón social</label>
            <Input
              name="razon_social"
              defaultValue={initialData?.razon_social || ""}
            />
            {FE("razon_social")}
          </div>
        )}

        {/* CUIT */}
        <div>
          <label className="block font-medium">CUIT</label>
          <Input
            name="cuit"
            defaultValue={initialData?.cuit || ""}
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
            }}
          />
          {FE("cuit")}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block font-medium">Teléfono</label>
          <Input name="telefono" defaultValue={initialData?.telefono || ""} />
          {FE("telefono")}
        </div>

        {/* Email */}
        <div>
          <label className="block font-medium">Email</label>
          <Input name="email" type="email" defaultValue={initialData?.email || ""} />
          {FE("email")}
        </div>

        {/* Profesión */}
        <div>
          <label className="block font-medium">Profesión</label>
          <Input name="profesion" defaultValue={initialData?.profesion || ""} />
          {FE("profesion")}
        </div>

        {/* Dirección */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Provincia</label>
            <Input name="provincia" defaultValue={initialData?.provincia || ""} />
            {FE("provincia")}
          </div>

          <div>
            <label className="block font-medium">Localidad</label>
            <Input name="localidad" defaultValue={initialData?.localidad || ""} />
            {FE("localidad")}
          </div>

          <div>
            <label className="block font-medium">Calle</label>
            <Input name="calle" defaultValue={initialData?.calle || ""} />
            {FE("calle")}
          </div>

          <div>
            <label className="block font-medium">Número</label>
            <Input
              name="numero_calle"
              type="number"
              defaultValue={initialData?.numero_calle ?? ""}
            />
            {FE("numero_calle")}
          </div>

          <div>
            <label className="block font-medium">Piso</label>
            <Input name="piso" defaultValue={initialData?.piso ?? ""} />
            {FE("piso")}
          </div>

          <div>
            <label className="block font-medium">Departamento</label>
            <Input
              name="departamento"
              defaultValue={initialData?.departamento || ""}
            />
            {FE("departamento")}
          </div>

          <div className="col-span-2">
            <label className="block font-medium">Código postal</label>
            <Input
              name="codigo_postal"
              defaultValue={initialData?.codigo_postal || ""}
            />
            {FE("codigo_postal")}
          </div>
        </div>

        {/* Sueldos */}
        <div>
          <label className="block font-medium">Sueldo mensual</label>
          <Input name="sueldo_mes" defaultValue={initialData?.sueldo_mes ?? ""} />
          {FE("sueldo_mes")}
        </div>

        <div>
          <label className="block font-medium">Sueldo anual</label>
          <Input name="sueldo_ano" defaultValue={initialData?.sueldo_ano ?? ""} />
          {FE("sueldo_ano")}
        </div>

        {/* Flags */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="es_extranjero"
            defaultChecked={initialData?.es_extranjero || false}
          />
          <label>Es extranjero</label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="recibe_notificaciones"
            defaultChecked={initialData?.recibe_notificaciones ?? true}
          />
          <label>Recibe notificaciones</label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="dec_jurada"
            defaultChecked={initialData?.dec_jurada || false}
          />
          <label>Adjunta declaración jurada</label>
        </div>

        {/* Error global */}
        {error && <p className="text-base text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full py-2 text-base font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {mode === "edit" ? "Guardando..." : "Creando..."}
            </>
          ) : mode === "edit" ? (
            "Guardar cambios"
          ) : (
            "Crear Asociado"
          )}
        </Button>
      </form>
    </div>
  );
}
