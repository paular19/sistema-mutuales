import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/get-server-user";
import { withRLS } from "@/lib/db/with-rls";
import { generarReciboPDF } from "@/lib/utils/recibo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const serverUser = await getServerUser();
        if (!serverUser) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { userId, mutualId } = serverUser;
        if (!userId || !mutualId) {
            return NextResponse.json({ error: "Contexto de usuario inválido" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const cuotaIdParam = Number(searchParams.get("cuotaId"));

        const cuotas = await withRLS(mutualId, userId, async (tx) => {
            return tx.cuota.findMany({
                where: {
                    credito: { id_mutual: mutualId },
                    ...(Number.isFinite(cuotaIdParam) && cuotaIdParam > 0
                        ? { id_cuota: cuotaIdParam }
                        : {}),
                },
                include: {
                    credito: {
                        include: {
                            asociado: {
                                include: {
                                    mutual: true,
                                },
                            },
                            producto: true,
                        },
                    },
                },
                orderBy: [
                    { fecha_vencimiento: "asc" },
                    { id_cuota: "asc" },
                ],
                take: Number.isFinite(cuotaIdParam) && cuotaIdParam > 0 ? 1 : 6,
            });
        });

        if (!cuotas.length) {
            return NextResponse.json(
                { error: "No hay cuotas disponibles para generar una vista previa." },
                { status: 404 }
            );
        }

        const montoTotal = cuotas.reduce((acc, cuota) => acc + cuota.monto_total, 0);
        const pagoPreview = {
            id_pago: "PREVIEW",
            fecha_pago: new Date(),
            monto_pago: montoTotal,
            referencia: "VISTA-PREVIA-SIN-GUARDAR",
            observaciones: "Vista previa del recibo. No genera pago ni modifica datos.",
        };

        const pdfBytes = await generarReciboPDF({
            pago: pagoPreview,
            cuotas,
        });

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'inline; filename="recibo-preview.pdf"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (error) {
        console.error("Error al generar preview del recibo:", error);
        return NextResponse.json(
            { error: "No se pudo generar la vista previa del recibo." },
            { status: 500 }
        );
    }
}
