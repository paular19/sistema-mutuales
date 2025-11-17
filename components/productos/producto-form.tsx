"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductoFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; message?: string; error?: string } | void>;
  initialData?: {
    id_producto?: number;
    nombre?: string;
    numero_cuotas?: number;
    tasa_interes?: number;
    dia_vencimiento?: number;
    regla_vencimiento?: "AJUSTAR_ULTIMO_DIA" | "ESTRICTO";
    comision_comerc?: number;
    comision_gestion?: number;
  };
}

export function ProductoForm({ initialData, action }: ProductoFormProps) {
  const isEdit = !!initialData?.id_producto;
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        const res = await action(formData);

        if (res && "error" in res && res.error) {
          toast.error(res.error);
          return;
        }

        toast.success(
          res?.message ||
            (isEdit
              ? "Producto actualizado correctamente."
              : "Producto creado correctamente.")
        );

        // ✅ Redirección manual después de crear/editar
        router.push("/dashboard/productos");
      } catch (error) {
        console.error(error);
        toast.error("Ocurrió un error al guardar el producto.");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {isEdit && (
        <input type="hidden" name="id_producto" value={initialData.id_producto} />
      )}

      {/* Nombre */}
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={initialData?.nombre ?? ""}
          required
        />
      </div>

      {/* Número de cuotas */}
      <div>
        <Label htmlFor="numero_cuotas">Número de cuotas</Label>
        <Input
          id="numero_cuotas"
          type="number"
          name="numero_cuotas"
          min={1}
          max={360}
          defaultValue={initialData?.numero_cuotas ?? 1}
          required
        />
      </div>

      {/* Tasa de interés */}
      <div>
        <Label htmlFor="tasa_interes">Tasa de interés (%)</Label>
        <Input
          id="tasa_interes"
          type="number"
          step="0.01"
          name="tasa_interes"
          min={0}
          max={100}
          defaultValue={initialData?.tasa_interes ?? 0}
          required
        />
      </div>

      {/* Día de vencimiento */}
      <div>
        <Label htmlFor="dia_vencimiento">Día de vencimiento mensual</Label>
        <select
          id="dia_vencimiento"
          name="dia_vencimiento"
          defaultValue={initialData?.dia_vencimiento?.toString() ?? "1"}
          className="w-full border rounded-md px-3 py-2 text-sm"
          required
        >
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Regla de vencimiento */}
      <div>
        <Label>Regla de vencimiento</Label>
        <Select
          name="regla_vencimiento"
          defaultValue={initialData?.regla_vencimiento ?? "AJUSTAR_ULTIMO_DIA"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar regla" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AJUSTAR_ULTIMO_DIA">
              Ajustar al último día
            </SelectItem>
            <SelectItem value="ESTRICTO">
              Saltear mes si no existe el día
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Comisión comercializadora */}
      <div>
        <Label htmlFor="comision_comerc">Comisión comercializadora (%)</Label>
        <Input
          id="comision_comerc"
          type="number"
          step="0.01"
          min={0}
          max={100}
          name="comision_comerc"
          defaultValue={initialData?.comision_comerc ?? 0}
        />
      </div>

      {/* Comisión de gestión */}
      <div>
        <Label htmlFor="comision_gestion">
          Comisión de gestión (monto fijo)
        </Label>
        <Input
          id="comision_gestion"
          type="number"
          step="0.01"
          min={0}
          name="comision_gestion"
          defaultValue={initialData?.comision_gestion ?? 0}
        />
      </div>

      {/* Botón de acción */}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? isEdit
            ? "Actualizando..."
            : "Creando..."
          : isEdit
          ? "Actualizar producto"
          : "Crear producto"}
      </Button>
    </form>
  );
}
