"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { EstadoCredito, EstadoCuota, EstadoLiquidacion } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function generarLiquidacion() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  const hoy = new Date();
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  return withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    // 🔴 Cuotas vencidas
    const vencidas = await tx.cuota.findMany({
      where: {
        estado: { in: [EstadoCuota.pendiente, EstadoCuota.vencida] },
        fecha_vencimiento: { lte: hoy },
        credito: {
          estado: { not: EstadoCredito.cancelado },
        },
      },
    });

    // 🔁 Cuotas arrastradas (liquidaciones NO cerradas)
    const arrastradas = await tx.cuota.findMany({
      where: {
        estado: { in: [EstadoCuota.pendiente, EstadoCuota.vencida] },
        credito: {
          estado: { not: EstadoCredito.cancelado },
        },
        liquidacionDetalle: {
          some: {
            liquidacion: {
              estado: { not: EstadoLiquidacion.cerrada },
            },
          },
        },
      },
    });

    const map = new Map<number, typeof vencidas[number]>();
    [...vencidas, ...arrastradas].forEach(c => map.set(c.id_cuota, c));
    const cuotas = Array.from(map.values());

    if (!cuotas.length) {
      return { error: "No hay cuotas para liquidar." };
    }

    const total = cuotas.reduce((a, c) => a + c.monto_total, 0);

    const liquidacion = await tx.liquidacion.create({
      data: {
        id_mutual: ctx.mutualId, // ✅
        periodo,
        fecha_cierre: hoy,
        total_monto: total,
        estado: EstadoLiquidacion.generada,
        detalle: {
          createMany: {
            data: cuotas.map(c => ({
              id_cuota: c.id_cuota,
              monto_liquidado: c.monto_total,
            })),
          },
        },
      },
    });

    revalidatePath("/dashboard/liquidaciones");

    return {
      success: true,
      id_liquidacion: liquidacion.id_liquidacion,
      cuotas: cuotas.length,
      total,
    };
  });
}
