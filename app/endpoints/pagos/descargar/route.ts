export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;
export const runtime = "nodejs";


import { NextResponse } from "next/server";
import { withRLS } from "@/lib/db/with-rls";
import { generarReciboPDF } from "@/lib/utils/recibo";
import { EstadoCuota, Prisma } from "@prisma/client";
import { Buffer } from "node:buffer";
import { getServerUser } from "@/lib/auth/get-server-user";


type CuotaWithRelations = Prisma.CuotaGetPayload<{
    include: {
        credito: {
            include: {
                asociado: { include: { mutual: true } };
                producto: true;
            };
        };
    };
}>;

export async function POST(req: Request) {
    try {
        console.log("=====================================");
        console.log("=== INICIO POST PAGOS / DESCARGAR ===");
        console.log("=====================================");

        const serverUser = await getServerUser();
        if (!serverUser) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { userId: clerkId, mutualId } = serverUser;

        if (!mutualId || !Number.isFinite(mutualId)) {
            return NextResponse.json({ error: "MutualId faltante o inválido" }, { status: 400 });
        }
        if (!clerkId) {
            return NextResponse.json({ error: "ClerkId faltante" }, { status: 400 });
        }

        const formData = await req.formData();
        const cuotasIdsRaw = formData.get("cuotasIds");
        console.log("📌 cuotasIdsRaw:", cuotasIdsRaw);

        if (!cuotasIdsRaw) {
            return NextResponse.json({ error: "cuotasIds faltante" }, { status: 400 });
        }

        const cuotasIds = JSON.parse(cuotasIdsRaw as string) as number[];
        console.log("📌 cuotasIds PARSED:", cuotasIds);

        const fecha_pago_raw = formData.get("fecha_pago") as string | null;
        if (!fecha_pago_raw) {
            return NextResponse.json({ error: "fecha_pago faltante" }, { status: 400 });
        }
        const fecha_pago = new Date(fecha_pago_raw);

        const observaciones = (formData.get("observaciones") as string) || undefined;

        return await withRLS(mutualId, clerkId, async (tx, ctx) => {
            console.log("CTX MUTUAL:", ctx.mutualId);
            const rlsCheck = await tx.$queryRaw`SELECT current_setting('app.mutual_id', true) AS mutual_id_setting`;
            console.log(">>> actual current_setting('app.mutual_id') =", rlsCheck);


            // 1️⃣ Traemos cuotas + asociado + producto (sin mutual)
            const cuotasBase = await tx.cuota.findMany({
                where: { id_cuota: { in: cuotasIds } },
                include: {
                    credito: {
                        include: {
                            asociado: true,
                            producto: true,
                        },
                    },
                },
            });

            if (!cuotasBase.length) {
                return NextResponse.json({ error: "No se encontraron cuotas válidas" }, { status: 404 });
            }
            console.log(">>> ctx.mutualId recibido en RLS:", ctx.mutualId);

            // 2️⃣ Traemos la mutual del contexto RLS
            const mutual = await tx.mutual.findUnique({
                where: { id_mutual: ctx.mutualId },
            });

            if (!mutual) {
                throw new Error("No se encontró la mutual asociada al contexto RLS.");
            }

            // 3️⃣ Inyectamos la mutual en cada asociado para que el PDF tenga la estructura esperada
            const cuotas = cuotasBase.map((c) => ({
                ...c,
                credito: {
                    ...c.credito,
                    asociado: {
                        ...c.credito.asociado,
                        mutual, // <- acá agregamos la mutual
                    },
                },
            })) as CuotaWithRelations[];

            console.log(
                "Cuotas encontradas:",
                cuotas.map((c) => ({
                    id_cuota: c.id_cuota,
                    id_credito: c.id_credito,
                    id_asociado: c.credito.asociado.id_asociado,
                    id_mutual_asociado: c.credito.asociado.id_mutual,
                    mutual_nombre: c.credito.asociado.mutual.nombre,
                    mutual_id: c.credito.asociado.mutual.id_mutual,
                }))
            );

            const montoTotal = cuotas.reduce(
                (acc: number, c: CuotaWithRelations) => acc + c.monto_total,
                0
            );

            const pago = await tx.pago.create({
                data: {
                    id_mutual: mutual.id_mutual,
                    fecha_pago,
                    monto_pago: montoTotal,
                    referencia: `REC-${Date.now()}`,
                    observaciones,
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
                cuotas.map((c: CuotaWithRelations) =>
                    tx.cuota.update({
                        where: { id_cuota: c.id_cuota },
                        data: { estado: EstadoCuota.pagada },
                    })
                )
            );

            const pdfBytes = await generarReciboPDF({ pago, cuotas });

            return new NextResponse(Buffer.from(pdfBytes), {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename=recibo_${pago.id_pago}.pdf`,
                },
            });
        });
    } catch (error: any) {
        console.error("❌ Error generando recibo:", error);
        return NextResponse.json(
            { error: error?.message ?? "Error generando el recibo" },
            { status: 500 }
        );
    }
}
