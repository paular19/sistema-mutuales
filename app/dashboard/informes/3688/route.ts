export const runtime = "nodejs";
export const preferredRegion = "iad1"; 

import { exportInforme3688TxtAction } from "@/lib/actions/informes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") ?? undefined; // opcional ?periodo=YYYY-MM
  // umbral fijo por normativa vigente (puede hacerse configurable)
  return exportInforme3688TxtAction(periodo, 1_600_000);
}
