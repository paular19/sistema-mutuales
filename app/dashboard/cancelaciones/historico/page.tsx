import Link from "next/link";
import { getHistorialCancelaciones } from "@/lib/queries/cancelacion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default async function CancelacionesHistoricoPage() {
  const cancelaciones = await getHistorialCancelaciones();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Histórico de Cancelaciones</h1>
      <p className="text-muted-foreground">
        Consultá períodos anteriores de cancelaciones registradas.
      </p>

      {cancelaciones.length === 0 ? (
        <div className="border rounded-lg p-6 text-center text-muted-foreground">
          No hay cancelaciones registradas.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cancelaciones.map((c) => (
            <Link key={c.id_cancelacion} href={`/dashboard/cancelaciones/historico/${c.periodo}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Período {c.periodo}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Registrada el {format(new Date(c.fecha_registro), "dd/MM/yyyy")}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
