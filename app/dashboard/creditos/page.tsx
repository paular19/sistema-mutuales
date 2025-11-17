import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreditosTable } from "@/components/creditos/creditos-table";
import { getCreditos } from "@/lib/queries/creditos";

interface CreditosPageSearchParams {
  nombre?: string;
  estado?: string;
  producto?: string;
  page?: string;
  limit?: string;
}

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: CreditosPageSearchParams;
}) {

  // 🔥 Convertimos searchParams en filtros limpios
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

        <Button asChild>
          <Link href="/dashboard/creditos/new">Nuevo Crédito</Link>
        </Button>
      </div>

      <CreditosTable
        creditos={creditos}
        totalPages={totalPages}
        currentPage={currentPage}
      />
    </div>
  );
}
