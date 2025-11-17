// app/dashboard/asociados/new/page.tsx
import { AsociadoForm } from "@/components/asociados/asociados-form";
import { createAsociado } from "@/lib/actions/asociados";
import { getTiposAsociado } from "@/lib/queries/tiposAsociado";

export default async function NewAsociadoPage() {
  const tipos = await getTiposAsociado(); // ✅ se trae en el servidor

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Asociado</h1>
        <p className="text-muted-foreground">
          Cargá los datos del asociado para registrarlo en la mutual.
        </p>
      </div>
      <AsociadoForm 
        action={createAsociado} 
        mode="create" 
        tiposAsociado={tipos} // ✅ se pasa como prop al form
      />
    </div>
  );
}
