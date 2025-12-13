"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "../auth/get-server-user";
import { $Enums } from "@prisma/client";

export async function generarLiquidacionManual() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no encontrada");

  const hoy = new Date();
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  return withRLS(info.mutualId, info.userId, async prisma => {

    // 1️⃣ Buscar cuotas impagas hasta hoy
    const cuotas = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: hoy },
        estado: { in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida] },
      },
      include: {
        liquidacionDetalle: true,
        credito: true,
        pagoCuotas: true,
      },
    });

    // 2️⃣ Determinar arrastre desde liquidaciones previas
    const cuotasArrastradas = cuotas.filter(c =>
      c.liquidacionDetalle.length > 0
    );

    const cuotasNuevas = cuotas.filter(c =>
      c.liquidacionDetalle.length === 0
    );

    const detalle = [...cuotasArrastradas, ...cuotasNuevas].map(c => ({
      id_cuota: c.id_cuota,
      monto_liquidado: c.monto_total,
    }));

    const total = detalle.reduce((acc, d) => acc + d.monto_liquidado, 0);

    // 3️⃣ Crear liquidación
    const liquidacion = await prisma.liquidacion.create({
      data: {
        id_mutual: info.mutualId!,
        periodo,
        fecha_cierre: hoy,
        total_monto: total,
        detalle: { createMany: { data: detalle } },
      },
    });

    return {
      success: true,
      id_liquidacion: liquidacion.id_liquidacion,
      total,
      cuotasNuevas: cuotasNuevas.length,
      cuotasArrastradas: cuotasArrastradas.length,
    };
  });
}
