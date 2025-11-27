"use server";

import { withRLS } from "@/lib/db/with-rls";
import { CancelacionFiltroSchema } from "@/lib/validators/cancelacion";
import { startOfMonth, endOfMonth, setDate, addMonths } from "date-fns";
import { $Enums } from "@prisma/client";
import { format } from "date-fns";
import { getConfiguracionCierre } from "./liquidaciones";
import { getPeriodoActual } from "@/lib/queries/periodos";
import { getServerUser } from "../auth/get-server-user";

/**
 * Devuelve cuotas abonadas y cuotas impagas dentro del período de liquidación.
 */
export async function getCancelaciones(params: {
  periodo?: string;
  page?: number;
  pageSize?: number;
}) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  const { periodo, page, pageSize } = CancelacionFiltroSchema.parse(params);

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    // 🔹 Rango
    const [year, month] = periodo
      ? periodo.split("-").map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1];

    const desde = startOfMonth(new Date(year, month - 1));
    const hasta = endOfMonth(new Date(year, month - 1));

    // 🟢 PAGADAS
    const cuotasPagadas = await prisma.cuota.findMany({
      where: {
        pagoCuotas: {
          some: { fecha_pago: { gte: desde, lte: hasta } },
        },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
        pagoCuotas: true,
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    // 🔴 IMPAGAS
    const cuotasNoPagadas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { gte: desde, lte: hasta },
        estado: {
          in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida],
        },
        pagoCuotas: { none: {} },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    // Paginación local
    const totalPagadas = cuotasPagadas.length;
    const totalNoPagadas = cuotasNoPagadas.length;

    return {
      periodo: `${year}-${month}`,
      pagadas: cuotasPagadas.slice((page - 1) * pageSize, page * pageSize),
      noPagadas: cuotasNoPagadas.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        pages: Math.max(
          Math.ceil(
            Math.max(totalPagadas, totalNoPagadas) / pageSize
          ),
          1
        ),
      },
    };
  });
}

export async function getCancelacionesDelPeriodo() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const config = await getConfiguracionCierre();

    // 🔹 NO ROMPER SI NO HAY CONFIGURACIÓN
    if (!config) {
      return {
        tieneConfiguracion: false,
        cuotas: [],
        total: 0,
        proximoCierre: null,
        periodo: null
      };
    }

    const hoy = new Date();
    const cierre = setDate(hoy, config.dia_cierre);
    const proximoCierre = cierre > hoy ? cierre : addMonths(cierre, 1);

    const cuotas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre },
        estado: $Enums.EstadoCuota.pagada,
        credito: { estado: "activo" },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
        pagoCuotas: true,
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    const filas = cuotas.map((c) => ({
      id_cuota: c.id_cuota,
      asociado:
        c.credito.asociado.tipo_persona === "juridica"
          ? c.credito.asociado.razon_social
          : `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`,
      producto: c.credito.producto.nombre,
      numero_credito: c.credito.id_credito,
      numero_cuota: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto_total: c.monto_total,
      estado: c.estado,
    }));

    const total = filas.reduce((acc, f) => acc + f.monto_total, 0);

    return {
      tieneConfiguracion: true,
      periodo: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`,
      cuotas: filas,
      total,
      proximoCierre,
    };
  });
}


/**
 * Obtiene cuotas pagadas e impagas correspondientes al período en curso
 * (hasta el próximo cierre definido en configuración).
 */
export async function getCancelacionesEnCurso() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const config = await getConfiguracionCierre();
    if (!config) throw new Error("No hay configuración de cierre activa.");

    const hoy = new Date();
    const cierre = setDate(hoy, config.dia_cierre);
    const proximoCierre = cierre > hoy ? cierre : addMonths(cierre, 1);

    const cuotasPagadas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre },
        estado: $Enums.EstadoCuota.pagada,
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
        pagoCuotas: true,
      },
    });

    const cuotasImpagas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre },
        estado: {
          in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida],
        },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
      },
    });

    return { cuotasPagadas, cuotasImpagas, proximoCierre };
  });
}

/**
 * Devuelve todas las cancelaciones registradas (para vista histórica)
 */
export async function getHistorialCancelaciones() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    return prisma.cancelacion.findMany({
      orderBy: { fecha_registro: "desc" },
      select: {
        id_cancelacion: true,
        periodo: true,
        fecha_registro: true,
      },
    });
  });
}

/**
 * Devuelve el detalle de cuotas abonadas e impagas de un período histórico.
 */
export async function getCancelacionByPeriodo(periodo: string) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const cuotas = await prisma.cuota.findMany({
      where: { credito: { estado: "activo" } },
      include: {
        credito: { include: { asociado: true, producto: true } },
        pagoCuotas: true,
      },
    });

    const abonadas = cuotas
      .filter(
        (c) =>
          c.pagoCuotas.some((p) => p.fecha_pago.toISOString().slice(0, 7) === periodo) &&
          c.estado === "pagada"
      )
      .map((c) => ({
        id_cuota: c.id_cuota,
        asociado:
          c.credito.asociado.tipo_persona === "juridica"
            ? c.credito.asociado.razon_social
            : `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`,
        producto: c.credito.producto.nombre,
        numero_credito: c.credito.id_credito,
        numero_cuota: c.numero_cuota,
        fecha_vencimiento: c.fecha_vencimiento,
        monto_total: c.monto_total,
        estado: c.estado,
      }));

    const impagas = cuotas
      .filter(
        (c) =>
          c.fecha_vencimiento.toISOString().slice(0, 7) === periodo &&
          c.estado !== "pagada"
      )
      .map((c) => ({
        id_cuota: c.id_cuota,
        asociado:
          c.credito.asociado.tipo_persona === "juridica"
            ? c.credito.asociado.razon_social
            : `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`,
        producto: c.credito.producto.nombre,
        numero_credito: c.credito.id_credito,
        numero_cuota: c.numero_cuota,
        fecha_vencimiento: c.fecha_vencimiento,
        monto_total: c.monto_total,
        estado: c.estado,
      }));

    return {
      periodo,
      abonadas,
      impagas,
      totalAbonadas: abonadas.reduce((a, c) => a + c.monto_total, 0),
      totalImpagas: impagas.reduce((a, c) => a + c.monto_total, 0),
    };
  });
}
