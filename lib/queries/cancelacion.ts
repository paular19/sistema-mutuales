"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { EstadoCuota, EstadoLiquidacion } from "@prisma/client";

/**
 * Cancelación = reflejo de la última liquidación NO cerrada (generada o revisada)
 * Devuelve filas "planas" para la UI.
 */
export async function getCancelacionDesdeLiquidacion() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  return withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    const liq = await tx.liquidacion.findFirst({
      where: {
        id_mutual: ctx.mutualId,
        estado: { in: [EstadoLiquidacion.generada, EstadoLiquidacion.revisada] },
      },
      orderBy: { fecha_creacion: "desc" }, // ✅ existe en tu schema
      include: {
        detalle: {
          orderBy: { id_detalle: "asc" },
          include: {
            cuota: {
              select: {
                id_cuota: true,
                numero_cuota: true,
                fecha_vencimiento: true,
                monto_total: true,
                estado: true,
                credito: {
                  select: {
                    id_credito: true,
                    asociado: {
                      select: {
                        nombre: true,
                        apellido: true,
                        razon_social: true,
                      },
                    },
                    producto: { select: { nombre: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!liq) return null;

    const filas = liq.detalle.map((d) => {
      const a = d.cuota.credito?.asociado;
      const asociado =
        a?.razon_social?.trim() ||
        [a?.apellido, a?.nombre].filter(Boolean).join(" ") ||
        null;

      return {
        id_cuota: d.cuota.id_cuota,
        asociado,
        producto: d.cuota.credito?.producto?.nombre ?? "-",
        numero_credito: d.cuota.credito?.id_credito ?? 0,
        numero_cuota: d.cuota.numero_cuota,
        fecha_vencimiento: d.cuota.fecha_vencimiento,
        monto_total: d.cuota.monto_total,
        estado: d.cuota.estado as EstadoCuota,
      };
    });

    const cuotasPagadas = filas.filter((f) => f.estado === EstadoCuota.pagada);
    const cuotasPendientes = filas.filter((f) => f.estado !== EstadoCuota.pagada);

    const totalPagadas = cuotasPagadas.reduce((a, f) => a + f.monto_total, 0);
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

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    return prisma.cancelacion.findMany({
      orderBy: { fecha_registro: "desc" },
      select: { periodo: true, fecha_registro: true },
    });
  });
}