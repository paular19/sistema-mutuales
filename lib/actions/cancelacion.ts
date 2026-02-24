"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { EstadoCuota, EstadoLiquidacion } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";


/**
 * Cobrar cuotas seleccionadas desde Cancelaciones (checkbox)
 * Valida que pertenezcan a la liquidación.
 */
export async function cobrarCuotasDesdeCancelacion(
  liquidacionId: number,
  formData: FormData
) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  const ids = formData.getAll("cuotaId").map((v) => Number(v));
  if (!ids.length) return { error: "No seleccionaste cuotas." };

  return withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    const cuotas = await tx.cuota.findMany({
      where: {
        id_cuota: { in: ids },
        estado: { not: EstadoCuota.pagada },
        credito: { id_mutual: ctx.mutualId },
      },
      select: { id_cuota: true, monto_total: true },
    });

    if (!cuotas.length) return { error: "Todas las cuotas seleccionadas ya estaban pagadas." };

    const hoy = new Date();
    const total = cuotas.reduce((a, c) => a + c.monto_total, 0);

    const pago = await tx.pago.create({
      data: {
        id_mutual: ctx.mutualId,
        fecha_pago: hoy,
        monto_pago: total,
        referencia: `CANCELACION-${liquidacionId}-${Date.now()}`,
        observaciones: "Cobranza desde cancelación",
      },
    });

    for (const cuota of cuotas) {
      await tx.pagoCuota.create({
        data: {
          id_pago: pago.id_pago,
          id_cuota: cuota.id_cuota,
          monto_pagado: cuota.monto_total,
          fecha_pago: hoy, // ✅ NOT NULL
        },
      });

      await tx.cuota.update({
        where: { id_cuota: cuota.id_cuota },
        data: { estado: EstadoCuota.pagada },
      });
    }

    revalidatePath("/dashboard/cancelaciones");
    revalidatePath("/dashboard/liquidaciones");

    return { success: true, total, count: cuotas.length };
  });
}

/**
 * Cerrar cancelación: crea Cancelacion (mutual+periodo) y cierra Liquidacion
 * Solo si NO quedan pendientes en esa liquidación.
 */
export async function cerrarCancelacion(periodo: string, liquidacionId: number) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  return withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    const existente = await tx.cancelacion.findUnique({
      where: { id_mutual_periodo: { id_mutual: ctx.mutualId, periodo } },
    });

    if (existente) return { error: "Ese período ya fue cerrado." };

    const pendientes = await tx.liquidacionDetalle.count({
      where: {
        id_liquidacion: liquidacionId,
        liquidacion: { id_mutual: ctx.mutualId },
        cuota: { estado: { not: EstadoCuota.pagada } },
      },
    });

    if (pendientes > 0) {
      return { error: "No podés cerrar: aún hay cuotas pendientes en la liquidación." };
    }

    await tx.cancelacion.create({
      data: { id_mutual: ctx.mutualId, periodo },
    });

    await tx.liquidacion.update({
      where: { id_liquidacion: liquidacionId },
      data: { estado: EstadoLiquidacion.cerrada },
    });

    revalidatePath("/dashboard/cancelaciones");
    revalidatePath("/dashboard/liquidaciones");

    return { success: true };
  });
}

/**
 * Importa pagos de cancelaciones desde Excel.
 * Acepta filas con:
 *  - id_cuota
 *  ó
 *  - id_credito + numero_cuota
 *
 * Crea un pago por cada fila (simple y auditable), y marca la cuota como pagada.
 * Si querés agrupar en 1 solo pago, te lo adapto.
 */
export async function importCancelacionesAction(formData: FormData) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada");

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No se recibió el archivo." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

  if (!rows.length) return { error: "El archivo no tiene filas." };

  return withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    let procesadas = 0;
    let cuotasPagadas = 0;

    const hoy = new Date();

    for (const r of rows) {
      // soporta encabezados con mayúsculas/minúsculas
      const id_cuota_raw = r.id_cuota ?? r.ID_CUOTA ?? r.cuota_id ?? r.CUOTA_ID ?? "";
      const id_credito_raw = r.id_credito ?? r.ID_CREDITO ?? r.credito_id ?? r.CREDITO_ID ?? "";
      const numero_cuota_raw =
        r.numero_cuota ?? r.NUMERO_CUOTA ?? r.nro_cuota ?? r.NRO_CUOTA ?? "";

      let cuota: { id_cuota: number; monto_total: number; estado: EstadoCuota } | null = null;

      // 1) Si viene id_cuota
      const id_cuota = Number(id_cuota_raw);
      if (Number.isFinite(id_cuota) && id_cuota > 0) {
        cuota = await tx.cuota.findUnique({
          where: { id_cuota },
          select: { id_cuota: true, monto_total: true, estado: true },
        });
      } else {
        // 2) Si viene id_credito + numero_cuota
        const id_credito = Number(id_credito_raw);
        const numero_cuota = Number(numero_cuota_raw);

        if (Number.isFinite(id_credito) && Number.isFinite(numero_cuota)) {
          const found = await tx.cuota.findFirst({
            where: { id_credito, numero_cuota },
            select: { id_cuota: true, monto_total: true, estado: true },
          });
          cuota = found ?? null;
        }
      }

      if (!cuota) {
        // fila inválida → la ignoramos (o podrías cortar y devolver error)
        continue;
      }

      procesadas++;

      // si ya estaba pagada, no hacemos nada
      if (cuota.estado === EstadoCuota.pagada) continue;

      // 🔐 IMPORTANTE: si querés forzar "solo cuotas de la última liquidación"
      // acá podrías validar que exista LiquidacionDetalle para esa cuota en la última liquidación.
      // Lo dejamos como opcional para no bloquear imports viejos.

      // Creamos un pago (por fila) y su pago_cuota
      const pago = await tx.pago.create({
        data: {
          id_mutual: ctx.mutualId,
          fecha_pago: hoy,
          monto_pago: cuota.monto_total,
          referencia: `IMPORT-CANCELACION-${Date.now()}-${cuota.id_cuota}`,
          observaciones: "Pago importado desde Excel (cancelaciones)",
        },
      });

      await tx.pagoCuota.create({
        data: {
          id_pago: pago.id_pago,
          id_cuota: cuota.id_cuota,
          monto_pagado: cuota.monto_total,
          fecha_pago: hoy, // ✅ NOT NULL
        },
      });

      await tx.cuota.update({
        where: { id_cuota: cuota.id_cuota },
        data: { estado: EstadoCuota.pagada },
      });

      cuotasPagadas++;
    }

    revalidatePath("/dashboard/cancelaciones");
    revalidatePath("/dashboard/liquidaciones");

    return { success: true, procesadas, cuotasPagadas };
  });
}