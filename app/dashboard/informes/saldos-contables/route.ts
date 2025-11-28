// app/informes/saldos-contables/route.ts
export const runtime = "nodejs";
export const preferredRegion = "iad1"; 

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { getInformeSaldosContables } from "@/lib/queries/informes";

export const dynamic = "force-dynamic";

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

/** Formatea una fecha o devuelve string vacío */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch {
    return "";
  }
}

/** Mapea el registro a columnas del Excel */
function mapRow(r: any) {
  return {
    "ID Crédito": r.id_credito,
    "ID Cuota": r.id_cuota,
    Socio: r.socio,
    Producto: r.producto,
    "Monto Crédito": r.monto_credito,
    "Cargos (Debe)": r.cargos,
    "Abonos (Haber)": r.abonos,
    Saldo: r.saldo,
    "Interés a Devengar": r.interes_a_devengar,
    Vencimiento: formatDate(r.dia_vencimiento),
    "Tasa (%)": r.tasa_interes,
  };
}

/** Construye un archivo Excel desde un array de objetos */
function buildExcel(data: any[], sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });

  return Buffer.from(excelBuffer);
}

// -------------------------------------------------------------
// GET Handler
// -------------------------------------------------------------

export async function GET() {
  try {
    const hoy = new Date();
    const periodo = format(hoy, "yyyy-MM");

    const datos = await getInformeSaldosContables(periodo);
    const rows = datos.map(mapRow);

    const buffer = buildExcel(rows, "Saldos Contables");

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
