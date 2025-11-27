"use server";

import { withRLS } from "@/lib/db/with-rls";
import { EstadoCuota } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { getServerUser } from "../auth/get-server-user";

/**
 * Registra una cancelación (cierre de período de pagos) para la mutual actual.
 * Se ejecuta bajo el contexto RLS, por lo que no requiere id_mutual explícito.
 */

// 🔹 Tipo de fila del Excel
interface CancelacionRow {
  id_credito: number;
  fecha_pago: string;
  monto_pagado: number;
  referencia?: string;
  observaciones?: string;
}

export async function importCancelacionesAction(formData: FormData) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  const idMutual = info.mutualId!; // Narrowing seguro después del check

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const file = formData.get("file") as File;
    if (!file) return { error: "No se subió ningún archivo." };

    // Leer archivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convertir filas → tipadas
    const data = XLSX.utils.sheet_to_json<CancelacionRow>(sheet);

    if (data.length === 0) {
      return { error: "El archivo Excel está vacío." };
    }

    // Columnas esperadas
    const expected = [
      "id_credito",
      "fecha_pago",
      "monto_pagado",
      "referencia",
      "observaciones",
    ] as const;

    const headers = Object.keys(data[0]);
    const missing = expected.filter((h) => !headers.includes(h));

    if (missing.length > 0) {
      return { error: `Faltan columnas obligatorias: ${missing.join(", ")}` };
    }

    // Contadores
    let procesadas = 0;
    let cuotasPagadas = 0;
    let totalMonto = 0;

    // Fecha del pago global
    const fechaPagoGlobal =
      data[0].fecha_pago ? new Date(data[0].fecha_pago) : new Date();

    // Crear único PAGO GLOBAL
    const pagoGlobal = await prisma.pago.create({
      data: {
        id_mutual: idMutual,
        fecha_pago: fechaPagoGlobal,
        monto_pago: 0,
        referencia: `IMPORT-${Date.now()}`,
        observaciones: "Carga masiva desde Excel",
      },
    });

    // Procesar filas
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        const id_credito = Number(row.id_credito);
        const fecha_pago = new Date(row.fecha_pago);
        const monto_pagado = Number(row.monto_pagado);

        if (!id_credito || !row.fecha_pago || !monto_pagado) {
          continue;
        }

        const credito = await prisma.credito.findUnique({
          where: { id_credito },
          include: { cuotas: true },
        });

        if (!credito) continue;

        // Cuotas pendientes ordenadas
        const cuotasPendientes = credito.cuotas
          .filter((c) => c.estado !== EstadoCuota.pagada)
          .sort(
            (a, b) =>
              new Date(a.fecha_vencimiento).getTime() -
              new Date(b.fecha_vencimiento).getTime()
          );

        let restante = monto_pagado;

        for (const cuota of cuotasPendientes) {
          if (restante <= 0) break;

          const aplicar = Math.min(restante, cuota.monto_total);

          // Crear imputación
          await prisma.pagoCuota.create({
            data: {
              id_pago: pagoGlobal.id_pago,
              id_cuota: cuota.id_cuota,
              monto_pagado: aplicar,
              fecha_pago,
            },
          });

          // Si se pagó totalmente → marcar como pagada
          if (aplicar >= cuota.monto_total) {
            await prisma.cuota.update({
              where: { id_cuota: cuota.id_cuota },
              data: { estado: EstadoCuota.pagada },
            });
            cuotasPagadas++;
          }

          restante -= aplicar;
        }

        totalMonto += monto_pagado;
        procesadas++;
      } catch (err) {
        console.error("ERROR en fila", i + 2, err);
      }
    }

    // Actualizar monto total del pago global
    await prisma.pago.update({
      where: { id_pago: pagoGlobal.id_pago },
      data: { monto_pago: totalMonto },
    });

    // Refrescar UI
    revalidatePath("/dashboard/cancelaciones");
    revalidatePath("/dashboard/cuotas");

    return {
      success: true,
      procesadas,
      cuotasPagadas,
      totalMonto,
    };
  });
}


/**
 * Registra una cancelación (cierre de período de pagos) para la mutual actual.
 * Se ejecuta bajo el contexto RLS, por lo que no requiere id_mutual explícito.
 */
export async function registrarCancelacion(periodo: string) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const existente = await prisma.cancelacion.findFirst({
      where: { periodo },
    });

    if (existente) {
      return {
        success: false,
        message: "Ya existe una cancelación registrada para este período.",
      };
    }

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