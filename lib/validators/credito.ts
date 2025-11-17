import { z } from "zod";

export const CreditoSchema = z.object({
  id_asociado: z.number()
    .int("El ID del asociado debe ser un número entero")
    .positive("Debe seleccionar un asociado"),

  id_producto: z.number()
    .int("El ID del producto debe ser un número entero")
    .positive("Debe seleccionar un producto"),

  monto: z.number()
    .positive("El monto debe ser positivo")
    .min(1000, "El monto mínimo es $1,000")
    .max(10000000, "El monto máximo es $10,000,000"),

  observaciones: z.string()
    .max(500, "Las observaciones no pueden exceder 500 caracteres")
    .optional(),
});

export type CreditoFormData = z.infer<typeof CreditoSchema>;
