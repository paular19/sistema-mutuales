export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exportInformeCentralDeudoresAction } from "@/lib/actions/informes";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodo = searchParams.get("periodo") ?? undefined;

        const { buffer, fileName } = await exportInformeCentralDeudoresAction(periodo);
        const csv = Buffer.isBuffer(buffer) ? buffer.toString("utf-8") : String(buffer);

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error("Error generando informe Central de Deudores:", error);
        return new NextResponse("Error generando el archivo", { status: 500 });
    }
}
