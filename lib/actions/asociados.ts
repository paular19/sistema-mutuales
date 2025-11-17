"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { AsociadoSchema } from "@/lib/validators/asociado";
import { ZodError } from "zod";
import { TipoPersona } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

/* -------------------------------------------------------------
   HELPERS
------------------------------------------------------------- */
async function getInfoOrThrow(): Promise<{ userId: string; mutualId: number }> {
  const info = await getServerUser();
  if (!info) throw new Error("Usuario no autenticado");
  if (!info.mutualId) throw new Error("Mutual no encontrada");

  return { userId: info.userId, mutualId: info.mutualId };
}

/* -------------------------------------------------------------
   HELPER: mensaje seguro
------------------------------------------------------------- */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Error desconocido";
  }
}

/* -------------------------------------------------------------
   BOOLEAN seguro
------------------------------------------------------------- */
function toBool(value: any): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  if (value == null) return false;

  const str = String(value).trim().toLowerCase();
  return ["1", "si", "sí", "true", "verdadero", "x"].includes(str);
}

/* -------------------------------------------------------------
   IMPORT MASIVO DESDE EXCEL
------------------------------------------------------------- */
export async function importAsociadosAction(formData: FormData) {
  try {
    const info = await getServerUser();
    if (!info || !info.mutualId) throw new Error("Mutual no encontrada");

    const mutualId = info.mutualId;
    const clerkId = info.userId;

    const file = formData.get("file") as File | null;
    if (!file) return { error: "No se subió ningún archivo" };

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buf);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

    const results: {
      row: number;
      success: boolean;
      errors?: string[];
    }[] = [];

    let successCount = 0;

    await withRLS(mutualId, clerkId, async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const a = rows[i];

        const mapped = {
          id_tipo: a.id_tipo ? Number(a.id_tipo) : null,
          tipo_persona:
            a.tipo_persona?.toLowerCase() === "juridica"
              ? TipoPersona.juridica
              : TipoPersona.fisica,

          nombre: a.nombre ?? null,
          apellido: a.apellido ?? null,
          razon_social: a.razon_social ?? null,

          cuit: a.cuit ? String(a.cuit) : null,

          sueldo_mes: a.sueldo_mes ? Number(a.sueldo_mes) : null,
          sueldo_ano: a.sueldo_ano ? Number(a.sueldo_ano) : null,

          fecha_nac: a.fecha_nac ? new Date(a.fecha_nac) : null,
          genero: a.genero ?? null,

          telefono: a.telefono ? String(a.telefono) : "",
          email: a.email ?? null,
          profesion: a.profesion ?? null,

          provincia: a.provincia ?? "",
          localidad: a.localidad ?? "",
          calle: a.calle ?? "",
          numero_calle: a.numero_calle ? Number(a.numero_calle) : null,
          piso: a.piso ?? null,
          departamento: a.departamento ?? null,
          codigo_postal: a.codigo_postal ?? "",

          es_extranjero: toBool(a.es_extranjero),
          recibe_notificaciones: toBool(a.recibe_notificaciones),
          dec_jurada: toBool(a.dec_jurada),
        };

        try {
          // Validación Zod
          AsociadoSchema.parse(mapped);

          // CUIT duplicado
          const exists = await tx.asociado.findFirst({
            where: { cuit: mapped.cuit },
          });

          if (exists) {
            results.push({
              row: i + 2,
              success: false,
              errors: ["Ya existe un asociado con ese CUIT"],
            });
            continue;
          }

          await tx.asociado.create({
            data: {
              ...mapped,
              id_mutual: mutualId,
            },
          });

          successCount++;
          results.push({ row: i + 2, success: true });
        } catch (err) {
          if (err instanceof ZodError) {
            results.push({
              row: i + 2,
              success: false,
              errors: Object.values(err.flatten().fieldErrors)
                .flat()
                .filter(Boolean) as string[],
            });
          } else {
            results.push({
              row: i + 2,
              success: false,
              errors: [getErrorMessage(err)],
            });
          }
        }
      }
    });

    return {
      success: true,
      successCount,
      errorCount: results.length - successCount,
      results,
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}



