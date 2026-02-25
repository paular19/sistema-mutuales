"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { EstadoCuota, EstadoLiquidacion } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

/**
 * Cancelación = reflejo de la última liquidación NO cerrada (generada o revisada)
 * Devuelve filas "planas" para la UI.
 */
export async function getCancelacionDesdeLiquidacion(filters: { productoId?: number } = {}) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  noStore();

  return withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    const hoy = new Date();

    const liq = await tx.liquidacion.findFirst({
      where: {
        id_mutual: ctx.mutualId,
        estado: { in: [EstadoLiquidacion.generada, EstadoLiquidacion.revisada] },
      },
      orderBy: { fecha_creacion: "desc" }, // ✅ existe en tu schema
    });

    if (!liq) return null;

    const cuotas = await tx.cuota.findMany({
      where: {
        estado: { in: [EstadoCuota.pendiente, EstadoCuota.vencida] },
        ...(filters.productoId ? { credito: { id_producto: filters.productoId } } : {}),
        OR: [
          { fecha_vencimiento: { lte: hoy } },
          {
            liquidacionDetalle: {
              some: {
                liquidacion: {
                  estado: { not: EstadoLiquidacion.cerrada },
                },
              },
            },
          },
        ],
      },
      include: {
        credito: {
          include: {
            asociado: true,
            producto: true,
          },
        },
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    const cuotasPendientes = cuotas.map((cuota) => {
      const a = cuota.credito.asociado;
      const asociado =
        a.razon_social?.trim() ||
        [a.apellido, a.nombre].filter(Boolean).join(" ") ||
        null;

      return {
        id_cuota: cuota.id_cuota,
        asociado,
        producto: cuota.credito.producto?.nombre ?? "-",
        numero_cuenta: String(cuota.credito.codigo_externo ?? cuota.credito.id_asociado),
        numero_ayuda: cuota.credito.id_credito,
        numero_credito: cuota.credito.id_credito,
        numero_cuota: cuota.numero_cuota,
        fecha_vencimiento: cuota.fecha_vencimiento,
        monto_total: cuota.monto_total,
        estado: cuota.estado as EstadoCuota,
      };
    });

    const cuotasPagadas: typeof cuotasPendientes = [];
    const totalPagadas = 0;
    const totalPendientes = cuotasPendientes.reduce((a, f) => a + f.monto_total, 0);

    return {
      periodo: liq.periodo,
      liquidacionId: liq.id_liquidacion,
      cuotasPagadas,
      cuotasPendientes,
      totalPagadas,
      totalPendientes,
    };
  });
}

/**
 * Historial de cierres (cancelaciones) por período
 * (lo tuyo, queda igual)
 */
export async function getHistorialCancelaciones() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  noStore();

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    return prisma.cancelacion.findMany({
      orderBy: { fecha_registro: "desc" },
      select: { periodo: true, fecha_registro: true },
    });
  });
}