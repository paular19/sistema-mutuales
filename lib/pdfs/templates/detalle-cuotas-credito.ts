import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento, PdfTemplate } from "../types";

const A4 = { w: 595.32, h: 841.92 };

function safe(v?: any, fallback = "") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}
function upper(v?: any, fallback = "") {
  return safe(v, fallback).toUpperCase();
}

function fmtDateDDMMYYYY(v: any) {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
function fmtTimeHHMMSS(v: any) {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function money(n: any) {
  const x = Number(n ?? 0);
  const v = isFinite(x) ? x : 0;
  return v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildNombreApellido(a: any) {
  if (safe(a.razon_social)) return upper(a.razon_social);
  const ap = safe(a.apellido);
  const no = safe(a.nombre);
  return upper([ap, no].filter(Boolean).join(" "));
}
function pickSocioCodigo(a: any) {
  return safe(a.socio_nro) || safe(a.codigo_externo) || (a?.id_asociado ? String(a.id_asociado) : "");
}

type CuotaRow = {
  numero_cuota: number;
  fecha_vencimiento: Date | string;
  monto_capital: number;
  monto_interes: number;
  monto_total: number;
  seguro_vida?: number;
};

async function renderDetalleCuotas(d: DatosDocumento): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const a = d.asociado as any;
  const mutual = d.mutual as any;

  // ✅ FECHA/HORA = fecha_creacion del crédito (emisión real)
  const emision = d.credito.fecha_creacion;
  const fechaEmision = fmtDateDDMMYYYY(emision);
  const horaEmision = fmtTimeHHMMSS(emision);

  // ✅ Ayuda Nº: preferimos codigo_externo si existe
  const ayudaNro = (d.credito as any).codigo_externo ?? d.credito.id_credito;

  const solicitante = `${pickSocioCodigo(a)}-${buildNombreApellido(a)}`;

  // ✅ cuotas vienen por (d as any).cuotas (inyectadas en el route)
  const cuotas: CuotaRow[] = Array.isArray((d as any).cuotas) ? (d as any).cuotas : [];

  const totalCuotas = Number(d.credito.numero_cuotas ?? 0) || cuotas.length || 0;

  const mx = 40;
  let y = height - 40;

  // Header
  page.drawText("Detalle de Cuotas - Emisión de Ayudas Económicas Amortizables", {
    x: mx, y, size: 11, font: bold, color: rgb(0, 0, 0),
  });
  y -= 14;
  page.drawText("en $ sin Solicitud", { x: mx, y, size: 10, font, color: rgb(0, 0, 0) });

  y -= 22;
  page.drawText("Fecha de Emisión:", { x: mx, y, size: 10, font, color: rgb(0, 0, 0) });
  page.drawText(fechaEmision, { x: mx + 110, y, size: 10, font: bold, color: rgb(0, 0, 0) });

  y -= 14;
  page.drawText("Hora de Emisión:", { x: mx, y, size: 10, font, color: rgb(0, 0, 0) });
  page.drawText(horaEmision, { x: mx + 110, y, size: 10, font: bold, color: rgb(0, 0, 0) });

  y -= 18;
  page.drawText(upper(mutual?.nombre ?? "ASOCIACIÓN MUTUAL SOBERANIA"), {
    x: mx, y, size: 10, font: bold, color: rgb(0, 0, 0),
  });

  y -= 22;
  page.drawText(`Solicitante: ${solicitante}`, { x: mx, y, size: 10, font: bold, color: rgb(0, 0, 0) });

  y -= 14;
  page.drawText(`Ayuda Nº ${ayudaNro}`, { x: mx, y, size: 10, font: bold, color: rgb(0, 0, 0) });

  // Tabla
  y -= 22;

  const cols = {
    cuota: mx,
    fecha: mx + 70,      // un poco más a la derecha para que "1/23" no choque
    capital: mx + 165,
    interes: mx + 275,
    importe: mx + 395,
    seguro: mx + 500,
  };

  page.drawText("Cuota", { x: cols.cuota, y, size: 9, font: bold, color: rgb(0, 0, 0) });
  page.drawText("Fecha Vto.", { x: cols.fecha, y, size: 9, font: bold, color: rgb(0, 0, 0) });
  page.drawText("Capital", { x: cols.capital, y, size: 9, font: bold, color: rgb(0, 0, 0) });
  page.drawText("Tasa de Servicio", { x: cols.interes, y, size: 9, font: bold, color: rgb(0, 0, 0) });
  page.drawText("Importe ($)", { x: cols.importe, y, size: 9, font: bold, color: rgb(0, 0, 0) });
  page.drawText("Seguro", { x: cols.seguro, y, size: 9, font: bold, color: rgb(0, 0, 0) });

  y -= 10;
  page.drawLine({
    start: { x: mx, y },
    end: { x: width - mx, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= 14;

  let totCapital = 0;
  let totInteres = 0;
  let totImporte = 0;
  let totSeguro = 0;

  const rowH = 16;

  if (cuotas.length === 0) {
    page.drawText("(Sin cuotas)", { x: mx, y, size: 10, font, color: rgb(0, 0, 0) });
    y -= rowH;
  } else {
    for (const c of cuotas) {
      if (y < 120) break;

      const nro = Number(c.numero_cuota ?? 0);
      const cuotaLabel = totalCuotas ? `${nro}/${totalCuotas}` : String(nro);
      const fechaVto = fmtDateDDMMYYYY(c.fecha_vencimiento);

      totCapital += Number(c.monto_capital ?? 0);
      totInteres += Number(c.monto_interes ?? 0);
      totImporte += Number(c.monto_total ?? 0);
      totSeguro += Number((c as any).seguro_vida ?? 0);

      page.drawText(cuotaLabel, { x: cols.cuota, y, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(fechaVto, { x: cols.fecha, y, size: 9, font, color: rgb(0, 0, 0) });

      page.drawText(money(c.monto_capital), { x: cols.capital, y, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(money(c.monto_interes), { x: cols.interes, y, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(money(c.monto_total), { x: cols.importe, y, size: 9, font, color: rgb(0, 0, 0) });

      page.drawText(money((c as any).seguro_vida ?? 0), { x: cols.seguro, y, size: 9, font, color: rgb(0, 0, 0) });

      y -= rowH;
    }
  }

  y -= 6;
  page.drawLine({
    start: { x: mx, y },
    end: { x: width - mx, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= 16;
  page.drawText("Totales:", { x: mx, y, size: 10, font: bold, color: rgb(0, 0, 0) });
  page.drawText(money(totCapital), { x: cols.capital, y, size: 10, font: bold, color: rgb(0, 0, 0) });
  page.drawText(money(totInteres), { x: cols.interes, y, size: 10, font: bold, color: rgb(0, 0, 0) });
  page.drawText(money(totImporte), { x: cols.importe, y, size: 10, font: bold, color: rgb(0, 0, 0) });
  page.drawText(money(totSeguro), { x: cols.seguro, y, size: 10, font: bold, color: rgb(0, 0, 0) });

  page.drawText("Página 1", { x: width - mx - 45, y: 20, size: 9, font, color: rgb(0, 0, 0) });

  return await pdf.save();
}

export const detalleCuotasCredito: PdfTemplate = {
  id: "detalle-cuotas-credito",
  label: "Detalle de cuotas (último crédito)",
  filename: (d) => `detalle-cuotas-${d.credito.id_credito}.pdf`,
  render: async (d) => renderDetalleCuotas(d),
};
