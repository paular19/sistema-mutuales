"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";

export async function getPagosByCuotaId(id_cuota: number) {
  const serverUser = await getServerUser();
  if (!serverUser) throw new Error("No autorizado");

  const { userId: clerkId, mutualId } = serverUser;

  if (!mutualId) throw new Error("MutualId faltante");
  if (!clerkId) throw new Error("ClerkId faltante");

  return await withRLS(mutualId, clerkId, async (tx, ctx) => {
    const pagos = await tx.pagoCuota.findMany({
      where: { id_cuota },
      include: {
        pago: true,
      },
      orderBy: { fecha_pago: "desc" },
    });

    return pagos;
  });
}
