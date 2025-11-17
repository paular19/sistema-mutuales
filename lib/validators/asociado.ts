import { z } from "zod";

export const AsociadoSchema = z.object({
  tipo_persona: z.enum(["fisica", "juridica"]).default("fisica"),

  // Persona física
  nombre: z.string().max(50, "El nombre no puede exceder 50 caracteres").nullable().optional(),
  apellido: z.string().max(50, "El apellido no puede exceder 50 caracteres").nullable().optional(),

  // Persona jurídica
  razon_social: z.string().max(100, "La razón social no puede exceder 100 caracteres").nullable().optional(),

  // CUIT siempre requerido
  cuit: z.string()
    .regex(/^\d+$/, "El CUIT debe contener solo números")
    .length(11, "El CUIT debe tener exactamente 11 dígitos"),

  sueldo_mes: z.coerce.number().positive("El sueldo mensual debe ser positivo").nullable().optional(),
  sueldo_ano: z.coerce.number().positive("El sueldo anual debe ser positivo").nullable().optional(),
  profesion: z.string().max(50, "La profesión no puede exceder 50 caracteres").nullable().optional(),

  genero: z.string().max(20).nullable().optional(),
  fecha_nac: z.coerce.date().nullable().optional(),

  telefono: z.string()
    .min(6, "El teléfono es demasiado corto")
    .max(20, "El teléfono no puede exceder 20 caracteres"),

  email: z.string().email("Email inválido").max(50).nullable().optional(),

  provincia: z.string().max(50),
  localidad: z.string().max(50),
  calle: z.string().max(100),
  numero_calle: z.coerce.number().nullable().optional(),
  piso: z.string().max(10).nullable().optional(),
  departamento: z.string().max(10).nullable().optional(),
  codigo_postal: z.string().max(10),
id_tipo: z.number().nullable(),

  es_extranjero: z.boolean().default(false),
  recibe_notificaciones: z.boolean().default(true),
  dec_jurada: z.boolean(),
})
.superRefine((data, ctx) => {
  if (data.tipo_persona === "fisica") {
    if (!data.nombre) {
      ctx.addIssue({
        path: ["nombre"],
        code: "custom",
        message: "El nombre es requerido para persona física",
      });
    }
    if (!data.apellido) {
      ctx.addIssue({
        path: ["apellido"],
        code: "custom",
        message: "El apellido es requerido para persona física",
      });
    }
    if (!data.fecha_nac) {
      ctx.addIssue({
        path: ["fecha_nac"],
        code: "custom",
        message: "La fecha de nacimiento es requerida para persona física",
      });
    }
  }

  if (data.tipo_persona === "juridica") {
    if (!data.razon_social) {
      ctx.addIssue({
        path: ["razon_social"],
        code: "custom",
        message: "La razón social es requerida para persona jurídica",
      });
    }
  }
});

export type AsociadoFormData = z.infer<typeof AsociadoSchema>;
