// lib/actions/informes.ts
"use server";

import * as XLSX from "xlsx";
import { getInforme3688, getInformeSaldosContables } from "@/lib/queries/informes";
import { format } from "date-fns";

export async function exportInformeSaldosContablesAction() {
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
      "Vencimiento": r.dia_vencimiento,
      "Tasa (%)": r.tasa_interes,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Saldos Contables");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="informe-saldos-contables-${periodo}.xlsx"`,
    },
  });
}

export async function exportInforme3688TxtAction(periodo?: string, umbral?: number) {
  const rows = await getInforme3688(periodo, umbral ?? 1_600_000);
  const lines: string[] = [];

  // Cabecera opcional (podés removerla si el aplicativo no la admite)
  lines.push([
    "CUIT","TIPOPERSONA","APELLIDO_NOMBRE_RAZON","DOMICILIO","TIPO_OPERACION","MONEDA",
    "IMPORTE_MENSUAL","PERIODO","FECHA_INICIO","FECHA_FIN","OBS"
  ].join("|"));

  for (const r of rows) {
    lines.push([
      r.cuit,
      r.tipo_persona.toUpperCase(),                                // FISICA/JURIDICA
      sanitize(r.nombre_razon),
      sanitize(r.domicilio),
      r.tipo_operacion.toUpperCase(),                              // CREDITO
      r.moneda.toUpperCase(),                                      // ARS
      r.importe_total_mes.toFixed(2).replace(",", "."),            // 12345.67
      r.periodo,                                                   // YYYY-MM
      format(r.fecha_inicio, "yyyy-MM-dd"),
      format(r.fecha_fin, "yyyy-MM-dd"),
      r.observaciones ?? ""
    ].join("|"));
  }

  const txt = lines.join("\r\n");
  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="informe-3688-${rows[0]?.periodo ?? "periodo"}.txt"`,
    },
  });
}

// Helpers
function sanitize(s?: string) {
  if (!s) return "";
  // evitar pipes y saltos de línea en campos de texto
  return s.replace(/\|/g, " ").replace(/\r?\n/g, " ").trim();
}
