// app/dashboard/productos/page.tsx

import Link from "next/link";
import ProductosFilters from "@/components/productos/productos-filters";
import { ProductosTable } from "@/components/productos/productos-table";
import { NavigationButton } from "@/components/ui/navigation-button";
import { getProductos } from "@/lib/queries/productos";

export default async function ProductosPage(props: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {

  const searchParams = await props.searchParams;

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
        <NavigationButton href="/dashboard/productos/new" pendingText="Abriendo...">
          Nuevo Producto
        </NavigationButton>
      </div>

      <ProductosFilters search={search} />

      <ProductosTable productos={productos} pagination={pagination} />
    </div>
  );
}
