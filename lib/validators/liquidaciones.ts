// lib/validators/liquidaciones.ts
import { z } from "zod";

export const ConfiguracionCierreSchema = z.object({
  dia_cierre: z.number().int().min(1, "Debe ser entre 1 y 31").max(31, "Debe ser entre 1 y 31"),
  activo: z.boolean().default(true),
});

export type ConfiguracionCierreInput = z.infer<typeof ConfiguracionCierreSchema>;

export const HistorialQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  periodo: z.string().optional(), // "YYYY-M"
});

export const PeriodoSchema = z.object({
  periodo: z.string().regex(/^\d{4}-(?:[1-9]|1[0-2])$/), // 2025-10
});
