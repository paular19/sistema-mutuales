import { getTiposAsociado } from "@/lib/queries/tiposAsociado";
import TiposAsociadoFormClient from "@/components/asociados/tipo-asociado/tipoAsociadoForm";
import { loadTiposAsociadoAction } from "@/lib/actions/tiposAsociado";

export const dynamic = "force-dynamic";
console.log("📌 PAGE TIPOS LIST: RENDER");


export default async function TiposAsociadosPage() {
  const tipos = await loadTiposAsociadoAction();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Tipos de Asociados</h1>
      <TiposAsociadoFormClient initialTipos={tipos} />
    </div>
  );
}
