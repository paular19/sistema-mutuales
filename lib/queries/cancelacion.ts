"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "../auth/get-server-user";
import { EstadoCuota } from "@prisma/client";

/* ────────────────────────────────────────────────────────────────
   🟢 1. Cancelaciones basadas en la ÚLTIMA LIQUIDACIÓN
------------------------------------------------------------------- */
export async function getCancelacionesDelDia() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    // 🟦 Obtener última liquidación con todos sus detalles
    const liquidacion = await prisma.liquidacion.findFirst({
      where: { id_mutual: info.mutualId! },
      orderBy: { fecha_cierre: "desc" },
      include: {
        detalle: {
          include: {
            cuota: {
              include: {
                pagoCuotas: true,
                credito: {
                  include: {
                    asociado: true,
                    producto: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Si no existe liquidación → devolvemos vacío
    if (!liquidacion || !liquidacion.detalle) {
      return {
        periodo: null,
        cuotasPagadas: [],
        cuotasPendientes: [],
        totalPagadas: 0,
        totalPendientes: 0,
      };
    }

    const periodo = liquidacion.periodo;

    // Transformar cuotas
    const cuotas = liquidacion.detalle.map((d) => {
      const c = d.cuota;

      const totalPagado = c.pagoCuotas.reduce(
        (acc: number, p: any) => acc + p.monto_pagado,
        0
      );

      const pendiente = c.monto_total - totalPagado;

      const asociado =
        c.credito.asociado.tipo_persona === "juridica"
          ? c.credito.asociado.razon_social
          : `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`.trim();

      return {
        id_cuota: c.id_cuota,
        asociado,
        producto: c.credito.producto.nombre,
        numero_credito: c.credito.id_credito,
        numero_cuota: c.numero_cuota,
        fecha_vencimiento: c.fecha_vencimiento,
        monto_total: c.monto_total,
        estado: pendiente <= 0 ? EstadoCuota.pagada : EstadoCuota.pendiente,
      };
    });

    // Separar pagadas y pendientes
    const cuotasPagadas = cuotas.filter((c) => c.estado === EstadoCuota.pagada);
    const cuotasPendientes = cuotas.filter((c) => c.estado !== EstadoCuota.pagada);

    return {
      periodo,
      cuotasPagadas,
      cuotasPendientes,
      totalPagadas: cuotasPagadas.reduce((acc: number, c) => acc + c.monto_total, 0),
      totalPendientes: cuotasPendientes.reduce(
        (acc: number, c) => acc + c.monto_total,
        0
      ),
    };
  });
}

/* ────────────────────────────────────────────────────────────────
   🟢 2. Historial de cancelaciones
------------------------------------------------------------------- */
export async function getHistorialCancelaciones() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  return withRLS(info.mutualId, info.userId, async prisma => {
    return prisma.cancelacion.findMany({
      where: { id_mutual: info.mutualId },
      orderBy: { fecha_registro: "desc" },
      select: {
        id_cancelacion: true,
        periodo: true,
        fecha_registro: true,
      },
    });
  });
}

/* ────────────────────────────────────────────────────────────────
   🟢 3. Detalle de un período histórico
------------------------------------------------------------------- */
export async function getCancelacionByPeriodo(periodo: string) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  const idMutual = info.mutualId;

  return withRLS(idMutual, info.userId, async prisma => {
    
    const liquidacion = await prisma.liquidacion.findFirst({
      where: { periodo, id_mutual: idMutual },
      include: { detalle: true },
    });

    if (!liquidacion) return null;

    const ids = liquidacion.detalle.map(d => d.id_cuota);

    const cuotas = await prisma.cuota.findMany({
      where: { id_cuota: { in: ids } },
      include: {
        credito: { include: { asociado: true, producto: true } },
        pagoCuotas: true,
      },
      orderBy: { numero_cuota: "asc" },
    });

    const abonadas = cuotas.filter(c => c.estado === "pagada");
    const impagas = cuotas.filter(c => c.estado !== "pagada");

    return {
      periodo,
      abonadas,
      impagas,
      totalAbonadas: abonadas.reduce((a, c) => a + c.monto_total, 0),
      totalImpagas: impagas.reduce((a, c) => a + c.monto_total, 0),
    };
  });
}
