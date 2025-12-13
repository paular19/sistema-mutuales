"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { Prisma } from "@prisma/client";

/* ---------------------------------------------------------
   🔹 CUOTAS DE UN CRÉDITO (OPTIMIZADO + RLS CORRECTO)
--------------------------------------------------------- */

export async function getCuotasByCreditoId(
  id_credito: number,
  params?: {
    estado?: "pagada" | "pendiente" | "vencida";
    fecha?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { estado, fecha, page = 1, pageSize = 10 } = params || {};
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  return withRLS(mutualId, clerkId, async (tx) => {
    /* 1️⃣ Crédito */
    const credito = await tx.credito.findFirst({
      where: { id_credito },
      include: {
        asociado: true,
        producto: {
          select: {
            nombre: true,
            comision_gestion: true,
          },
        },
      },
    });

    if (!credito) {
      return {
        credito: null,
        cuotas: [],
        totales: { total: 0, pagado: 0, saldo: 0 },
        pagination: { page: 1, totalPages: 1, hasMore: false },
        comisionGestion: 0,
      };
    }

    /* 2️⃣ Filtro base */
    const whereCuotas: Prisma.CuotaWhereInput = { id_credito };

    if (fecha) {
      const start = new Date(`${fecha}T00:00:00`);
      const end = new Date(`${fecha}T23:59:59.999`);
      whereCuotas.fecha_vencimiento = { gte: start, lte: end };
    }

    /* 3️⃣ Conteo total para paginación */
    const totalItems = await tx.cuota.count({ where: whereCuotas });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    /* 4️⃣ Items paginados */
    const skip = (page - 1) * pageSize;

    const items = await tx.cuota.findMany({
      where: whereCuotas,
      include: { pagoCuotas: true },
      orderBy: [{ fecha_vencimiento: "asc" }],
      skip,
      take: pageSize,
    });

    /* 5️⃣ cálculo de estados */
    const now = new Date();

    let cuotas = items.map((c) => {
      const pagado = c.pagoCuotas.reduce((a, p) => a + p.monto_pagado, 0);
      const saldo = Math.max(c.monto_total - pagado, 0);
      const vencida = new Date(c.fecha_vencimiento) < now && saldo > 0;

      return {
        ...c,
        pagado,
        saldo,
        estadoCalc: saldo <= 0 ? "pagada" : vencida ? "vencida" : "pendiente",
      };
    });

    if (estado && !fecha) {
      cuotas = cuotas.filter((c) => c.estadoCalc === estado);
    }

    /* 6️⃣ Totales globales */
    const cuotasAll = await tx.cuota.findMany({
      where: { id_credito },
      include: { pagoCuotas: true },
    });

    const totales = cuotasAll.reduce(
      (acc, cuo) => {
        const pagado = cuo.pagoCuotas.reduce((a, p) => a + p.monto_pagado, 0);
        acc.total += cuo.monto_total;
        acc.pagado += pagado;
        acc.saldo += Math.max(cuo.monto_total - pagado, 0);
        return acc;
      },
      { total: 0, pagado: 0, saldo: 0 }
    );

    /* 7️⃣ Respuesta final */
    return {
      credito,
      cuotas,
      totales,
      pagination: {
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
      comisionGestion: credito.producto?.comision_gestion ?? 0,
    };
  });
}

/* ---------------------------------------------------------
   🔹 DETALLE DE UNA CUOTA
--------------------------------------------------------- */

export async function getCuotaDetalle(id_cuota: number) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  return withRLS(info.mutualId, info.userId, async (tx) => {
    const cuota = await tx.cuota.findFirst({
      where: { id_cuota },
      include: {
        credito: {
          include: { asociado: true, producto: true },
        },
        pagoCuotas: {
          include: { pago: true },
          orderBy: { fecha_pago: "asc" },
        },
      },
    });

    if (!cuota) return { cuota: null };

    const pagado = cuota.pagoCuotas.reduce((acc, p) => acc + p.monto_pagado, 0);
    const saldo = Math.max(cuota.monto_total - pagado, 0);
    const vencida = new Date(cuota.fecha_vencimiento) < new Date() && saldo > 0;

    return {
      cuota: {
        ...cuota,
        pagado,
        saldo,
        estadoCalc: saldo <= 0 ? "pagada" : vencida ? "vencida" : "pendiente",
      },
    };
  });
}

/* ---------------------------------------------------------
   🔹 CUOTAS GLOBALES (para reportes)
--------------------------------------------------------- */

export async function getCuotasFiltered(params: {
  estado?: string;
  fecha?: string;
}) {
  const { estado, fecha } = params;

  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  return withRLS(info.mutualId, info.userId, async (tx) => {
    const where: Prisma.CuotaWhereInput = {};

    if (fecha) {
      const start = new Date(`${fecha}T00:00:00`);
      const end = new Date(`${fecha}T23:59:59.999`);
      where.fecha_vencimiento = { gte: start, lte: end };
    }

    const cuotasDB = await tx.cuota.findMany({
      where,
      include: {
        pagoCuotas: { include: { pago: true } },
        credito: { include: { asociado: true, producto: true } },
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    const now = new Date();

    const cuotas = cuotasDB
      .map((c) => {
        const pagado = c.pagoCuotas.reduce((acc, p) => acc + p.monto_pagado, 0);
        const saldo = Math.max(c.monto_total - pagado, 0);
        const vencida = new Date(c.fecha_vencimiento) < now && saldo > 0;
        const estadoCalc = saldo <= 0 ? "pagada" : vencida ? "vencida" : "pendiente";

        return { ...c, pagado, saldo, estadoCalc };
      })
      .filter((c) => (estado ? c.estadoCalc === estado : true));

    return cuotas;
  });
}
