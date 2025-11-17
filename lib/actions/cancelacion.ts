"use server";

import { withRLS } from "@/lib/db/with-rls";
import { EstadoCuota } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

/**
 * Registra una cancelación (cierre de período de pagos) para la mutual actual.
 * Se ejecuta bajo el contexto RLS, por lo que no requiere id_mutual explícito.
 */
export async function registrarCancelacion(periodo: string) {
  return withRLS(async (prisma) => {
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

// 🔹 Tipo de fila esperada en el Excel
interface CancelacionRow {
  id_credito: number;
  fecha_pago: string;
  monto_pagado: number;
  referencia?: string;
  observaciones?: string;
}

/**
 * Importa pagos masivos desde Excel e imputa los montos a las cuotas pendientes de cada crédito.
 * Crea un único pago global con múltiples PagoCuota.
 */
export async function importCancelacionesAction(formData: FormData) {
  return withRLS(async (prisma) => {
    const file = formData.get("file") as File;
    if (!file) return { error: "No se subió ningún archivo." };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<CancelacionRow>(sheet);

    if (data.length === 0) {
      return { error: "El archivo Excel está vacío." };
    }

    // 🔸 Validación básica de encabezados
    const expectedHeaders = [
      "id_credito",
      "fecha_pago",
      "monto_pagado",
      "referencia",
      "observaciones",
    ];
    const actualHeaders = Object.keys(data[0]);
    const missing = expectedHeaders.filter((h) => !actualHeaders.includes(h));
    if (missing.length > 0) {
      return {
        error: `Faltan columnas obligatorias: ${missing.join(", ")}.`,
      };
    }

    let totalMonto = 0;
    let procesadas = 0;
    let cuotasPagadas = 0;
    const errores: string[] = [];

    // 🔹 Crear pago global
    const fechaPrimeraFila = data[0].fecha_pago
      ? new Date(data[0].fecha_pago)
      : new Date();

    const pagoGlobal = await prisma.pago.create({
      data: {
        id_mutual: 1, // filtrado real lo aplica RLS
        fecha_pago: fechaPrimeraFila,
        monto_pago: 0,
        referencia: `IMPORT-${Date.now()}`,
        observaciones: "Carga masiva desde Excel",
      },
    });

    // 🔹 Iterar sobre filas del Excel
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const id_credito = Number(row.id_credito);
        const fecha_pago = new Date(row.fecha_pago);
        const monto_pagado = Number(row.monto_pagado);
        const referencia = row.referencia ?? "";
        const observaciones = row.observaciones ?? "";

        if (!id_credito || !fecha_pago || !monto_pagado) {
          errores.push(`Fila ${i + 2}: datos incompletos.`);
          continue;
        }

        const credito = await prisma.credito.findUnique({
          where: { id_credito },
          include: { cuotas: true, asociado: true },
        });

        if (!credito) {
          errores.push(`Fila ${i + 2}: crédito ${id_credito} no encontrado.`);
          continue;
        }

        // 🔹 Filtrar cuotas pendientes o vencidas
        const cuotasPendientes = credito.cuotas
          .filter((c) => c.estado !== EstadoCuota.pagada)
          .sort(
            (a, b) =>
              new Date(a.fecha_vencimiento).getTime() -
              new Date(b.fecha_vencimiento).getTime()
          );

        let montoRestante = monto_pagado;

        for (const cuota of cuotasPendientes) {
          if (montoRestante <= 0) break;

          const aplicar =
            montoRestante >= cuota.monto_total
              ? cuota.monto_total
              : montoRestante;

          // Crear relación PagoCuota
          await prisma.pagoCuota.create({
            data: {
              id_pago: pagoGlobal.id_pago,
              id_cuota: cuota.id_cuota,
              monto_pagado: aplicar,
              fecha_pago,
            },
          });

          // Actualizar estado de la cuota
          if (aplicar >= cuota.monto_total) {
            await prisma.cuota.update({
              where: { id_cuota: cuota.id_cuota },
              data: { estado: EstadoCuota.pagada },
            });
            cuotasPagadas++;
          }

          montoRestante -= aplicar;
        }

        totalMonto += monto_pagado;
        procesadas++;
      } catch (err: any) {
        errores.push(`Fila ${i + 2}: ${err.message}`);
      }
    }

    // 🔹 Actualizar monto total del pago global
    await prisma.pago.update({
      where: { id_pago: pagoGlobal.id_pago },
      data: { monto_pago: totalMonto },
    });

    // 🔹 Refrescar vistas
    revalidatePath("/dashboard/cancelaciones");
    revalidatePath("/dashboard/cuotas");

    return {
      success: true,
      procesadas,
      cuotasPagadas,
      totalMonto,
      errores,
    };
  });
}
