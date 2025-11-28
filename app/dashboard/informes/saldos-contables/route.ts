// app/informes/saldos-contables/route.ts
export const runtime = "nodejs";
export const preferredRegion = "iad1";

import { NextResponse } from "next/server";
import { exportInformeSaldosContablesAction } from "@/lib/actions/informes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { buffer, periodo } = await exportInformeSaldosContablesAction();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="informe-saldos-contables-${periodo}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("❌ Error generando Excel:", error);
    return new NextResponse("Error generando el archivo", { status: 500 });
  }
}
