// lib/db/prisma.ts

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"], // opcional
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ❌ NO SETEAR VARIABLES RLS ACÁ
// ❌ NO USAR getCurrentMutualId ACÁ
// ❌ NO set_config EN MIDDLEWARE GLOBAL
//
// El contexto RLS SOLO debe setearse dentro de withRLS().
