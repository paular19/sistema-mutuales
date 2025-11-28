// app/dashboard/liquidaciones/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLiquidacionById } from "@/lib/queries/liquidaciones";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function LiquidacionDetallePage(props: {
  params: Promise<{ id: string }>;
}) {

  const { id } = await props.params;

  const idNum = Number(id);
  if (Number.isNaN(idNum)) return notFound();

  const liq = await getLiquidacionById(idNum);
  if (!liq) return notFound();

  const total = liq.detalle.reduce((acc, d) => acc + d.monto_liquidado, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Liquidación {liq.periodo} — {formatDate(liq.fecha_cierre)}
        </h1>
        <Link href="/dashboard/liquidaciones/historico">
          <Button variant="outline">Volver al histórico</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Estado</p>
          <p className="text-lg capitalize">{liq.estado}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total liquidado</p>
          <p className="text-2xl font-semibold">{formatCurrency(total)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-500">Día de cierre</p>
          <p className="text-lg">{liq.configuracion.dia_cierre}</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Asociado</th>
              <th className="text-left p-3">Producto</th>
              <th className="text-left p-3">Crédito</th>
              <th className="text-left p-3">Cuota</th>
              <th className="text-left p-3">Vencimiento</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-right p-3">Monto</th>
            </tr>
          </thead>
          <tbody>
            {liq.detalle.map((d) => {
              const c = d.cuota;
              return (
                <tr key={d.id_detalle} className="border-t">
                  <td className="p-3">
                    {`${c.credito.asociado.apellido ?? ""}, ${c.credito.asociado.nombre ?? ""}`.trim()}
                  </td>
                  <td className="p-3">{c.credito.producto.nombre}</td>
                  <td className="p-3">{c.credito.id_credito}</td>
                  <td className="p-3">{c.numero_cuota}</td>
                  <td className="p-3">{formatDate(c.fecha_vencimiento)}</td>
                  <td className="p-3 capitalize">{c.estado}</td>
                  <td className="p-3 text-right">{formatCurrency(d.monto_liquidado)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
