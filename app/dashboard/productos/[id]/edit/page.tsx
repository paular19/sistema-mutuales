import { getProductoById } from "@/lib/queries/productos";
import { updateProducto } from "@/lib/actions/productos";
import { ProductoForm } from "@/components/productos/producto-form";

interface EditProductoPageProps {
  params: { id: string };
}

export default async function EditProductoPage({ params }: EditProductoPageProps) {
  const producto = await getProductoById(Number(params.id));

  if (!producto) {
    return <p className="text-red-500">Producto no encontrado</p>;
  }

  return (
    <div className="max-w-md space-y-8">
      <h1 className="text-2xl font-bold">Editar Producto</h1>
      <ProductoForm initialData={producto} action={updateProducto} />
    </div>
  );
}
