export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { exportLiquidacionesAction } from "@/lib/actions/liquidaciones-cancelaciones-export";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const formatParam = searchParams.get("format");
        const format = formatParam === "pdf" ? "pdf" : "xlsx";

        const productoIdRaw = Number(searchParams.get("productoId"));
        const productoId = Number.isFinite(productoIdRaw) && productoIdRaw > 0 ? productoIdRaw : undefined;

        const { buffer, filename, contentType } = await exportLiquidacionesAction({
            format,
            productoId,
        });

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exportando liquidaciones:", error);
        return new NextResponse("Error generando el archivo", { status: 500 });
    }
}
