"use server";

import { withRLS } from "@/lib/db/with-rls";
import { EstadoCuota } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth/get-server-user";

export async function ingresarSaldo(formData: FormData) {
  // 🔹 Tomamos datos del form
  const asociadoId = Number(formData.get("id_asociado"));
  const saldoIngresado = Number(formData.get("monto"));

  if (!asociadoId) throw new Error("ID de asociado inválido");
  if (!saldoIngresado || saldoIngresado <= 0)
    throw new Error("El monto debe ser mayor a cero.");

  // 🔹 Datos del usuario logueado
  const serverUser = await getServerUser();
  if (!serverUser) throw new Error("No autorizado");

  const { userId: clerkId, mutualId } = serverUser;

  if (!mutualId) throw new Error("MutualId faltante");
  if (!clerkId) throw new Error("ClerkId faltante");

  // 🔹 Ejecutamos todo en contexto RLS
  return await withRLS(mutualId, clerkId, async (tx, ctx) => {
    // 1) Traer asociado
    const asociado = await tx.asociado.findFirst({
      where: { id_asociado: asociadoId },
      select: {
        id_asociado: true,
        saldo_disponible: true,
      },
    });

    if (!asociado) throw new Error("Asociado no encontrado.");

    let saldo = Number(asociado.saldo_disponible ?? 0) + saldoIngresado;

    // 2) Traer cuotas pendientes / vencidas / parciales
    const cuotas = await tx.cuota.findMany({
      where: {
        credito: { id_asociado: asociadoId },
        estado: {
          in: [
            EstadoCuota.pendiente,
            EstadoCuota.vencida,
            EstadoCuota.parcial,
          ],
        },
      },
      orderBy: [
        { estado: "desc" }, // vencidas primero
        { fecha_vencimiento: "asc" }, // más viejas primero
      ],
      select: {
        id_cuota: true,
        monto_total: true,
      },
    });

    const movimientos: { id_cuota: number; monto: number }[] = [];

    // 3) Imputación automática del saldo
    for (const cuota of cuotas) {
      if (saldo <= 0) break;

      const pagosPrevios = await tx.pagoCuota.aggregate({
        where: { id_cuota: cuota.id_cuota },
        _sum: { monto_pagado: true },
      });

      const pagado = pagosPrevios._sum.monto_pagado ?? 0;
      const pendiente = cuota.monto_total - pagado;

      if (pendiente <= 0) continue;

      const aplicar = Math.min(saldo, pendiente);
      saldo -= aplicar;

      movimientos.push({ id_cuota: cuota.id_cuota, monto: aplicar });
    }

    // 4) Si no hay cuotas para imputar → solo actualizamos saldo
    if (movimientos.length === 0) {
      await tx.asociado.update({
        where: { id_asociado: asociadoId },
        data: { saldo_disponible: saldo },
      });

      revalidatePath(`/dashboard/wallet/${asociadoId}`);
      return { ok: true, saldoRestante: saldo };
    }

    // 5) Crear pago genérico
    const totalAplicado = movimientos.reduce((acc, m) => acc + m.monto, 0);

    const pago = await tx.pago.create({
      data: {
        id_mutual: ctx.mutualId,
        fecha_pago: new Date(),
        monto_pago: totalAplicado,
        referencia: `WALLET-${Date.now()}`,
        observaciones: "Imputación automática desde saldo disponible",
      },
    });

    // 6) Crear PagoCuota + actualizar estado de cuotas
    for (const mov of movimientos) {
      await tx.pagoCuota.create({
        data: {
          id_pago: pago.id_pago,
          id_cuota: mov.id_cuota,
          monto_pagado: mov.monto,
          fecha_pago: pago.fecha_pago,
        },
      });

      const pagosCuota = await tx.pagoCuota.aggregate({
        where: { id_cuota: mov.id_cuota },
        _sum: { monto_pagado: true },
      });

      const totalPagado = pagosCuota._sum.monto_pagado ?? 0;
      const montoTotalCuota = cuotas.find(
        (c) => c.id_cuota === mov.id_cuota
      )!.monto_total;

      await tx.cuota.update({
        where: { id_cuota: mov.id_cuota },
        data: {
          estado:
            totalPagado >= montoTotalCuota
              ? EstadoCuota.pagada
              : EstadoCuota.parcial,
        },
      });
    }

    // 7) Actualizar saldo restante
    await tx.asociado.update({
      where: { id_asociado: asociadoId },
      data: { saldo_disponible: saldo },
    });

    // 8) Revalidaciones
    revalidatePath(`/dashboard/wallet/${asociadoId}`);
    revalidatePath(`/dashboard/creditos`);

    return {
      ok: true,
      saldoRestante: saldo,
      pagoId: pago.id_pago,
    };
  });
}
