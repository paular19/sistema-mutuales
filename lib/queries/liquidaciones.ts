"use server";

import { withRLS } from "@/lib/db/with-rls";
import { HistorialQuerySchema } from "@/lib/validators/liquidaciones";
import { addMonths, setDate } from "date-fns";
import { $Enums, ConfiguracionCierre } from "@prisma/client";
import { getPeriodoActual } from "@/lib/queries/periodos";
import { getServerUser } from "../auth/get-server-user";

/**
 * Obtiene la configuración de cierre activa (una por mutual).
 */
export async function getConfiguracionCierre(): Promise<ConfiguracionCierre | null> {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada para RLS");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    return prisma.configuracionCierre.findFirst({
      where: { activo: true },
    });
  });
}

/**
 * Devuelve el historial de liquidaciones (paginado y opcionalmente filtrado por período).
 */
export async function getHistorialLiquidaciones(params: {
  page?: number;
  pageSize?: number;
  periodo?: string;
}) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada para RLS");

  const { page, pageSize, periodo } = HistorialQuerySchema.parse(params);

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const where = periodo ? { periodo } : {};

    const [items, total] = await Promise.all([
      prisma.liquidacion.findMany({
        where,
        orderBy: { fecha_cierre: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id_liquidacion: true,
          periodo: true,
          fecha_cierre: true,
          total_monto: true,
          configuracion: { select: { dia_cierre: true } },
          _count: { select: { detalle: true } },
        },
      }),
      prisma.liquidacion.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  });
}

/**
 * Devuelve una liquidación específica por su ID.
 */
// lib/queries/liquidaciones.ts
export async function getLiquidacionById(id: number) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada para RLS");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const liquidacion = await prisma.liquidacion.findUnique({
      where: { id_liquidacion: id },
      include: {
        configuracion: true,
        detalle: {
          include: {
            cuota: {
              include: {
                credito: {
                  include: { asociado: true, producto: true },
                },
                pagoCuotas: true,
              },
            },
          },
        },
      },
    });

    if (!liquidacion) return null;

    const detalleActualizado = liquidacion.detalle.map((d) => {
      const cuota = d.cuota;
      const pagado =
        cuota.pagoCuotas?.reduce((acc, p) => acc + p.monto_pagado, 0) ?? 0;
      const saldo = Math.max(cuota.monto_total - pagado, 0);
      const vencida =
        new Date(cuota.fecha_vencimiento) < new Date() &&
        saldo > 0 &&
        cuota.estado !== "pagada";

      return {
        ...d,
        cuota: {
          ...cuota,
          estadoCalc: cuota.estado === "pagada" ? "pagada" : vencida ? "vencida" : "pendiente",
          saldo,
          pagado,
        },
      };
    });

    return {
      ...liquidacion,
      detalle: detalleActualizado,
    };
  });
}

export async function getPreLiquidacionActual(filters?: {
  search?: string;
  producto?: string;
}) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {

    const periodoActual = await getPeriodoActual();

    // 🔹 Si no hay configuración, devolver estado vacío seguro
    if (!periodoActual.tieneConfiguracion) {
      return {
        filas: [],
        total: 0,
        proximoCierre: null,
        sinConfiguracion: true,
      };
    }

    const { proximoCierre } = periodoActual;

    const cuotas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre! },
        estado: { in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida] },
        credito: {
          estado: "activo",
          asociado: filters?.search
            ? {
                OR: [
                  { nombre: { contains: filters.search, mode: "insensitive" } },
                  { apellido: { contains: filters.search, mode: "insensitive" } },
                  { razon_social: { contains: filters.search, mode: "insensitive" } },
                  { cuit: { contains: filters.search, mode: "insensitive" } },
                ],
              }
            : undefined,
          producto: filters?.producto
            ? { nombre: { contains: filters.producto, mode: "insensitive" } }
            : undefined,
        },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    const filas = cuotas.map((c) => ({
      id_cuota: c.id_cuota,
      asociado:
        c.credito.asociado.tipo_persona === "juridica"
          ? c.credito.asociado.razon_social
          : `${c.credito.asociado.apellido}, ${c.credito.asociado.nombre}`,
      producto: c.credito.producto.nombre,
      numero_credito: c.credito.id_credito,
      numero_cuota: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto_total: c.monto_total,
      estado: c.estado,
    }));

    return {
      filas,
      total: filas.reduce((acc, f) => acc + f.monto_total, 0),
      proximoCierre,
      sinConfiguracion: false,
    };
  });
}



