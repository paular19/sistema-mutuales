// lib/actions/informes.ts


import * as XLSX from "xlsx";
import { format } from "date-fns";
import { getServerUser } from "@/lib/auth/get-server-user";
import {
  getCentralDeudoresRawData,
  getInforme3688,
  getInformeSaldosContables,
} from "@/lib/queries/informes";

const DIA_EN_MS = 24 * 60 * 60 * 1000;
const NO_CARGADO = "NO CARGADO";

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

function normalizarPeriodoYYYYMM(periodo: string): string {
  const value = (periodo ?? "").trim();
  const isCompact = /^\d{6}$/.test(value);
  const isMonthInput = /^\d{4}-\d{2}$/.test(value);

  if (!isCompact && !isMonthInput) {
    throw new Error("El período debe tener formato YYYYMM o YYYY-MM.");
  }

  const compactValue = value.replace("-", "");

  const year = Number(compactValue.slice(0, 4));
  const month = Number(compactValue.slice(4, 6));

  if (month < 1 || month > 12) {
    throw new Error("El período informado no es válido.");
  }

  return `${year}${String(month).padStart(2, "0")}`;
}

function obtenerFechaCorte(periodoYYYYMM: string): Date {
  const year = Number(periodoYYYYMM.slice(0, 4));
  const month = Number(periodoYYYYMM.slice(4, 6));
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function obtenerPeriodoActualYYYYMM(): string {
  return format(new Date(), "yyyyMM");
}

function csvEscape(value: string | number): string {
  const text = String(value ?? "");
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function calcularDiasMora(primeraVencida: Date | null, fechaCorte: Date): number {
  if (!primeraVencida) return 0;

  const vencUTC = Date.UTC(
    primeraVencida.getUTCFullYear(),
    primeraVencida.getUTCMonth(),
    primeraVencida.getUTCDate()
  );
  const corteUTC = Date.UTC(
    fechaCorte.getUTCFullYear(),
    fechaCorte.getUTCMonth(),
    fechaCorte.getUTCDate()
  );

  const diff = Math.floor((corteUTC - vencUTC) / DIA_EN_MS);
  return diff > 0 ? diff : 0;
}

function normalizarTexto(value?: string | null): string {
  const text = value?.trim();
  return text ? text : NO_CARGADO;
}

/**
 * Clasifica la situación crediticia según días de mora.
 */
export function calcularSituacion(diasMora: number): number {
  if (diasMora <= 0) return 1;
  if (diasMora <= 30) return 2;
  if (diasMora <= 90) return 3;
  if (diasMora <= 180) return 4;
  if (diasMora <= 365) return 5;
  return 6;
}

/**
 * Genera el CSV de Central de Deudores para INAES.
 * Retorna Buffer para descarga directa del archivo.
 */
export async function generarInformeCentralDeudores(
  idMutual: number,
  periodo: string
): Promise<Buffer | string> {
  if (!Number.isInteger(idMutual) || idMutual <= 0) {
    throw new Error("El idMutual debe ser un entero positivo.");
  }

  const info = await getServerUser();
  if (!info) throw new Error("Usuario no autenticado.");
  if (info.mutualId && info.mutualId !== idMutual) {
    throw new Error("No autorizado para generar informes de otra mutual.");
  }

  const periodoNormalizado = normalizarPeriodoYYYYMM(periodo);
  const fechaCorte = obtenerFechaCorte(periodoNormalizado);

  const rawRows = await getCentralDeudoresRawData(idMutual, fechaCorte, info.user.id);

  const lines: string[] = new Array(rawRows.length + 1);
  lines[0] = [
    "CUIT_MUTUAL",
    "CUIT_ASOCIADO",
    "APELLIDO",
    "NOMBRE",
    "SALDO_DEUDA",
    "SITUACION",
    "PERIODO",
  ].join(",");

  for (let i = 0; i < rawRows.length; i += 1) {
    const row = rawRows[i];
    const diasMora = calcularDiasMora(row.primera_vencida, fechaCorte);
    const situacion = calcularSituacion(diasMora);

    lines[i + 1] = [
      csvEscape(normalizarTexto(row.cuit_mutual)),
      csvEscape(normalizarTexto(row.cuit_asociado)),
      csvEscape(normalizarTexto(row.apellido)),
      csvEscape(normalizarTexto(row.nombre)),
      csvEscape(Number(row.saldo_deuda ?? 0).toFixed(2)),
      csvEscape(situacion),
      csvEscape(periodoNormalizado),
    ].join(",");
  }

  const csv = lines.join("\r\n");
  return Buffer.from(csv, "utf-8");
}

export async function exportInformeCentralDeudoresAction(periodo?: string) {
  const info = await getServerUser();
  if (!info) throw new Error("Usuario no autenticado.");
  if (!info.mutualId) throw new Error("Mutual no encontrada.");

  const periodoNormalizado = normalizarPeriodoYYYYMM(periodo ?? obtenerPeriodoActualYYYYMM());
  const contenido = await generarInformeCentralDeudores(info.mutualId, periodoNormalizado);
  const buffer = Buffer.isBuffer(contenido)
    ? contenido
    : Buffer.from(contenido, "utf-8");

  return {
    buffer,
    periodo: periodoNormalizado,
    fileName: `central_deudores_${periodoNormalizado}.csv`,
  };
}
