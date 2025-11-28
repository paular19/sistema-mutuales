import { getCuotaDetalle } from "@/lib/queries/cuotas";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DetalleCuotaPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const id_cuota = Number(id);

  if (isNaN(id_cuota)) throw new Error("ID de cuota inválido.");

  const { cuota } = await getCuotaDetalle(id_cuota);
  if (!cuota) {
    return (
      <div className="p-6 text-center text-gray-600">
        No se encontró la cuota solicitada.
      </div>
    );
  }

  const { credito, pagoCuotas, estadoCalc, saldo, pagado } = cuota;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Detalle de Cuota #{cuota.numero_cuota}
        </h1>
        <Link href={`/dashboard/creditos/${credito.id_credito}`}>
          <Button variant="outline">Volver al crédito</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Estado actual:</span>
            <Badge
              className={
                estadoCalc === "pagada"
                  ? "bg-emerald-600"
                  : estadoCalc === "vencida"
                  ? "bg-red-600"
                  : "bg-gray-500"
              }
            >
              {estadoCalc.toUpperCase()}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Fecha de vencimiento:</span>
            <span>{formatDate(cuota.fecha_vencimiento)}</span>
          </div>
          <div className="flex justify-between">
            <span>Capital:</span>
            <span>{formatCurrency(cuota.monto_capital)}</span>
          </div>
          <div className="flex justify-between">
            <span>Interés:</span>
            <span>{formatCurrency(cuota.monto_interes)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total cuota:</span>
            <span>{formatCurrency(cuota.monto_total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total pagado:</span>
            <span>{formatCurrency(pagado)}</span>
          </div>
          <div className="flex justify-between">
            <span>Saldo pendiente:</span>
            <span>{formatCurrency(saldo)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crédito asociado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>ID Crédito:</span>
            <span>{credito.id_credito}</span>
          </div>
          <div className="flex justify-between">
            <span>Producto:</span>
            <span>{credito.producto?.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha de alta:</span>
            <span>{formatDate(credito.fecha_creacion)}</span>
          </div>
          <div className="flex justify-between">
            <span>Monto otorgado:</span>
            <span>{formatCurrency(credito.monto)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asociado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Nombre completo:</span>
            <span>
              {credito.asociado.nombre} {credito.asociado.apellido}
            </span>
          </div>
          <div className="flex justify-between">
            <span>CUIT / DNI:</span>
            <span>{credito.asociado.cuit || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Email:</span>
            <span>{credito.asociado.email || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Teléfono:</span>
            <span>{credito.asociado.telefono || "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagos realizados</CardTitle>
        </CardHeader>
        <CardContent>
          {pagoCuotas.length === 0 ? (
            <p className="text-gray-500">No hay pagos registrados.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Monto</th>
                  <th className="p-2 border">Referencia</th>
                  <th className="p-2 border">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {pagoCuotas.map((p) => (
                  <tr key={p.id_pago_cuota}>
                    <td className="p-2 border">
                      {formatDate(p.fecha_pago)}
                    </td>
                    <td className="p-2 border text-right">
                      {formatCurrency(p.monto_pagado)}
                    </td>
                    <td className="p-2 border">
                      {p.pago?.referencia || "—"}
                    </td>
                    <td className="p-2 border">
                      {p.pago?.observaciones || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Link href={`/dashboard/creditos/${credito.id_credito}`}>
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    </div>
  );
}