/* =============================================================
   🟢 CREAR ASOCIADO (CON VALIDACIONES CORRECTAS)
============================================================= */
export async function createAsociado(prevState: any, formData: FormData) {
  try {
    const info = await getServerUser();
    if (!info || !info.mutualId) throw new Error("Mutual no encontrada");

    const mutualId = info.mutualId;
    const clerkId = info.userId;

    // -------------------------------------------------------------
    // 1) PARSEO ZOD
    // -------------------------------------------------------------
    const rawData = {
      id_tipo: formData.get("id_tipo") ? Number(formData.get("id_tipo")) : null,
      tipo_persona: formData.get("tipo_persona") as string,
      nombre: formData.get("nombre") || null,
      apellido: formData.get("apellido") || null,
      razon_social: formData.get("razon_social") || null,
      cuit: formData.get("cuit") || null,
      sueldo_mes: formData.get("sueldo_mes")
        ? Number(formData.get("sueldo_mes"))
        : null,
      sueldo_ano: formData.get("sueldo_ano")
        ? Number(formData.get("sueldo_ano"))
        : null,
      fecha_nac: formData.get("fecha_nac")
        ? new Date(formData.get("fecha_nac") as string)
        : null,
      genero: formData.get("genero") || null,
      telefono: formData.get("telefono") || "",
      email: formData.get("email") || null,
      profesion: formData.get("profesion") || null,
      provincia: formData.get("provincia") || "",
      localidad: formData.get("localidad") || "",
      calle: formData.get("calle") || "",
      numero_calle: formData.get("numero_calle")
        ? Number(formData.get("numero_calle"))
        : null,
      piso: formData.get("piso") || null,
      departamento: formData.get("departamento") || null,
      codigo_postal: formData.get("codigo_postal") || "",
      es_extranjero: formData.get("es_extranjero") === "on",
      recibe_notificaciones: formData.get("recibe_notificaciones") === "on",
      dec_jurada: formData.get("dec_jurada") === "on",
    };

    const data = AsociadoSchema.parse(rawData);

    // -------------------------------------------------------------
    // 2) VALIDACIÓN CUIT (fuera del create)
    // -------------------------------------------------------------
    const existeCuit = await withRLS(mutualId, clerkId, async (tx) =>
      tx.asociado.findFirst({
        where: { cuit: data.cuit },
      })
    );

    if (existeCuit) {
      return {
        fieldErrors: { cuit: ["Ya existe un asociado con este CUIT"] },
      };
    }

    // -------------------------------------------------------------
    // 3) CREAR ASOCIADO
    // -------------------------------------------------------------
    await withRLS(mutualId, clerkId, async (tx) =>
      tx.asociado.create({
        data: {
          id_mutual: mutualId,
          id_tipo: data.id_tipo,
          tipo_persona: data.tipo_persona,
          nombre: data.nombre,
          apellido: data.apellido,
          razon_social: data.razon_social,
          cuit: data.cuit,
          sueldo_mes: data.sueldo_mes,
          sueldo_ano: data.sueldo_ano,
          fecha_nac: data.fecha_nac,
          genero: data.genero,
          telefono: data.telefono,
          email: data.email,
          profesion: data.profesion,
          provincia: data.provincia,
          localidad: data.localidad,
          calle: data.calle,
          numero_calle: data.numero_calle,
          piso: data.piso,
          departamento: data.departamento,
          codigo_postal: data.codigo_postal,
          es_extranjero: data.es_extranjero,
          recibe_notificaciones: data.recibe_notificaciones,
          dec_jurada: data.dec_jurada,
        },
      })
    );

    revalidatePath("/dashboard/asociados");
    return { success: true };
  } catch (err) {
    console.error("❌ createAsociado error:", err);
    if (err instanceof ZodError) {
      return { fieldErrors: err.flatten().fieldErrors };
    }
    return { error: "Error inesperado al crear el asociado" };
  }
}

/* =============================================================
   ✏️ ACTUALIZAR ASOCIADO
============================================================= */
export async function updateAsociado(
  id: number,
  prevState: any,
  formData: FormData
) {
  try {
    const { userId, mutualId } = await getInfoOrThrow();

    // 1) Parseo Zod
    const rawData = {
      id_tipo: formData.get("id_tipo")
        ? Number(formData.get("id_tipo"))
        : null,
      tipo_persona: formData.get("tipo_persona") as string,
      nombre: formData.get("nombre") || null,
      apellido: formData.get("apellido") || null,
      razon_social: formData.get("razon_social") || null,
      cuit: formData.get("cuit") || null,
      sueldo_mes: formData.get("sueldo_mes")
        ? Number(formData.get("sueldo_mes"))
        : null,
      sueldo_ano: formData.get("sueldo_ano")
        ? Number(formData.get("sueldo_ano"))
        : null,
      fecha_nac: formData.get("fecha_nac")
        ? new Date(formData.get("fecha_nac") as string)
        : null,
      genero: formData.get("genero") || null,
      telefono: formData.get("telefono") || "",
      email: formData.get("email") || null,
      profesion: formData.get("profesion") || null,
      provincia: (formData.get("provincia") as string) || "",
      localidad: (formData.get("localidad") as string) || "",
      calle: (formData.get("calle") as string) || "",
      numero_calle: formData.get("numero_calle")
        ? Number(formData.get("numero_calle"))
        : null,
      piso: formData.get("piso") || null,
      departamento: formData.get("departamento") || null,
      codigo_postal: (formData.get("codigo_postal") as string) || "",
      es_extranjero: formData.get("es_extranjero") === "on",
      recibe_notificaciones: formData.get("recibe_notificaciones") === "on",
      dec_jurada: formData.get("dec_jurada") === "on",
    };

    const data = AsociadoSchema.parse(rawData);

    // 2) CUIT duplicado
    const existeCuit = await withRLS(mutualId, userId, async (tx) =>
      tx.asociado.findFirst({
        where: { cuit: data.cuit, NOT: { id_asociado: id } },
      })
    );

    if (existeCuit) {
      return {
        fieldErrors: { cuit: ["Ya existe otro asociado con este CUIT"] },
      };
    }

    // 3) Actualizar
    await withRLS(mutualId, userId, async (tx) =>
      tx.asociado.update({
        where: { id_asociado: id },
        data: { ...data },
      })
    );

    revalidatePath("/dashboard/asociados");
    revalidatePath(`/dashboard/asociados/${id}`);
    return { success: true };
  } catch (err) {
    console.error("❌ Error en updateAsociado:", err);
    if (err instanceof ZodError)
      return { fieldErrors: err.flatten().fieldErrors };
    return { error: "Error inesperado al actualizar" };
  }
}

/* =============================================================
   🗑 ELIMINAR ASOCIADO
============================================================= */
export async function deleteAsociado(id: number) {
  try {
    const { userId, mutualId } = await getInfoOrThrow();

    await withRLS(mutualId, userId, async (tx) => {
      const activos = await tx.credito.count({
        where: { id_asociado: id, estado: "activo" },
      });

      if (activos > 0) {
        return { error: "No se puede eliminar un asociado con créditos activos" };
      }

      await tx.asociado.delete({ where: { id_asociado: id } });
    });

    revalidatePath("/dashboard/asociados");
    return { success: true };
  } catch (err) {
    console.error("❌ Error deleteAsociado:", err);
    return { error: "Error inesperado al eliminar el asociado" };
  }
}
