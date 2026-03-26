import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/get-server-user";
import { withRLS } from "@/lib/db/with-rls";
import { generarReciboPDF } from "@/lib/utils/recibo";

export async function POST(req: NextRequest) {
    try {
        const serverUser = await getServerUser();
        if (!serverUser) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { userId, mutualId } = serverUser;
        if (!mutualId || !userId) {
            return NextResponse.json({ error: "Contexto de usuario inválido" }, { status: 400 });
        }

        const formData = await req.formData();
        const pagoIdRaw = formData.get("pagoId");
        const cuotaIdsRaw = formData.get("cuotaIds");

        const pagoId = Number(pagoIdRaw);
        let cuotaIds: number[] = [];

        if (typeof cuotaIdsRaw === "string") {
            try {
                const parsed = JSON.parse(cuotaIdsRaw);
                if (Array.isArray(parsed)) {
                    cuotaIds = parsed
                        .map((v) => Number(v))
                        .filter((v) => Number.isFinite(v) && v > 0);
                }
            } catch {
                cuotaIds = [];
            }
        }

        if (!Number.isFinite(pagoId) || pagoId <= 0) {
            return NextResponse.json({ error: "pagoId inválido" }, { status: 400 });
        }

        if (!cuotaIds.length) {
            return NextResponse.json({ error: "cuotaIds inválido" }, { status: 400 });
        }

        const result = await withRLS(mutualId, userId, async (tx) => {
            const pago = await tx.pago.findFirst({
                where: {
                    id_pago: pagoId,
                    id_mutual: mutualId,
                },
                include: {
                    pagoCuotas: {
                        where: { id_cuota: { in: cuotaIds } },
                    },
                },
            });

            if (!pago) {
                throw new Error("Pago no encontrado");
            }

            const cuotas = await tx.cuota.findMany({
                where: {
                    id_cuota: { in: cuotaIds },
                    pagoCuotas: { some: { id_pago: pago.id_pago } },
                    credito: { id_mutual: mutualId },
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
            });

            if (!cuotas.length) {
                throw new Error("No se encontraron cuotas para el recibo");
            }

            return { pago, cuotas };
        });

        const pdfBytes = await generarReciboPDF({
            pago: result.pago,
            cuotas: result.cuotas,
        });

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=cobranza_cancelacion_${result.pago.id_pago}.pdf`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (error) {
        console.error("Error al generar PDF de cobranza masiva:", error);
        return NextResponse.json(
            { error: "No se pudo generar el PDF de cobranza." },
            { status: 500 }
        );
    }
}
