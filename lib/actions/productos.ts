"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { revalidatePath } from "next/cache";
import { ProductoSchema } from "@/lib/validators/producto";

/** ---------------------------------------------------------
 * 🔹 Crear producto
 --------------------------------------------------------- */
/** 🔹 Crear producto (con validación Zod + RLS) */
export async function createProducto(formData: FormData) {
  try {
    const info = await getServerUser();

    if (!info?.mutualId || !info.userId) {
      return { error: "No se pudo obtener el contexto del usuario." };
    }

    const raw = {
      nombre: formData.get("nombre") as string,
      numero_cuotas: Number(formData.get("numero_cuotas")),
      tasa_interes: Number(formData.get("tasa_interes")),
      dia_vencimiento: Number(formData.get("dia_vencimiento")),
      regla_vencimiento: formData.get("regla_vencimiento") as any,
      comision_comerc: Number(formData.get("comision_comerc")),
      comision_gestion: Number(formData.get("comision_gestion")),
    };

    const parsed = ProductoSchema.safeParse(raw);
    if (!parsed.success)
      return { error: parsed.error.errors.map((e) => e.message).join(", ") };

    await withRLS(info.mutualId, info.userId, async (tx) => {
      await tx.producto.create({
        data: {
          ...parsed.data,
          id_mutual: info.mutualId!, // 🔥 100% seguro porque validamos arriba
        },
      });
    });

    revalidatePath("/dashboard/productos");
    return { success: true, message: "Producto creado correctamente." };
  } catch (err) {
    console.error("Error creando producto:", err);
    return { error: "Error inesperado al crear el producto." };
  }
}


/** ---------------------------------------------------------
 * 🔹 Baja lógica
 --------------------------------------------------------- */
export async function bajaProducto(id_producto: number) {
  try {
    const info = await getServerUser();
    if (!info?.mutualId || !info.userId)
      return { error: "No se pudo obtener el contexto del usuario." };

    return withRLS(info.mutualId, info.userId, async (tx) => {
      const producto = await tx.producto.findUnique({
        where: { id_producto },
      });

      if (!producto) return { error: "Producto no encontrado." };
      if (!producto.activo)
        return { error: "El producto ya está dado de baja." };

      await tx.producto.update({
        where: { id_producto },
        data: { activo: false, fecha_baja: new Date() },
      });

      revalidatePath("/dashboard/productos");
      return {
        success: true,
        message:
          "Producto dado de baja. Ya no podrá usarse para nuevos créditos.",
      };
    });
  } catch (err) {
    console.error(err);
    return { error: "Error al dar de baja el producto." };
  }
}
