"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "../auth/get-server-user";
import { revalidatePath } from "next/cache";
import { EstadoCuota } from "@prisma/client";

/* ────────────────────────────────────────────────────────────────
   🟢 1. COBRAR CUOTAS SELECCIONADAS (PAGO GLOBAL)
------------------------------------------------------------------- */
export async function cobrarCuotasSeleccionadas(formData: FormData) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  const idMutual = info.mutualId;

  const ids = formData.getAll("cuotaId").map(v => Number(v));
  if (ids.length === 0) return { error: "No seleccionaste cuotas." };

  return withRLS(idMutual, info.userId, async prisma => {

    const cuotas = await prisma.cuota.findMany({
      where: { id_cuota: { in: ids } },
    });

    const total = cuotas.reduce((a, c) => a + c.monto_total, 0);
    const hoy = new Date();

    // Crear pago global
    const pago = await prisma.pago.create({
      data: {
        id_mutual: idMutual,
        fecha_pago: hoy,
        monto_pago: total,
        referencia: `CANCEL-${Date.now()}`,
        observaciones: "Cobranza manual desde cancelación",
      },
    });

    // Imputar cuotas y marcarlas como pagadas
    for (const cuota of cuotas) {
      await prisma.pagoCuota.create({
        data: {
          id_pago: pago.id_pago,
          id_cuota: cuota.id_cuota,
          monto_pagado: cuota.monto_total,
          fecha_pago: hoy,
        },
      });

      await prisma.cuota.update({
        where: { id_cuota: cuota.id_cuota },
        data: { estado: EstadoCuota.pagada },
      });
    }

    revalidatePath("/dashboard/cancelaciones");

    return {
      success: true,
      total,
      pago,
      cuotasCobradas: ids.length,
    };
  });
}

/* ────────────────────────────────────────────────────────────────
   🟢 2. Registrar cancelación de período
------------------------------------------------------------------- */
export async function registrarCancelacion(periodo: string) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  const idMutual = info.mutualId;

  return withRLS(idMutual, info.userId, async prisma => {

    const existente = await prisma.cancelacion.findFirst({
      where: { periodo, id_mutual: idMutual },
    });

    if (existente) {
      return { error: "Ya existe una cancelación registrada para ese período." };
    }

    const nueva = await prisma.cancelacion.create({
      data: {
        id_mutual: idMutual,
        periodo,
        fecha_registro: new Date(),
      },
    });

    return {
      success: true,
      id: nueva.id_cancelacion,
      message: `Período ${periodo} registrado correctamente.`,
    };
  });
}
