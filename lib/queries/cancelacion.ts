"use server";

import { withRLS } from "@/lib/db/with-rls";
import { CancelacionFiltroSchema } from "@/lib/validators/cancelacion";
import { startOfMonth, endOfMonth, setDate, addMonths } from "date-fns";
import { $Enums } from "@prisma/client";
import { format } from "date-fns";
import { getConfiguracionCierre } from "./liquidaciones";
import { getPeriodoActual } from "@/lib/queries/periodos";

/**
 * Devuelve cuotas abonadas y cuotas impagas dentro del período de liquidación.
 */
export async function getCancelaciones(params: {
  periodo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { periodo, page, pageSize } = CancelacionFiltroSchema.parse(params);

  return withRLS(async (prisma) => {
    // 🔹 Determinar rango de fechas (por periodo YYYY-MM)
    const [year, month] = periodo
      ? periodo.split("-").map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1];

    const desde = startOfMonth(new Date(year, month - 1));
    const hasta = endOfMonth(new Date(year, month - 1));

    // 🟢 Cuotas pagadas dentro del período
    const cuotasPagadas = await prisma.cuota.findMany({
      where: {
        pagoCuotas: {
          some: {
            fecha_pago: { gte: desde, lte: hasta },
          },
        },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
        pagoCuotas: true,
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    // 🔴 Cuotas vencidas dentro del período y no pagadas
    const cuotasNoPagadas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { gte: desde, lte: hasta },
        estado: { in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida] },
        pagoCuotas: { none: {} },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    // 🔹 Paginación manual
    const totalPagadas = cuotasPagadas.length;
    const totalNoPagadas = cuotasNoPagadas.length;

    const paginatedPagadas = cuotasPagadas.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
    const paginatedNoPagadas = cuotasNoPagadas.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return {
      periodo: `${year}-${month}`,
      pagadas: paginatedPagadas,
      noPagadas: paginatedNoPagadas,
      pagination: {
        page,
        pageSize,
        pages: Math.max(
          Math.ceil(Math.max(totalPagadas, totalNoPagadas) / pageSize),
          1
        ),
      },
    };
  });
}

export async function getCancelacionesDelPeriodo() {
  return withRLS(async (prisma) => {
    const config = await getConfiguracionCierre();
    if (!config) throw new Error("No hay configuración de cierre activa.");

    const hoy = new Date();
    const cierreEsteMes = setDate(hoy, config.dia_cierre);
    const proximoCierre = cierreEsteMes > hoy ? cierreEsteMes : addMonths(cierreEsteMes, 1);

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
      asociado: `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`,
      producto: c.credito.producto.nombre,
      numero_credito: c.credito.id_credito,
      numero_cuota: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto_total: c.monto_total,
      estado: c.estado,
    }));

    const total = filas.reduce((acc, f) => acc + f.monto_total, 0);
    const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

    return { periodo, cuotas: filas, total, proximoCierre };
  });
}

/**
 * Obtiene cuotas pagadas e impagas correspondientes al período en curso
 * (hasta el próximo cierre definido en configuración).
 */
export async function getCancelacionesEnCurso() {
  return withRLS(async (prisma) => {
    const config = await getConfiguracionCierre();
    if (!config) throw new Error("No hay configuración de cierre activa.");

    const hoy = new Date();
    const cierreEsteMes = setDate(hoy, config.dia_cierre);
    const proximoCierre = cierreEsteMes > hoy ? cierreEsteMes : addMonths(cierreEsteMes, 1);

    // 🔹 Cuotas pagadas dentro del período (hasta el próximo cierre)
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

    // 🔹 Cuotas impagas (pendientes o vencidas) hasta el próximo cierre
    const cuotasImpagas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre },
        estado: { in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida] },
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
  return withRLS(async (prisma) => {
    const cancelaciones = await prisma.cancelacion.findMany({
      orderBy: { fecha_registro: "desc" },
      select: {
        id_cancelacion: true,
        periodo: true,
        fecha_registro: true,
      },
    });

    return cancelaciones;
  });
}

/**
 * Devuelve el detalle de cuotas abonadas e impagas de un período histórico.
 */
export async function getCancelacionByPeriodo(periodo: string) {
  return withRLS(async (prisma) => {
    const cuotas = await prisma.cuota.findMany({
      where: {
        credito: { estado: "activo" },
      },
      include: {
        credito: { include: { asociado: true, producto: true } },
        pagoCuotas: true,
      },
    });

    const abonadas = cuotas
      .filter(
        (c) =>
          c.pagoCuotas.some((p) => format(p.fecha_pago, "yyyy-MM") === periodo) &&
          c.estado === "pagada"
      )
      .map((c) => ({
        id_cuota: c.id_cuota,
        asociado: `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`,
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
          format(c.fecha_vencimiento, "yyyy-MM") === periodo &&
          c.estado !== "pagada"
      )
      .map((c) => ({
        id_cuota: c.id_cuota,
        asociado: `${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`,
        producto: c.credito.producto.nombre,
        numero_credito: c.credito.id_credito,
        numero_cuota: c.numero_cuota,
        fecha_vencimiento: c.fecha_vencimiento,
        monto_total: c.monto_total,
        estado: c.estado,
      }));

    const totalAbonadas = abonadas.reduce((acc, c) => acc + c.monto_total, 0);
    const totalImpagas = impagas.reduce((acc, c) => acc + c.monto_total, 0);

    return { periodo, abonadas, impagas, totalAbonadas, totalImpagas };
  });
}

/**
 * Registra una cancelación (cierre de período de pagos) para la mutual actual.
 * Se ejecuta bajo el contexto RLS, por lo que no requiere id_mutual explícito.
 */
export async function registrarCancelacion(periodo: string) {
  return withRLS(async (prisma) => {
    // 🔍 Verificar si ya existe una cancelación para el mismo período en esta mutual
    const existente = await prisma.cancelacion.findFirst({
      where: { periodo },
    });

    if (existente) {
      return { success: false, message: "Ya existe una cancelación registrada para este período." };
    }

    // 🟢 Crear nueva cancelación
    const nueva = await prisma.cancelacion.create({
      data: {
        periodo,
        fecha_registro: new Date(),
      },
    });

    return {
      success: true,
      id: nueva.id_cancelacion,
      message: `Cancelación registrada correctamente para el período ${periodo}.`,
    };
  });
}