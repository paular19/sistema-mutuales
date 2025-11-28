import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CuotasTable } from "@/components/creditos/cuotas/cuotas-table";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency } from "@/lib/utils/format";
import { getCuotasByCreditoId } from "@/lib/queries/cuotas";


export default async function CuotasDeCreditoPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: string; fecha?: string; page?: string }>;
}) {
  // 🔥 Next.js 15 → params y searchParams son Promises
  const { id } = await props.params;
  const { estado, fecha, page: pageString } = await props.searchParams;

  const id_credito = Number(id);
  if (isNaN(id_credito)) throw new Error("ID de crédito inválido.");

  const page = Number(pageString) || 1;

  const { credito, cuotas, totales, pagination, comisionGestion } =
    await getCuotasByCreditoId(id_credito, {
      estado: estado as any,
      fecha,
      page,
    });

  if (!credito) return <p className="text-red-500">Crédito no encontrado.</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Cuotas del crédito #{credito.id_credito}
          </h1>
          <p className="text-sm text-muted-foreground">
            {credito.asociado?.apellido} {credito.asociado?.nombre} ·{" "}
            {credito.producto?.nombre}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">

          {/* ← Volver a créditos */}
          <Link href="/dashboard/creditos">
            <Button variant="ghost">← Volver a créditos</Button>
          </Link>

          {/* 💰 Wallet del asociado */}
          <Link href={`/dashboard/wallet/${credito.asociado?.id_asociado}`}>
            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700">
              💰 Wallet del asociado
            </Button>
          </Link>

        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Resumen label="Total plan" value={totales.total} />
        <Resumen label="Pagado" value={totales.pagado} />
        <Resumen label="Saldo" value={totales.saldo} />
      </div>

      <CuotasTable cuotas={cuotas} comisionGestion={comisionGestion} />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        baseUrl={`/dashboard/creditos/${id_credito}/cuotas`}
      />
    </div>
  );
}

function Resumen({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}
