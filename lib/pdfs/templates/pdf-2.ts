import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento, PdfTemplate } from "../types";

const A4 = { w: 595.32, h: 841.92 };

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function safe(v?: string | null, fallback = "") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function upper(v?: string | null, fallback = "") {
  return safe(v, fallback).toUpperCase();
}

function onlyDigits(v?: string | null) {
  return safe(v).replace(/\D/g, "");
}

function dniFromCuit(cuit?: string | null) {
  const d = onlyDigits(cuit);
  return d.length >= 10 ? d.slice(2, 10) : "";
}

function fmtFechaLarga(d: Date) {
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function buildNombreCompleto(d: DatosDocumento) {
  const a = d.asociado;
  if (safe(a.razon_social)) return upper(a.razon_social);
  return `${upper(a.apellido)} ${upper(a.nombre)}`.trim() || "—";
}

function buildDomicilio(d: DatosDocumento) {
  const a = d.asociado;
  const parts = [
    upper(a.calle),
    a.numero_calle ? String(a.numero_calle) : "",
    a.piso ? `PISO ${upper(a.piso)}` : "",
    a.departamento ? `DPTO ${upper(a.departamento)}` : "",
  ].filter(Boolean);
  return parts.join(" ").trim() || "—";
}

function buildCiudadLinea(d: DatosDocumento) {
  const a = d.asociado;
  const loc = upper(a.localidad);
  const cp = safe(a.codigo_postal);
  const prov = upper(a.provincia);
  // Ej: "SALTA - C.P.: 4400 - Provincia: SALTA"
  const items: string[] = [];
  if (loc) items.push(loc);
  if (cp) items.push(`C.P.: ${cp}`);
  if (prov) items.push(`Provincia: ${prov}`);
  return items.join(" - ") || "—";
}

function buildSocioNro(d: DatosDocumento) {
  const a = d.asociado;
  return safe(a.socio_nro) || safe(a.codigo_externo) || `${a.id_asociado}/00`;
}

function wrapLines(
  text: string,
  font: any,
  size: number,
  maxWidth: number
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function renderPdf2(d: DatosDocumento): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4.w, A4.h]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 50;
  let y = height - 60;

  const draw = (t: string, size = 11, bold = false, x = marginX) => {
    page.drawText(t, {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawParagraph = (t: string, size = 11, bold = false) => {
    const lines = wrapLines(t, bold ? fontBold : font, size, width - marginX * 2);
    for (const ln of lines) {
      draw(ln, size, bold);
      y -= size + 4;
    }
  };

  const lineGap = (px: number) => (y -= px);

  // ✅ Fecha = HOY (generación)
  const hoy = new Date();
  draw(`RIO CUARTO , ${fmtFechaLarga(hoy)}`, 11, false, marginX);
  lineGap(24);

  draw("Señor", 11);
  y -= 16;

  draw("Presidente de la", 11);
  y -= 20;

  draw("Muy señor mío:", 11);
  lineGap(18);

  drawParagraph(
    `En mi carácter de Socio de la institución que Ud. preside, solicítole el ingreso como ASOCIADO al referido Departamento.`,
    11,
    false
  );
  lineGap(10);

  drawParagraph(
    `Declaro conocer el REGLAMENTO INTERNO de ese Departamento, del que en este acto recibo un ejemplar, y a fin de mantener vigentes mis derechos autorizo la habilitación en mi "Cuenta Personal" de mis cuotas sociales de la Mutual, si correspondiere.`,
    11,
    false
  );
  lineGap(10);

  drawParagraph(
    `Llenando el objeto de la presente, salúdole muy atte.`,
    11,
    false
  );

  lineGap(22);

  const nombre = buildNombreCompleto(d);
  const domicilio = buildDomicilio(d);
  const ciudad = buildCiudadLinea(d);
  const socioNro = buildSocioNro(d);
  const tel = safe(d.asociado.telefono) || "—";

  // Campos (rellenos)
  draw("Nombre:", 11, true);
  page.drawText(nombre, { x: marginX + 80, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 18;

  draw("Domicilio:", 11, true);
  page.drawText(domicilio, { x: marginX + 80, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 18;

  draw("Ciudad o Pueblo:", 11, true);
  page.drawText(ciudad, { x: marginX + 120, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 18;

  draw("Socio de la Mutual Nº:", 11, true);
  page.drawText(socioNro, { x: marginX + 165, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 18;

  draw("Acta Nº:", 11, true);
  page.drawText("—", { x: marginX + 80, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 18;

  draw("Tel:", 11, true);
  page.drawText(tel, { x: marginX + 40, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 18;

  draw("Socio Dto. Ayuda Econ. Nº:", 11, true);
  page.drawText(socioNro, { x: marginX + 205, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 22;

  // Línea de firma
  draw("Fecha:  -  -  ", 11, false);
  page.drawText("Firma", { x: marginX + 180, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 10;

  // Subrayado para firma
  page.drawLine({
    start: { x: marginX + 220, y: y - 5 },
    end: { x: marginX + 420, y: y - 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Footer
  y = 60;
  page.drawText("ASOCIACIÓN MUTUAL SOBERANIA", {
    x: marginX,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(
    "Ref./Solicitud de Ingreso al Departamento de Ayuda Económica de la ASOCIACIÓN MUTUAL SOBERANIA",
    {
      x: marginX,
      y: y - 14,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    }
  );

  return await pdfDoc.save();
}

export const pdf2: PdfTemplate = {
  id: "pdf-2",
  label: "Solicitud ingreso Dpto. Ayuda Económica",
  filename: (d: DatosDocumento) => `solicitud-dpto-ayuda-econ-${d.credito.id_credito}.pdf`,
  render: async (d: DatosDocumento) => renderPdf2(d),
};
