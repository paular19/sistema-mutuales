"use server";

import { withRLS } from "@/lib/db/with-rls";
import { HistorialQuerySchema } from "@/lib/validators/liquidaciones";
import { addMonths, setDate } from "date-fns";
import { $Enums } from "@prisma/client";
import { getPeriodoActual } from "@/lib/queries/periodos";

/**
 * Obtiene la configuración de cierre activa (una por mutual).
 */
export async function getConfiguracionCierre() {
  return withRLS(async (prisma) => {
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
  const { page, pageSize, periodo } = HistorialQuerySchema.parse(params);

  return withRLS(async (prisma) => {
    const where = periodo ? { periodo } : {};

    const [items, total] = await Promise.all([
      prisma.liquidacion.findMany({
        where,
        orderBy: { fecha_cierre: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id_liquidacion: true,
          id_mutual: true,
          periodo: true,
          fecha_cierre: true,
          total_monto: true,
          id_configuracion: true,
          configuracion: {
            select: { dia_cierre: true },
          },
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
  return withRLS(async (prisma) => {
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

    // 🔹 Cálculo actualizado del estado (opcional)
    const detalleActualizado = liquidacion.detalle.map((d) => {
      const cuota = d.cuota;
      const pagado = cuota.pagoCuotas?.reduce((acc, p) => acc + p.monto_pagado, 0) ?? 0;
      const saldo = Math.max(cuota.monto_total - pagado, 0);
      const vencida =
        new Date(cuota.fecha_vencimiento) < new Date() && saldo > 0 && cuota.estado !== "pagada";
      const estadoCalc =
        cuota.estado === "pagada" ? "pagada" : vencida ? "vencida" : "pendiente";

      return { ...d, cuota: { ...cuota, estadoCalc, saldo, pagado } };
    });

    return { ...liquidacion, detalle: detalleActualizado };
  });
}


export async function getPreLiquidacionActual(filters?: {
  search?: string;
  producto?: string;
}) {
  return withRLS(async (prisma) => {
    const { proximoCierre } = await getPeriodoActual();

    const cuotas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre },
        estado: { in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida] },
        credito: {
          estado: "activo",
          asociado: filters?.search
            ? {
                OR: [
                  { nombre: { contains: filters.search, mode: "insensitive" } },
                  { apellido: { contains: filters.search, mode: "insensitive" } },
                  { cuit: { contains: filters.search, mode: "insensitive" } },
                  { email: { contains: filters.search, mode: "insensitive" } },
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
      asociado: `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`.trim(),
      producto: c.credito.producto.nombre,
      numero_credito: c.credito.id_credito,
      numero_cuota: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto_total: c.monto_total,
      estado: c.estado,
    }));

    const total = filas.reduce((acc, f) => acc + f.monto_total, 0);
    return { filas, total, proximoCierre };
  });
}

