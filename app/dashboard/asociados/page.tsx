// app/dashboard/asociados/page.tsx

import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AsociadosTable } from "@/components/asociados/asociados-table";
import { AsociadosFilters } from "@/components/asociados/asociados-filters";
import { ExportAsociadosButton } from "@/components/asociados/export-asociados-button";
import { NavigationButton } from "@/components/ui/navigation-button";

interface SearchParams {
  search?: string;
  page?: string;
}

export default async function AsociadosPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  // NEXT 15: searchParams es una Promise
  const searchParams = await props.searchParams;

  const params = {
    search: searchParams?.search || "",
    page: searchParams?.page || "1",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asociados</h1>
          <p className="text-muted-foreground">
            Gestión del padrón de asociados de la mutual
          </p>
        </div>

        <div className="flex gap-2">
          <ExportAsociadosButton />
          <NavigationButton
            href="/dashboard/asociados/actualizar-masivo"
            variant="outline"
            pendingText="Abriendo..."
          >
            Actualización masiva
          </NavigationButton>
          <NavigationButton href="/dashboard/asociados/new" pendingText="Abriendo...">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Asociado
          </NavigationButton>
          <NavigationButton href="/dashboard/tipos-asociados/new" pendingText="Abriendo...">
            <Plus className="mr-2 h-4 w-4" />
            Tipo de Asociado
          </NavigationButton>
        </div>
      </div>

      <AsociadosFilters />

      <Suspense fallback={<div className="animate-pulse text-sm">Cargando asociados...</div>}>
        <AsociadosTable searchParams={params} />
      </Suspense>
    </div>
  );
}
