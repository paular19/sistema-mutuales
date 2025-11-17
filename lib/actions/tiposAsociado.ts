"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { revalidatePath } from "next/cache";

/* ---------------------------------------------------------
   🔹 CARGAR LISTA DE TIPOS
--------------------------------------------------------- */
export async function loadTiposAsociadoAction() {
  console.log("📌 Ejecutando loadTiposAsociadoAction...");

  const info = await getServerUser();
  if (!info) throw new Error("Usuario no autenticado");

  const tipos = await withRLS(info.mutualId!, info.userId, async (tx) => {
    return tx.tipoAsociado.findMany({
      where: { id_mutual: info.mutualId },
      orderBy: { nombre: "asc" },
    });
  });

  console.log("📌 TIPOS RLS ->", tipos);
  return tipos;
}

/* ---------------------------------------------------------
   🔹 CREAR TIPO
--------------------------------------------------------- */
export async function createTipoAsociado(data: { nombre: string }) {
  try {
    const info = await getServerUser();
    if (!info) throw new Error("Usuario no autenticado");

    const result = await withRLS(info.mutualId!, info.userId, async (tx) => {
      return tx.tipoAsociado.create({
        data: {
          nombre: data.nombre,
          id_mutual: info.mutualId!,
        },
      });
    });

    revalidatePath("/dashboard/tipos-asociados");
    return result;
  } catch (err) {
    console.error("❌ Error createTipoAsociado:", err);
    return { error: "Error creando tipo de asociado" };
  }
}

/* ---------------------------------------------------------
   🔹 ACTUALIZAR TIPO
--------------------------------------------------------- */
export async function updateTipoAsociado(
  id: number,
  data: { nombre: string }
) {
  try {
    const info = await getServerUser();
    if (!info) throw new Error("Usuario no autenticado");

    return await withRLS(info.mutualId!, info.userId, async (tx) => {
      // ⭐ Validar que exista y pertenezca a esta mutual
      const tipo = await tx.tipoAsociado.findFirst({
        where: { id_tipo: id, id_mutual: info.mutualId },
      });

      if (!tipo) {
        return { error: "No existe el tipo o no pertenece a tu Mutual" };
      }

      // ⭐ Actualizar
      const updated = await tx.tipoAsociado.update({
        where: { id_tipo: id },
        data: { nombre: data.nombre },
      });

      revalidatePath("/dashboard/tipos-asociados");
      return updated;
    });
  } catch (err) {
    console.error("❌ Error updateTipoAsociado:", err);
    return { error: "Error actualizando tipo de asociado" };
  }
}

/* ---------------------------------------------------------
   🔹 ELIMINAR TIPO
--------------------------------------------------------- */
export async function deleteTipoAsociado(id: number) {
  try {
    const info = await getServerUser();
    if (!info) throw new Error("Usuario no autenticado");

    return await withRLS(info.mutualId!, info.userId, async (tx) => {
      // ⭐ Validar existencia y mutual
      const tipo = await tx.tipoAsociado.findFirst({
        where: { id_tipo: id, id_mutual: info.mutualId },
      });

      if (!tipo)
        return { error: "Tipo no encontrado o pertenece a otra mutual" };

      // ⭐ Evitar eliminar tipos en uso
      const count = await tx.asociado.count({
        where: { id_tipo: id, id_mutual: info.mutualId },
      });

      if (count > 0) {
        return {
          error: "No se puede eliminar un tipo que tiene asociados vinculados.",
        };
      }

      // ⭐ Eliminar
      await tx.tipoAsociado.delete({
        where: { id_tipo: id },
      });

      revalidatePath("/dashboard/tipos-asociados");
      return { success: true };
    });
  } catch (err) {
    console.error("❌ Error deleteTipoAsociado:", err);
    return { error: "Error inesperado al eliminar el tipo" };
  }
}
