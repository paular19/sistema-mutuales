"use client";

import { useTransition, useMemo } from "react";
import { upsertConfiguracionCierre } from "@/lib/actions/liquidaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ConfigForm({
  initial,
}: {
  initial?: { dia_cierre?: number; activo?: boolean };
}) {
  const [isPending, startTransition] = useTransition();

  // 🧮 Cálculo de la próxima fecha de cierre (solo informativo)
  const proximoCierre = useMemo(() => {
    if (!initial?.dia_cierre) return null;

    const hoy = new Date();
    const diaCierre = initial.dia_cierre;
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    let fechaCierre = new Date(anioActual, mesActual, diaCierre);

    // Si ya pasó este día en el mes actual → usar el próximo mes
    if (fechaCierre <= hoy) {
      fechaCierre = new Date(anioActual, mesActual + 1, diaCierre);
    }

    return fechaCierre;
  }, [initial?.dia_cierre]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await upsertConfiguracionCierre(null, formData);

        if ("error" in result) {
          toast.error("Error al guardar la configuración");
        } else if ("success" in result && result.success) {
          toast.success("Configuración guardada correctamente ✅");
        } else {
          toast("No se detectaron cambios");
        }
      } catch (err) {
        console.error(err);
        toast.error("Ocurrió un error inesperado al guardar");
      }
    });
  }

  return (
    <div className="space-y-8 max-w-md">
      {/* 🧾 Información amigable */}
      {initial?.dia_cierre && (
        <div className="p-4 bg-muted rounded-lg border">
          <p className="text-sm text-muted-foreground">
            📅 Se ha definido el <strong>día {initial.dia_cierre}</strong> de cada mes como cierre.
          </p>
          {proximoCierre && (
            <p className="text-sm mt-2">
              🗓️ La próxima liquidación se generará el{" "}
              <strong>
                {format(proximoCierre, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </strong>.
            </p>
          )}
          {initial?.activo === false && (
            <p className="text-sm mt-2 text-red-600">
              ⚠️ La configuración se encuentra inactiva.
            </p>
          )}
        </div>
      )}

      {/* 🔧 Formulario de configuración */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dia_cierre">Día de cierre</Label>
          <Input
            id="dia_cierre"
            type="number"
            name="dia_cierre"
            min={1}
            max={31}
            defaultValue={initial?.dia_cierre ?? 10}
            required
          />
        </div>


        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar configuración"}
        </Button>
      </form>
    </div>
  );
}
