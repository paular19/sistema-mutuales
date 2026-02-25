"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { EstadoCuota, EstadoLiquidacion } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

export interface PreLiquidacionCuota {
  id_cuota: number;
  asociado: string;
  producto: string;
  numero_cuenta: string;
  numero_ayuda: number;
  numero_credito: number;
  numero_cuota: number;
  fecha_vencimiento: Date;
  monto_total: number;
  estado: EstadoCuota;
}

interface PreLiquidacionFilters {
  productoId?: number;
}

export async function getHistorialLiquidaciones() {
  noStore();

  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    return prisma.liquidacion.findMany({
      orderBy: { fecha_cierre: "desc" },
      select: {
        id_liquidacion: true,
        periodo: true,
        fecha_cierre: true,
        total_monto: true,
        estado: true,
        _count: {
          select: { detalle: true },
        },
      },
    });
  });
}

export async function getPreLiquidacion(filters: PreLiquidacionFilters = {}) {
  noStore();

  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  const hoy = new Date();

  return withRLS(info.mutualId, info.userId, async (tx) => {
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

    // 🔹 MAPEO A DTO DE UI
    const filas: PreLiquidacionCuota[] = cuotas.map((c) => ({
      id_cuota: c.id_cuota,
      asociado:
        c.credito.asociado.tipo_persona === "juridica"
          ? c.credito.asociado.razon_social ?? ""
          : [c.credito.asociado.apellido, c.credito.asociado.nombre]
            .filter(Boolean)
            .join(", "),
      producto: c.credito.producto.nombre ?? "",
      numero_cuenta: String(c.credito.codigo_externo ?? c.credito.id_asociado),
      numero_ayuda: c.credito.id_credito,
      numero_credito: c.credito.id_credito,
      numero_cuota: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto_total: c.monto_total,
      estado: c.estado,
    }));

    return {
      cuotas: filas,
      total: filas.reduce((acc, f) => acc + f.monto_total, 0),
    };
  });
}