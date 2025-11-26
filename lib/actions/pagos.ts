"use server";

import { withRLS } from "@/lib/db/with-rls";
import { EstadoCuota } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { generarReciboPDF } from "@/lib/utils/recibo";
import { PagoSchema } from "@/lib/validators/pagos";
import { getServerUser } from "@/lib/auth/get-server-user";

export async function registrarPagoYDescargarRecibo(data: unknown) {
  const serverUser = await getServerUser();
  if (!serverUser) throw new Error("No autorizado");

  const { userId: clerkId, mutualId } = serverUser;
  if (!mutualId) throw new Error("MutualId faltante");

  const parsed = PagoSchema.safeParse(data);
  if (!parsed.success) throw new Error("Datos inválidos");

  const { cuotasIds, fecha_pago, observaciones } = parsed.data;

  return await withRLS(mutualId, clerkId, async (tx, ctx) => {

    const cuotas = await tx.cuota.findMany({
      where: { id_cuota: { in: cuotasIds } },
      include: {
        credito: {
          include: {
            asociado: true,
            producto: true
          }
        }
      }
    });

    if (!cuotas.length) throw new Error("No se encontraron cuotas válidas");

    const montoTotal = cuotas.reduce((acc, c) => acc + c.monto_total, 0);

    const pago = await tx.pago.create({
      data: {
        id_mutual: mutualId,
        fecha_pago,
        monto_pago: montoTotal,
        referencia: `REC-${Date.now()}`,
        observaciones: observaciones || null
      }
    });

    for (const cuota of cuotas) {
      await tx.pagoCuota.create({
        data: {
          id_pago: pago.id_pago,
          id_cuota: cuota.id_cuota,
          monto_pagado: cuota.monto_total,
          fecha_pago
        }
      });

      await tx.cuota.update({
        where: { id_cuota: cuota.id_cuota },
        data: { estado: EstadoCuota.pagada }
      });

      // === 🔄 ACTUALIZAR RESUMEN DEL CRÉDITO ===
      const creditoId = cuota.id_credito;

      const todas = await tx.cuota.findMany({
        where: { id_credito: creditoId },
        select: { estado: true, monto_capital: true }
      });

      const cuotasPagadas = todas.filter(c => c.estado === "pagada").length;
      const cuotasPend = todas.filter(c => c.estado !== "pagada").length;
      const saldoActual = todas
        .filter(c => c.estado !== "pagada")
        .reduce((acc, c) => acc + c.monto_capital, 0);

      await tx.credito.update({
        where: { id_credito: creditoId },
        data: {
          cuotas_pagadas: cuotasPagadas,
          cuotas_pendientes: cuotasPend,
          saldo_capital_actual: saldoActual
        }
      });
    }

    const pdfBytes = await generarReciboPDF({ pago, cuotas });

    revalidatePath("/dashboard/creditos");
    revalidatePath("/dashboard/cuotas");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=recibo_${pago.id_pago}.pdf`
      }
    });
  });
}
