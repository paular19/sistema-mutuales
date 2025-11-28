// lib/actions/informes.ts
"use server";

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { getInforme3688, getInformeSaldosContables } from "@/lib/queries/informes";

function sanitize(value?: string) {
  if (!value) return "";
  return value.replace(/\|/g, " ").replace(/\r?\n/g, " ").trim();
}

export async function exportInformeSaldosContablesAction() {
  const hoy = new Date();
  const periodo = format(hoy, "yyyy-MM");

  const datos = await getInformeSaldosContables(periodo);

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

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Saldos Contables");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  // 👈 DEVUELVE SOLO EL BUFFER (NO Response)
  return {
    buffer,
    periodo,
  };
}

export async function exportInforme3688TxtAction(
  periodo?: string,
  umbral: number = 1_600_000
) {
  const rows = await getInforme3688(periodo, umbral);

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

  const lines = [header];

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

  // 👈 DEVUELVE SOLO EL TEXTO (NO Response)
  return txt;
}
