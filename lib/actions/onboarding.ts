// lib/actions/onboarding.ts
"use server";

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { isAuthorizedUser } from "@/lib/auth/get-tenant";

export async function createMutualAction(formData: FormData) {
  try {
    const user = await currentUser();
    if (!user) return { error: "No autenticado" };

    const authorized = await isAuthorizedUser();
    if (!authorized) return { error: "No autorizado" };

    const existingUser = await prisma.usuario.findFirst({
      where: {
        OR: [
          { clerkId: user.id },
          { email: user.emailAddresses[0]?.emailAddress || "" },
        ],
      },
      select: { id_mutual: true },
    });

    if (existingUser?.id_mutual) {
      return { success: true, message: "Ya tenés una mutual asociada." };
    }

    // Crear mutual
    const mutual = await prisma.mutual.create({
      data: {
        nombre: formData.get("nombre") as string,
        cuit: formData.get("cuit") as string,
        estado: true,
      },
    });

    // Crear usuario en DB
    await prisma.usuario.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        nombre: user.firstName || "Admin",
        apellido: user.lastName || "",
        id_mutual: mutual.id_mutual,
      },
    });

    // 👇 OBTENER INSTANCIA REAL DE CLERK CLIENT (v7)
    const clerk = await clerkClient();

    // Guardar mutualId en Clerk
    await clerk.users.updateUser(user.id, {
      publicMetadata: { mutualId: mutual.id_mutual },
    });

    // 🔑 Revocar sesión → fuerza refresh de claims
    const { sessionId } = await auth();
    if (sessionId) {
      await clerk.sessions.revokeSession(sessionId);
    }

    return { success: true, message: "Mutual creada. Volvé a iniciar sesión." };
  } catch (err) {
    console.error("❌ Error en createMutualAction:", err);
    return { error: "Error al crear mutual" };
  }
}
