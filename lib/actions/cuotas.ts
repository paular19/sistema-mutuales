"use server";

import { withRLS } from "@/lib/db/with-rls";
import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth/get-server-user";

/**
 * 🔹 Registra un pago para una cuota específica
 * 
 * - Inserta en `pagos`
 * - Inserta en `pago_cuotas`
 * - Usa RLS correcto (mutualId + clerkId)
 */
export async function registrarPagoCuota(id_cuota: number, monto: number) {
  const info = await getServerUser();
  if (!info?.mutualId || !info?.userId) {
    throw new Error("No se pudo obtener el contexto del usuario.");
  }

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  return withRLS(mutualId, clerkId, async (tx) => {
    try {
      // 1️⃣ Crear pago
      const pago = await tx.pago.create({
        data: {
          id_mutual: mutualId,
          monto_pago: monto,
          fecha_pago: new Date(),
          referencia: `Pago manual cuota #${id_cuota}`,
        },
      });

      // 2️⃣ Crear relación en pago_cuotas
      await tx.pagoCuota.create({
        data: {
          id_pago: pago.id_pago,
          id_cuota,
          monto_pagado: monto,
          fecha_pago: new Date(),
        },
      });

      // 3️⃣ Revalidar la pantalla
      revalidatePath(`/dashboard/cuotas/${id_cuota}`);

      return { success: true };
    } catch (error) {
      console.error("❌ Error al registrar pago:", error);
      return { error: "No se pudo registrar el pago." };
    }
  });
}
