// src/lib/pdf/templates/ayudas-economicas-a-vencer.ts
import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento } from "@/lib/utils/documento-credito-pdflib";
import { PdfTemplate } from "../types";

const A4 = { w: 595.32, h: 841.92 };

/* ---------------- helpers ---------------- */

function safe(v?: any, fallback = "") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function onlyDigits(v?: string | null) {
  return safe(v).replace(/\D/g, "");
}

function dniFromCuit(cuit?: string | null) {
  const d = onlyDigits(cuit);
  return d.length >= 10 ? d.slice(2, 10) : "";
}

function yFromTop(pageHeight: number, yTop: number) {
  return pageHeight - yTop;
}

function fmtFechaCorta(d?: Date | string | null) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return safe(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear());
  return `${dd}-${mm}-${yy}`;
}

function fmtHora(dt: Date) {
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function money(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "0,00";
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diffDays(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.trunc(ms / (1000 * 60 * 60 * 24));
}

/* ---------------- cuotas (tal como vienen del endpoint) ---------------- */

type CuotaRowFromEndpoint = {
  numero_cuota: number;
  fecha_vencimiento: Date | string;
  monto_capital: number;
  monto_interes: number;
  monto_total: number;
};

function getExtras(datos: DatosDocumento) {
  const anyD = datos as any;

  const now = new Date();
  const fechaCorte: Date = anyD?.fechaCorte ? new Date(anyD.fechaCorte) : now;

  const solicitaUsuario = safe(anyD?.solicitaUsuario, "—");

  const cuotas: CuotaRowFromEndpoint[] = (anyD?.cuotas ?? []) as any;

  const asociadoCodigo = safe(
    datos.asociado.codigo_externo,
    safe(datos.asociado.socio_nro, `${datos.asociado.id_asociado}`)
  );

  const cuentaNumero = safe(
    datos.asociado.socio_nro,
    safe(datos.asociado.codigo_externo, `${datos.asociado.id_asociado}`)
  );

  return { now, fechaCorte, solicitaUsuario, cuotas, asociadoCodigo, cuentaNumero };
}

/* ---------------- render ---------------- */

async function generarAyudasAEVencerPDF(datos: DatosDocumento): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4.w, A4.h]);
  const { height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const draw = (text: string, x: number, yTop: number, size = 10, isBold = false) => {
    page.drawText(safe(text), {
      x,
      y: yFromTop(height, yTop),
      size,
      font: isBold ? bold : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawRight = (text: string, xRight: number, yTop: number, size = 10, isBold = false) => {
    const t = safe(text);
    const f = isBold ? bold : font;
    const w = f.widthOfTextAtSize(t, size);
    page.drawText(t, {
      x: xRight - w,
      y: yFromTop(height, yTop),
      size,
      font: f,
      color: rgb(0, 0, 0),
    });
  };

  const ex = getExtras(datos);

  const a = datos.asociado;
  const m = datos.mutual;

  const nombreAsoc =
    safe(a.razon_social) ||
    [safe(a.apellido).toUpperCase(), safe(a.nombre).toUpperCase()].filter(Boolean).join(" ").trim();

  // Header superior
  draw("Fecha de Emisión:", 40, 40, 9, false);
  draw(fmtFechaCorta(ex.fechaCorte), 150, 40, 9, false);

  draw("Hora de Emisión:", 40, 56, 9, false);
  draw(fmtHora(ex.now), 150, 56, 9, false);

  draw(m.nombre, 40, 82, 11, true);
  draw(`Asociado: ${ex.asociadoCodigo} - ${nombreAsoc}`, 40, 104, 10, false);

  draw(`Ayudas Económicas a Vencer al ${fmtFechaCorta(ex.fechaCorte)}`, 40, 128, 11, true);

  draw(`Cuenta: ${ex.cuentaNumero} - ${nombreAsoc}`, 40, 150, 10, false);

  // Tabla: columnas (sin cheque)
  const X = {
    cuota: 40,
    fechaVen: 105,
    importe: 210,
    diasVen: 285,
    puniPct: 335,
    punitorios: 405,
    total: 490,
    nroAyuda: 592, // ✅ último campo, alineado a la derecha
  };

  const yHead = 176;
  draw("Nº Cuota", X.cuota, yHead, 9, true);
  draw("Fecha Ven.", X.fechaVen, yHead, 9, true);
  drawRight("$ Importe", X.importe, yHead, 9, true);
  drawRight("Días Ven.", X.diasVen, yHead, 9, true);
  drawRight("% Puni.", X.puniPct, yHead, 9, true);
  drawRight("$ Punitorios", X.punitorios, yHead, 9, true);
  drawRight("$ Total(c/puni.)", X.total, yHead, 9, true);
  drawRight("Nº Ayuda", X.nroAyuda, yHead, 9, true); // ✅ solo ayuda

  let y = yHead + 18;
  const rowH = 16;

  let sumImporte = 0;
  let sumPun = 0;
  let sumTotal = 0;

  const cuotasTotal = ex.cuotas.length || 1;
  const nroAyuda = datos.credito.id_credito; // ✅ tu regla

  for (const r of ex.cuotas) {
    const fechaV = r.fecha_vencimiento instanceof Date ? r.fecha_vencimiento : new Date(r.fecha_vencimiento);
    const importe = Number(r.monto_total ?? 0);

    // punitorios (si no los calculás, 0)
    const puniPct = 0;
    const pun = 0;
    const total = importe + pun;

    const nroCuota = `${r.numero_cuota}/${cuotasTotal}`;
    const diasVen = diffDays(fechaV, ex.fechaCorte);

    draw(nroCuota, X.cuota, y, 9, false);
    draw(fmtFechaCorta(fechaV), X.fechaVen, y, 9, false);
    drawRight(money(importe), X.importe, y, 9, false);
    drawRight(String(diasVen), X.diasVen, y, 9, false);
    drawRight(puniPct.toFixed(2), X.puniPct, y, 9, false);
    drawRight(money(pun), X.punitorios, y, 9, false);
    drawRight(money(total), X.total, y, 9, false);
    drawRight(String(nroAyuda), X.nroAyuda, y, 9, false);

    y += rowH;

    sumImporte += importe;
    sumPun += pun;
    sumTotal += total;
  }

  // Totales
  y += 6;
  draw("Totales $", X.cuota, y, 10, true);
  drawRight(money(sumImporte), X.importe, y, 10, true);
  drawRight(money(sumPun), X.punitorios, y, 10, true);
  drawRight(money(sumTotal), X.total, y, 10, true);

  // Footer
  const yFooter = 820;
  draw(`Total  ${money(sumTotal)}`, 40, yFooter, 10, false);
  draw(`Solicita usuario: ${ex.solicitaUsuario}`, 210, yFooter, 10, false);
  drawRight("Página 1", 592, yFooter, 10, false);

  return await pdfDoc.save();
}

export const ayudasEconomicasAVencerTemplate = {
  id: "ayudas-economicas-a-vencer",
  label: "Ayudas Económicas a Vencer (Listado)",
  filename: (d: DatosDocumento) => `ayudas-a-vencer-${d.credito.id_credito}.pdf`,
  render: (d: DatosDocumento) => generarAyudasAEVencerPDF(d),
} satisfies PdfTemplate;
