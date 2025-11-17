// app/dashboard/productos/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProductosFilters from "@/components/productos/productos-filters";
import { ProductosTable } from "@/components/productos/productos-table";
import { getProductos } from "@/lib/queries/productos";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams?: { search?: string; page?: string };
}) {

  const search = searchParams?.search ?? "";
  const page = Number(searchParams?.page ?? 1);

  const { productos, pagination } = await getProductos({
    search,
    page,
    limit: 10,
    incluirInactivos: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Button asChild>
          <Link href="/dashboard/productos/new">Nuevo Producto</Link>
        </Button>
      </div>

      <ProductosFilters search={search} />

      <ProductosTable productos={productos} pagination={pagination} />
    </div>
  );
}
