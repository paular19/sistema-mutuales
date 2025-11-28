import { NextResponse } from "next/server";
import { exportInforme3688TxtAction } from "@/lib/actions/informes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") ?? undefined;

  const txt = await exportInforme3688TxtAction(periodo, 1_600_000);

  return new NextResponse(txt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="informe-3688-${periodo ?? "periodo"}.txt"`,
    },
  });
}
