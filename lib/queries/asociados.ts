// lib/queries/asociados.ts

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { Prisma } from "@prisma/client";

export interface AsociadosFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface AsociadosResponse {
  asociados: any[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
    pages: number;
    total: number;
  };
}

/* ---------------------------------------------------------
   🔹 Obtener lista paginada de asociados (ULTRA RÁPIDA)
--------------------------------------------------------- */
export async function getAsociados(filters: AsociadosFilters = {}): Promise<AsociadosResponse> {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  return withRLS(mutualId, clerkId, async (tx) => {
    const search = filters.search?.trim() || "";
    const page = filters.page ? Number(filters.page) : 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    // =========================================================
    // MULTI-PALABRA CORRECTO (nombre + apellido + razón social)
    // =========================================================
    let where: Prisma.AsociadoWhereInput = {
      id_mutual: mutualId,
    };

    if (search.length > 0) {
      const tokens = search.split(" ").filter((t) => t.trim().length > 0);

      where.AND = tokens.map((token) => ({
        OR: [
          { nombre: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { apellido: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { razon_social: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: token, mode: Prisma.QueryMode.insensitive } },
          { cuit: { contains: token } },
        ],
      }));
    }

    // =========================================================
    // ⚡ QUERY ÚNICA (SIN COUNT — MÁS RÁPIDO EN NEON)
    // =========================================================
    const items = await tx.asociado.findMany({
      where,
      skip,
      take: limit + 1, // pide uno extra para saber si hay siguiente página
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      include: { tipoAsociado: true },
    });

    const hasMore = items.length > limit;
    const asociados = hasMore ? items.slice(0, limit) : items;

    return {
      asociados,
      pagination: {
        page,
        limit,
        hasMore,
        pages: page + (hasMore ? 1 : 0), // evita undefined
        total: -1, // no usamos count, porque es más lento
      },
    };
  });
}

/* ---------------------------------------------------------
   🔹 Obtener un asociado por ID
--------------------------------------------------------- */
export async function getAsociadoById(id: number) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  return withRLS(mutualId, clerkId, (tx) =>
    tx.asociado.findFirst({
      where: { id_asociado: id },
      include: { tipoAsociado: true },
    })
  );
}

/* ---------------------------------------------------------
   🔹 Opciones para selects
--------------------------------------------------------- */
export async function getAsociadosOptions() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  return withRLS(mutualId, clerkId, (tx) =>
    tx.asociado.findMany({
      select: {
        id_asociado: true,
        nombre: true,
        apellido: true,
        cuit: true,
      },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    })
  );
}

/* ---------------------------------------------------------
   🔹 Existe CUIT duplicado
--------------------------------------------------------- */
export async function existsAsociadoByCuit(cuit: string, ignoreId?: number) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  return withRLS(mutualId, clerkId, (tx) =>
    tx.asociado.findFirst({
      where: {
        cuit,
        ...(ignoreId ? { NOT: { id_asociado: ignoreId } } : {}),
      },
    })
  );
}

/* ---------------------------------------------------------
   🔹 Créditos activos
--------------------------------------------------------- */
export async function countCreditosActivos(idAsociado: number) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  return withRLS(mutualId, clerkId, (tx) =>
    tx.credito.count({
      where: {
        id_asociado: idAsociado,
        estado: "activo",
      },
    })
  );
}
