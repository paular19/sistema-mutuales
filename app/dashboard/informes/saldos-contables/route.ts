// app/informes/saldos-contables/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getInformeSaldosContables } from "@/lib/queries/informes";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hoy = new Date();
    const periodo = format(hoy, "yyyy-MM");
    const datos = await getInformeSaldosContables(periodo);

    const worksheet = XLSX.utils.json_to_sheet(
      datos.map((r) => ({
        "ID Crédito": r.id_credito,
        "ID Cuota": r.id_cuota,
        Socio: r.socio,
        Producto: r.producto,
        "Monto Crédito": r.monto_credito,
        "Cargos (Debe)": r.cargos,
        "Abonos (Haber)": r.abonos,
        Saldo: r.saldo,
        "Interés a Devengar": r.interes_a_devengar,
        "Vencimiento": r.dia_vencimiento
          ? format(new Date(r.dia_vencimiento), "dd/MM/yyyy")
          : "",
        "Tasa (%)": r.tasa_interes,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Saldos Contables");

    const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const buffer = Buffer.from(excelBuffer);

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
