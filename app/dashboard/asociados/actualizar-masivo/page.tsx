import { ActualizarMasivoForm } from "@/components/asociados/actualizar-masivo-form";

export default function ActualizarMasivoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Actualización masiva de asociados
        </h1>
        <p className="text-muted-foreground">
          Completá datos faltantes de los asociados usando un archivo Excel.
          Podés elegir qué columna del Excel corresponde a cada campo del
          sistema.
        </p>
      </div>

      <div className="max-w-4xl bg-white border rounded-xl p-6 shadow-sm">
        <ActualizarMasivoForm />
      </div>
    </div>
  );
}
