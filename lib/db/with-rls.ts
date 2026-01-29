// lib/db/with-rls.ts
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export async function withRLS<T>(
  mutualId: number,
  clerkId: string,
  fn: (tx: Prisma.TransactionClient, ctx: { mutualId: number; clerkId: string }) => Promise<T>
): Promise<T> {
  if (!mutualId) throw new Error("withRLS: mutualId faltante");
  if (!clerkId) throw new Error("withRLS: clerkId faltante");

  return await prisma.$transaction(
    async (tx) => {
      // Contexto RLS: vive SOLO en esta transacción
      await tx.$executeRaw`
        SELECT
          set_config('app.mutual_id', ${String(mutualId)}, true),
          set_config('app.clerk_id', ${clerkId}, true)
      `;

      return await fn(tx, { mutualId, clerkId });
    },
    { timeout: 20000 }
  );
}
