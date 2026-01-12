"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";

/**
 * 🔹 Obtener créditos con filtros + paginación usando RLS real
 *    (VERSIÓN SERIALIZADA PARA CLIENT COMPONENTS)
 */
export async function getCreditos(params: any = {}) {
  const info = await getServerUser();
  if (!info) throw new Error("Usuario no autenticado");

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  if (!mutualId) throw new Error("Mutual ID no encontrado");

  return withRLS(mutualId, clerkId, async (tx) => {
    params = params || {};

    const nombre = params.nombre ?? "";
    const estado = params.estado ?? "";
    const producto = params.producto ?? "";

    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;

    const palabras = nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const where: any = {
      ...(estado ? { estado } : {}),

      ...(producto
        ? {
          producto: {
            nombre: { contains: producto, mode: "insensitive" },
          },
        }
        : {}),

      ...(palabras.length > 0
        ? {
          AND: palabras.map((p: string) => ({
            asociado: {
              OR: [
                { nombre: { contains: p, mode: "insensitive" } },
                { apellido: { contains: p, mode: "insensitive" } },
                { razon_social: { contains: p, mode: "insensitive" } },
              ],
            },
          })),
        }
        : {}),
    };

    const [rawCreditos, total] = await Promise.all([
      tx.credito.findMany({
        where,
        include: {
          asociado: {
            select: {
              nombre: true,
              apellido: true,
              razon_social: true,
              tipo_persona: true,
            },
          },
          producto: { select: { nombre: true } },

          // 🔥 TRAEMOS TODAS LAS CUOTAS, PERO SOLO LO NECESARIO
          cuotas: {
            select: {
              estado: true,
              monto_capital: true,
              monto_interes: true,
            },
          },
        },
        orderBy: { fecha_creacion: "desc" },
        skip,
        take: limit,
      }),

      tx.credito.count({ where }),
    ]);

    // 🔥 CALCULAMOS ACÁ EN JS
    const creditos = rawCreditos.map((c: any) => {
      const cuotasPagadas = c.cuotas.filter((q: any) => q.estado === "pagada")
        .length;

      const cuotasPendientes = c.cuotas.filter(
        (q: any) => q.estado === "pendiente"
      ).length;

      return {
        ...c,
        cuotas_pagadas: cuotasPagadas,
        cuotas_pendientes: cuotasPendientes,
      };
    });

    return {
      creditos,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
      limit,
    };
  });
}


/**
 * 🔹 Obtener crédito por ID — con RLS (serializado)
 */
export async function getCreditoById(id_credito: number) {
  const info = await getServerUser();
  if (!info?.mutualId || !info.userId)
    throw new Error("Usuario o mutual inválido");

  return await withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    const c = await tx.credito.findUnique({
      where: { id_credito },
      include: {
        asociado: {
          select: {
            id_asociado: true,
            nombre: true,
            apellido: true,
            razon_social: true,
            tipo_persona: true
          },
        },
        producto: {
          select: {
            id_producto: true,
            nombre: true,
            tasa_interes: true,
            comision_comerc: true,
            dia_vencimiento: true,
            regla_vencimiento: true,
          },
        },
      },
    });

    if (!c) return null;

    // 🔥 SERIALIZAR
    return {
      ...c,
      fecha_creacion: c.fecha_creacion?.toISOString() ?? null,
      primera_venc: c.primera_venc?.toISOString() ?? null,
    };
  });
}
