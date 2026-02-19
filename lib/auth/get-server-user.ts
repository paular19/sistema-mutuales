// lib/auth/get-server-user.ts

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

function normalizeMutualId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
  }

  return null;
}

/**
 * Obtiene:
 * - userId (seguro para SSR)
 * - user de Clerk (completo)
 * - mutualId desde publicMetadata
 *
 * Se llama siempre ANTES de usar withRLS().
 */
export async function getServerUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  let mutualId = normalizeMutualId(user.publicMetadata?.mutualId);

  if (!mutualId) {
    const usuario = await prisma.usuario.findUnique({
      where: { clerkId: userId },
      select: { id_mutual: true },
    });

    mutualId = normalizeMutualId(usuario?.id_mutual ?? null);
  }

  return {
    userId,
    user,
    mutualId,
  };
}
