"use server";

import { withRLS } from "@/lib/db/with-rls";

export async function getPagosByCuotaId(id_cuota: number) {
  return withRLS(async (prisma) => {
    const pagos = await prisma.pagoCuota.findMany({
      where: { id_cuota },
      include: {
        pago: true,
      },
      orderBy: { fecha_pago: "desc" },
    });
    return pagos;
  });
}
