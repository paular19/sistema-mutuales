// app/dashboard/asociados/[id]/edit/page.tsx

import { AsociadoForm } from "@/components/asociados/asociados-form";
import { updateAsociado } from "@/lib/actions/asociados";
import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getTiposAsociado } from "@/lib/queries/tiposAsociado";

export default async function EditAsociadoPage({
  params,
}: {
  params: { id: string };
}) {
  // 1️⃣ Parsear y validar el ID que viene por la URL
  const id = Number(params.id);
  if (!params.id || Number.isNaN(id)) {
    return <p>ID de asociado inválido</p>;
  }

  // 2️⃣ Obtener usuario + mutual para RLS
  const info = await getServerUser();
  if (!info || !info.mutualId) {
    return <p>Mutual no encontrada o usuario no autenticado</p>;
  }

  const mutualId = info.mutualId as number;
  const clerkId = info.userId;

  // 3️⃣ Traer asociado y tipos en paralelo (el asociado bajo RLS)
  const [asociado, tipos] = await Promise.all([
    withRLS(mutualId, clerkId, (tx) =>
      tx.asociado.findFirst({
        where: { id_asociado: id }, // RLS ya filtra por mutual
      })
    ),
    getTiposAsociado(),
  ]);

  if (!asociado) {
    return <p>Asociado no encontrado</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Editar Asociado</h1>
      <p className="text-muted-foreground">
        Modificá los datos del asociado y guardá los cambios.
      </p>

      <AsociadoForm
        initialData={asociado}
        action={updateAsociado.bind(null, asociado.id_asociado)}
        mode="edit"
        tiposAsociado={tipos}
      />
    </div>
  );
}

