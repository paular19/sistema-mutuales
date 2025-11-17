import { createProducto } from "@/lib/actions/productos";
import { ProductoForm } from "@/components/productos/producto-form";

export default function NewProductoPage() {
  return (
    <div className="max-w-md space-y-8">
      <h1 className="text-2xl font-bold">Nuevo Producto</h1>
      <ProductoForm action={createProducto} />
    </div>
  );
}
