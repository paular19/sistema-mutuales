import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";

/* ---------------------------------------------------------
   🔹 Obtener todos los tipos de una mutual (RLS)
--------------------------------------------------------- */
export async function getTiposAsociado() {
  const info = await getServerUser();
  if (!info?.mutualId || !info.userId) {
    throw new Error("Usuario o mutual no válido");
  }

  return withRLS(info.mutualId, info.userId, async (tx) => {
    return tx.tipoAsociado.findMany({
      orderBy: { nombre: "asc" },
    });
  });
}

/* ---------------------------------------------------------
   🔹 Obtener un tipo por ID validando mutual (RLS)
--------------------------------------------------------- */
export async function getTipoAsociadoById(id: number) {
  const info = await getServerUser();
  if (!info?.mutualId || !info.userId) {
    throw new Error("Usuario o mutual no válido");
  }

  return withRLS(info.mutualId, info.userId, async (tx) => {
    return tx.tipoAsociado.findFirst({
      where: { id_tipo: id },
    });
  });
}

/* ---------------------------------------------------------
   🔹 DEBUG: lista todos los tipos visibles para esta mutual
--------------------------------------------------------- */
export async function debugTipos() {
  const info = await getServerUser();
  if (!info?.mutualId || !info.userId) {
    throw new Error("Usuario o mutual no válido");
  }

  return withRLS(info.mutualId, info.userId, async (tx) => {
    return tx.tipoAsociado.findMany({
      orderBy: { id_tipo: "asc" },
    });
  });
}
