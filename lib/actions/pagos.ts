"use server";

import { withRLS } from "@/lib/db/with-rls";
import { revalidatePath } from "next/cache";
import { generarReciboPDF } from "@/lib/utils/recibo";
import { EstadoCuota } from "@prisma/client";
import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { PagoSchema } from "@/lib/validators/pagos";

/**
 * Registra un nuevo pago y devuelve el PDF del recibo.
 * - Valida los datos con Zod.
 * - Evita pagos duplicados sobre cuotas ya pagadas.
 * - Genera recibo PDF con toda la información del crédito.
 */
export async function registrarPagoYDescargarRecibo(data: unknown) {
  // ✅ Validar los datos de entrada
  const parsed = PagoSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Datos de pago inválidos";
    throw new Error(firstError);
  }

  const { cuotasIds, fecha_pago, observaciones } = parsed.data;

  return withRLS(async (prisma) => {
    const result = await prisma.$transaction(async (tx) => {
      // 🔒 Validar que las cuotas existan
      const cuotas = await tx.cuota.findMany({
        where: { id_cuota: { in: cuotasIds } },
        include: {
          credito: {
            include: { asociado: { include: { mutual: true } }, producto: true },
          },
        },
      });

      if (cuotas.length === 0) throw new Error("No se encontraron cuotas válidas.");

      // 🔒 Validar que no haya cuotas ya pagadas o parcialmente pagadas
      const cuotasPagadas = cuotas.filter(
        (c) => c.estado === EstadoCuota.pagada || c.estado === EstadoCuota.parcial
      );

      if (cuotasPagadas.length > 0) {
        const numeros = cuotasPagadas.map((c) => c.numero_cuota).join(", ");
        throw new Error(
          `Las cuotas ${numeros} ya fueron pagadas o tienen pagos parciales.`
        );
      }

      // 💰 Calcular monto total a pagar
      const montoTotal = cuotas.reduce((acc, c) => acc + c.monto_total, 0);

      // 🧾 Crear registro del pago
      const pago = await tx.pago.create({
        data: {
          id_mutual: cuotas[0].credito.asociado.id_mutual,
          fecha_pago,
          monto_pago: montoTotal,
          referencia: `REC-${Date.now()}`,
          observaciones,
          pagoCuotas: {
            create: cuotas.map((c) => ({
              id_cuota: c.id_cuota,
              monto_pagado: c.monto_total,
              fecha_pago,
            })),
          },
        },
        include: { pagoCuotas: true },
      });

      // 🔁 Actualizar cuotas como pagadas
      await Promise.all(
        cuotas.map((c) =>
          tx.cuota.update({
            where: { id_cuota: c.id_cuota },
            data: { estado: EstadoCuota.pagada },
          })
        )
      );

      // 🧾 Generar recibo PDF
      const pdfBytes = await generarReciboPDF({ pago, cuotas });

      // 🔄 Revalidar path para refrescar la tabla de cuotas
      revalidatePath("/dashboard/cuotas");

      return { pdfBytes, pago };
    });

    // ✅ Devolver archivo PDF descargable
    return new NextResponse(Buffer.from(result.pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=recibo_${result.pago.id_pago}.pdf`,
      },
    });
  });
}
