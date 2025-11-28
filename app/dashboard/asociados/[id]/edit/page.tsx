// app/dashboard/asociados/[id]/edit/page.tsx

import { AsociadoForm } from "@/components/asociados/asociados-form";
import { updateAsociado } from "@/lib/actions/asociados";
import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getTiposAsociado } from "@/lib/queries/tiposAsociado";
import { serializePrisma } from "@/lib/utils/serialize-prisma";

export default async function EditAsociadoPage(props: {
  params: Promise<{ id: string }>;
}) {
  // ⬅️ Next 15: params es una Promise
  const { id } = await props.params;
  const idNum = Number(id);

  if (!id || Number.isNaN(idNum)) {
    return <p>ID de asociado inválido</p>;
  }

  // RLS
  const info = await getServerUser();
  if (!info || !info.mutualId) {
    return <p>Mutual no encontrada o usuario no autenticado</p>;
  }

  const mutualId = info.mutualId;
  const clerkId = info.userId;

  // Data en paralelo
  const [asociado, tipos] = await Promise.all([
    withRLS(mutualId, clerkId, (tx) =>
      tx.asociado.findFirst({
        where: { id_asociado: idNum },
      })
    ),
    getTiposAsociado(),
  ]);

  if (!asociado) return <p>Asociado no encontrado</p>;

  // 🔥 Convertir Decimal → Number
  const asociadoSerializado = serializePrisma(asociado);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Editar Asociado</h1>
      <p className="text-muted-foreground">
        Modificá los datos del asociado y guardá los cambios.
      </p>

      <AsociadoForm
        initialData={asociadoSerializado}
        action={updateAsociado.bind(null, asociadoSerializado.id_asociado)}
        mode="edit"
        tiposAsociado={tipos}
      />
    </div>
  );
}
