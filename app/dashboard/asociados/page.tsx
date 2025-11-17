import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AsociadosTable } from "@/components/asociados/asociados-table";
import { AsociadosFilters } from "@/components/asociados/asociados-filters";

interface SearchParams {
  search?: string;
  page?: string;
}

export default async function AsociadosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // acá SÍ tomamos los params del server
  const params = {
    search: searchParams.search || "",
    page: searchParams.page || "1",
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
          <Button asChild>
            <Link href="/dashboard/asociados/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Asociado
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/tipos-asociados/new">
              <Plus className="mr-2 h-4 w-4" />
              Tipo de Asociado
            </Link>
          </Button>
        </div>
      </div>

      <AsociadosFilters />

      <Suspense fallback={<div className="animate-pulse text-sm">Cargando asociados...</div>}>
        <AsociadosTable searchParams={params} />
      </Suspense>
    </div>
  );
}
