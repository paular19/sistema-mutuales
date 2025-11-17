import { getHistorialLiquidaciones } from "@/lib/queries/liquidaciones";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";

export default async function HistoricoLiquidacionesPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const pageSize = Number(searchParams.pageSize ?? 20);

  const { items, totalPages, page: currentPage } =
    await getHistorialLiquidaciones({ page, pageSize });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Histórico de liquidaciones</h1>
        <Link href="/dashboard/liquidaciones">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>

      {/* TABLA */}
      {items.length === 0 ? (
        <div className="border rounded-lg p-6 text-center text-gray-500">
          No hay liquidaciones registradas todavía.
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Período</th>
                <th className="text-left p-3">Fecha de cierre</th>
                <th className="text-left p-3">Total liquidado</th>
                <th className="text-left p-3">Cuotas incluidas</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((li) => (
                <tr key={li.id_liquidacion} className="border-t">
                  <td className="p-3 font-medium">{li.periodo}</td>
                  <td className="p-3">
                    {new Date(li.fecha_cierre).toLocaleDateString("es-AR")}
                  </td>
                  <td className="p-3">{formatCurrency(li.total_monto)}</td>
                  <td className="p-3">{li._count.detalle}</td>
                  <td className="p-3 text-right">
                    <Link href={`/dashboard/liquidaciones/${li.id_liquidacion}`}>
                      <Button size="sm" variant="secondary">
                        Ver detalle
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINACIÓN */}
      {/* Si tenés tu componente <Pagination />, lo incluís acá */}
    </div>
  );
}
