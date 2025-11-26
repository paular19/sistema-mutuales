// lib/actions/informes.ts
"use server";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { getInforme3688, getInformeSaldosContables } from "@/lib/queries/informes";

export async function exportInformeSaldosContablesAction() {
  const hoy = new Date();
  const periodo = format(hoy, "yyyy-MM");

  // 🔹 Resultado ya tipado debido al refactor de la query
  const datos = await getInformeSaldosContables(periodo);

  // 🔹 Filas del Excel
  const rows = datos.map((r) => ({
    "ID Crédito": r.id_credito,
    "ID Cuota": r.id_cuota,
    Socio: r.socio,
    Producto: r.producto,
    "Monto Crédito": r.monto_credito,
    "Cargos (Debe)": r.cargos,
    "Abonos (Haber)": r.abonos,
    Saldo: r.saldo,
    "Interés a Devengar": r.interes_a_devengar,
    Vencimiento: r.dia_vencimiento
      ? format(new Date(r.dia_vencimiento), "dd/MM/yyyy")
      : "",
    "Tasa (%)": r.tasa_interes,
  }));

  // 🔹 Crear worksheet y workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Saldos Contables");

  // 🔹 Buffer final
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="informe-saldos-contables-${periodo}.xlsx"`,
    },
  });
}

// sanitizador simple dentro de la acción
function sanitize(value?: string) {
  if (!value) return "";
  return value.replace(/\|/g, " ").replace(/\r?\n/g, " ").trim();
}

export async function exportInforme3688TxtAction(
  periodo?: string,
  umbral: number = 1_600_000
) {
  const rows = await getInforme3688(periodo, umbral);

  // 🔹 Cabecera del TXT
  const header = [
    "CUIT",
    "TIPOPERSONA",
    "APELLIDO_NOMBRE_RAZON",
    "DOMICILIO",
    "TIPO_OPERACION",
    "MONEDA",
    "IMPORTE_MENSUAL",
    "PERIODO",
    "FECHA_INICIO",
    "FECHA_FIN",
    "OBS",
  ].join("|");

  const lines: string[] = [header];

  // 🔹 Filas del archivo
  for (const r of rows) {
    lines.push(
      [
        r.cuit,
        r.tipo_persona.toUpperCase(),
        sanitize(r.nombre_razon),
        sanitize(r.domicilio),
        r.tipo_operacion.toUpperCase(),
        r.moneda.toUpperCase(),
        r.importe_total_mes.toFixed(2).replace(",", "."),
        r.periodo,
        format(r.fecha_inicio, "yyyy-MM-dd"),
        format(r.fecha_fin, "yyyy-MM-dd"),
      ].join("|")
    );
  }

  const txt = lines.join("\r\n");

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="informe-3688-${rows[0]?.periodo ?? "periodo"}.txt"`,
    },
  });
}