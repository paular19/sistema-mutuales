// lib/auth/get-tenant.ts

import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";

/**
 * Ya no se usa para RLS.
 * Solo sirve como fallback o para componentes aislados.
 */
export async function getCurrentClerkId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function getCurrentMutualId(): Promise<number | null> {
  const h = await headers();
  const headerMutualId = h.get("x-mutual-id");

  if (headerMutualId) {
    return Number(headerMutualId);
  }

  // fallback (idealmente no debería usarse con la nueva arquitectura)
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.publicMetadata as { mutualId?: number };

  return meta?.mutualId ?? null;
}
