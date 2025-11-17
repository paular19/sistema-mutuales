import { z } from "zod";

export const CancelacionFiltroSchema = z.object({
  periodo: z
    .string()
    .regex(/^\d{4}-(?:[1-9]|1[0-2])$/, "Formato inválido (YYYY-MM)")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export type CancelacionFiltroInput = z.infer<typeof CancelacionFiltroSchema>;
