import { getCancelacionByPeriodo } from "@/lib/queries/cancelacion";
import { CancelacionesHeader } from "@/components/cancelaciones/cancelaciones-header";
import { CancelacionesTable } from "@/components/cancelaciones/cancelaciones-table";
import { CancelacionesResumen } from "@/components/cancelaciones/cancelaciones-resumen";
import { Card, CardContent } from "@/components/ui/card";

export default async function CancelacionHistoricaPage({
  params,
}: {
  params: { periodo: string };
}) {
  const { periodo } = params;
  const { abonadas, impagas, totalAbonadas, totalImpagas } =
    await getCancelacionByPeriodo(periodo);

  return (
    <div className="space-y-8">
      <CancelacionesHeader periodo={periodo} />

      {/* Abonadas */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-emerald-700">
          Cuotas abonadas
        </h2>
        <Card>
          <CardContent>
            <CancelacionesTable filas={abonadas} tipo="abonadas" />
          </CardContent>
        </Card>
      </section>

      {/* Impagas */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-red-700">
          Cuotas impagas
        </h2>
        <Card>
          <CardContent>
            <CancelacionesTable filas={impagas} tipo="impagas" />
          </CardContent>
        </Card>
      </section>

      <CancelacionesResumen
        totalAbonadas={totalAbonadas}
        totalImpagas={totalImpagas}
      />
    </div>
  );
}
