import Link from "next/link";
import { getHistorialCancelaciones } from "@/lib/queries/cancelacion";
import { formatDateUtc } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default async function HistoricoCancelacionesPage() {
    const historial = await getHistorialCancelaciones();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Histórico de cancelaciones</h1>
                    <p className="text-sm text-muted-foreground">
                        Períodos cerrados y fecha de registro.
                    </p>
                </div>

                <Link href="/dashboard/cancelaciones">
                    <Button variant="outline">Volver a cancelaciones</Button>
                </Link>
            </div>

            <div className="rounded-md border overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Fecha de registro</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {historial.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                                    Aún no hay cancelaciones cerradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            historial.map((item) => (
                                <TableRow key={`${item.periodo}-${item.fecha_registro.toISOString()}`}>
                                    <TableCell>{item.periodo}</TableCell>
                                    <TableCell>{formatDateUtc(item.fecha_registro)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
