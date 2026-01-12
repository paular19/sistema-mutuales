"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";

interface ProductosFilters {
  search?: string;
  page?: number;
  limit?: number;
  incluirInactivos?: boolean;
}

/* ---------------------------------------------------------
   🔹 Obtener productos con filtros y paginación
--------------------------------------------------------- */
export async function getProductos({
  search = "",
  page = 1,
  limit = 10,
  incluirInactivos = false,
}: ProductosFilters = {}) {

  const info = await getServerUser();
  if (!info?.mutualId || !info.userId) throw new Error("Contexto inválido");

  return withRLS(info.mutualId, info.userId, async (tx) => {
    const skip = (page - 1) * limit;

    const where: any = {
      ...(incluirInactivos ? {} : { activo: true }),
      ...(search ? { nombre: { contains: search, mode: "insensitive" } } : {}),
    };

    const [productos, total] = await Promise.all([
      tx.producto.findMany({
        where,
        include: {
          _count: { select: { creditos: true } },
        },
        orderBy: { fecha_creacion: "desc" },
        skip,
        take: limit,
      }),
      tx.producto.count({ where }),
    ]);

    return {
      productos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  });
}

/* ---------------------------------------------------------
   🔹 Obtener un producto por ID (RLS lo restringe solo al mutual)
--------------------------------------------------------- */
export async function getProductoById(id: number) {
  const info = await getServerUser();
  if (!info?.mutualId || !info.userId) throw new Error("Contexto inválido");

  return withRLS(info.mutualId, info.userId, async (tx) => {
    return tx.producto.findFirst({
      where: { id_producto: id },
      include: { creditos: true },
    });
  });
}

/* ---------------------------------------------------------
   🔹 Obtener lista para selects (solo activos)
--------------------------------------------------------- */
export async function getProductosOptions() {
  const info = await getServerUser();
  if (!info?.mutualId || !info.userId) throw new Error("Contexto inválido");

  return withRLS(info.mutualId, info.userId, async (tx) => {
    return tx.producto.findMany({
      where: { activo: true },
      select: {
        id_producto: true,
        nombre: true,
        tasa_interes: true,
        comision_comerc: true,
        comision_gestion: true,
        dia_vencimiento: true,
        regla_vencimiento: true,
      },
      orderBy: { nombre: "asc" },
    });
  });
}
