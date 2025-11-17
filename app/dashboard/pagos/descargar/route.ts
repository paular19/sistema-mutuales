import { NextResponse } from "next/server";
import { withRLS } from "@/lib/db/with-rls";
import { generarReciboPDF } from "@/lib/utils/recibo";
import { EstadoCuota } from "@prisma/client";
import { Buffer } from "node:buffer";

export async function POST(req: Request) {
  try {
    // ✅ Leer body como FormData (no JSON)
    const formData = await req.formData();
    const cuotasIds = JSON.parse(formData.get("cuotasIds") as string);
    const fecha_pago = new Date(formData.get("fecha_pago") as string);
    const observaciones = formData.get("observaciones") as string | null;

    return withRLS(async (prisma) => {
      const result = await prisma.$transaction(async (tx) => {
        const cuotas = await tx.cuota.findMany({
          where: { id_cuota: { in: cuotasIds } },
          include: {
            credito: {
              include: {
                asociado: { include: { mutual: true } },
                producto: true,
              },
            },
          },
        });

        if (!cuotas.length) {
          throw new Error("No se encontraron cuotas válidas");
        }

        const montoTotal = cuotas.reduce((acc, c) => acc + c.monto_total, 0);

        const pago = await tx.pago.create({
          data: {
            id_mutual: cuotas[0].credito.asociado.id_mutual,
            fecha_pago,
            monto_pago: montoTotal,
            referencia: `REC-${Date.now()}`,
            observaciones: observaciones || undefined,
            pagoCuotas: {
              create: cuotas.map((c) => ({
                id_cuota: c.id_cuota,
                monto_pagado: c.monto_total,
                fecha_pago,
              })),
            },
          },
          include: { pagoCuotas: true },
        });

        await Promise.all(
          cuotas.map((c) =>
            tx.cuota.update({
              where: { id_cuota: c.id_cuota },
              data: { estado: EstadoCuota.pagada },
            })
          )
        );

        const pdfBytes = await generarReciboPDF({ pago, cuotas });
        return { pdfBytes, pago };
      });

      // ✅ Enviar el PDF como archivo descargable
      return new NextResponse(Buffer.from(result.pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=recibo_${result.pago.id_pago}.pdf`,
        },
      });
    });
  } catch (error: any) {
    console.error("❌ Error generando recibo:", error);
    return NextResponse.json(
      { error: error.message || "Error generando el recibo" },
      { status: 500 }
    );
  }
}
