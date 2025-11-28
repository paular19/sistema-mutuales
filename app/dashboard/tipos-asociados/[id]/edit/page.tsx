import { getTipoAsociadoById, getTiposAsociado } from "@/lib/queries/tiposAsociado";
import TiposAsociadoFormClient from "@/components/asociados/tipo-asociado/tipoAsociadoForm";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTipoAsociadoPage(props: EditPageProps) {

  const { id } = await props.params;

  const tipo = await getTipoAsociadoById(Number(id));
  const tipos = await getTiposAsociado();

  if (!tipo) {
    return <p className="text-red-500">Tipo de asociado no encontrado</p>;
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Editar Tipo de Asociado</h1>
      <TiposAsociadoFormClient initialTipos={tipos} />
    </div>
  );
}
