// lib/db/with-rls.ts
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Ejecuta cualquier operación dentro del contexto RLS real.
 */
export async function withRLS<T>(
  mutualId: number,
  clerkId: string,
  fn: (tx: Prisma.TransactionClient, ctx: { mutualId: number; clerkId: string }) => Promise<T>
): Promise<T> {
  if (!mutualId) throw new Error("withRLS: mutualId faltante");
  if (!clerkId) throw new Error("withRLS: clerkId faltante");

  return await prisma.$transaction(
    async (tx) => {
      // 1️⃣ Setear variables para RLS
      await tx.$executeRawUnsafe(
        `SELECT
            set_config('app.mutual_id', '${mutualId}', false),
            set_config('app.clerk_id', '${clerkId}', false)`
      );

      // 2️⃣ Ejecutar la operación dentro del contexto
      const result = await fn(tx, { mutualId, clerkId });

      // 3️⃣ Limpiar variables (obligatorio para evitar fugas entre requests)
      await tx.$executeRawUnsafe(
        `SELECT
            set_config('app.mutual_id', '', false),
            set_config('app.clerk_id', '', false)`
      );

      return result;
    },
    { timeout: 20000 } // Prisma recomienda aumentar timeout cuando se usan raw queries + RLS
  );
}
