"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";

export async function getAsociadoWallet(id_asociado: number) {
  const user = await getServerUser();
  if (!user) return null;

  const mutualId = user.mutualId;
  const clerkId = user.userId;

  if (!mutualId || !clerkId) return null;

  return await withRLS(mutualId, clerkId, async (tx) => {
    const asociado = await tx.asociado.findUnique({
      where: { id_asociado },
      select: {
        id_asociado: true,
        nombre: true,
        apellido: true,
        saldo_disponible: true,
      },
    });

    if (!asociado) return null;

    const cuotasPendientes = await tx.cuota.findMany({
      where: {
        credito: { id_asociado },
        OR: [
          { estado: "pendiente" },
          { estado: "parcial" },
        ],
      },
      orderBy: { numero_cuota: "asc" },
      select: {
        id_cuota: true,
        numero_cuota: true,
        monto_total: true,
        estado: true,
        credito: { select: { id_credito: true } },
      },
    });

    return {
      asociado,
      cuotasPendientes,
      credito: cuotasPendientes[0]?.credito ?? null,
    };
  });
}
