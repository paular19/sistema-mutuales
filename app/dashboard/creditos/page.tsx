import Link from "next/link";
import { CreditosTable } from "@/components/creditos/creditos-table";
import { NavigationButton } from "@/components/ui/navigation-button";
import { getCreditos } from "@/lib/queries/creditos";
import { anularCredito } from "@/lib/actions/creditos";

export const dynamic = "force-dynamic";

interface CreditosPageSearchParams {
  nombre?: string;
  estado?: string;
  producto?: string;
  page?: string;
  limit?: string;
}

export default async function CreditosPage(props: {
  searchParams: Promise<CreditosPageSearchParams>;
}) {

  const searchParams = await props.searchParams;

  // Convertimos searchParams en filtros limpios
  const filters = {
    nombre: searchParams.nombre ?? "",
    estado: searchParams.estado ?? "",
    producto: searchParams.producto ?? "",
    page: searchParams.page ? Number(searchParams.page) : 1,
    limit: searchParams.limit ? Number(searchParams.limit) : 10,
  };

  const { creditos, totalPages, currentPage } = await getCreditos(filters);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Créditos</h1>

        <NavigationButton href="/dashboard/creditos/new" pendingText="Abriendo...">
          Nuevo Crédito
        </NavigationButton>
      </div>

      <CreditosTable
        creditos={creditos}
        totalPages={totalPages}
        currentPage={currentPage}
        onAnularCredito={anularCredito}
      />
    </div>
  );
}
