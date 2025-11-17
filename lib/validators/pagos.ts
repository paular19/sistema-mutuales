import { z } from "zod";

export const PagoSchema = z.object({
  cuotasIds: z
    .array(z.number().int().positive("ID de cuota inválido"))
    .min(1, "Debe seleccionar al menos una cuota para generar el pago"),

  fecha_pago: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z
      .date()
      .refine(
        (d) => !isNaN(d.getTime()),
        "Debe ingresar una fecha válida"
      )
      .refine(
        (d) => d > new Date("2000-01-01"),
        "La fecha de pago no puede ser anterior al año 2000"
      )
  ),

  observaciones: z
    .string()
    .trim()
    .max(200, "Las observaciones no pueden exceder 200 caracteres")
    .optional(),
});

export type PagoFormData = z.infer<typeof PagoSchema>;
