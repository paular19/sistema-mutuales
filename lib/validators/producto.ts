import { z } from "zod";

export const ProductoSchema = z.object({
  nombre: z.string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),

  numero_cuotas: z.number()
    .int("El número de cuotas debe ser entero")
    .min(1, "Debe tener al menos 1 cuota")
    .max(360, "El máximo son 360 cuotas"),

  tasa_interes: z.number()
    .min(0, "La tasa de interés no puede ser negativa")
    .max(100, "La tasa de interés no puede exceder 100%"),

  dia_vencimiento: z.number()
    .int("El día de vencimiento debe ser un número entero")
    .min(1, "El día de vencimiento no puede ser menor a 1")
    .max(31, "El día de vencimiento no puede ser mayor a 31"),

  regla_vencimiento: z.enum(["AJUSTAR_ULTIMO_DIA", "ESTRICTO"], {
    required_error: "Debe seleccionar una regla de vencimiento",
  }).default("AJUSTAR_ULTIMO_DIA"),

  comision_comerc: z.number()
    .min(0, "La comisión no puede ser negativa")
    .max(100, "La comisión no puede exceder 100%")
    .default(0),

  comision_gestion: z.number()
    .min(0, "La comisión no puede ser negativa")
    .default(0),
});

export type ProductoFormData = z.infer<typeof ProductoSchema>;
