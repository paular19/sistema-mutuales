// lib/auth/get-server-user.ts

import { auth, clerkClient } from "@clerk/nextjs/server";

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

  return {
    userId,
    user,
    mutualId: user.publicMetadata?.mutualId as number | null,
  };
}
