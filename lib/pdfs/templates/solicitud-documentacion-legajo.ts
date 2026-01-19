import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento, PdfTemplate } from "../types";

const A4 = { w: 595.32, h: 841.92 };

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function safe(v?: string | null, fallback = "") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}
function upper(v?: string | null, fallback = "") {
  return safe(v, fallback).toUpperCase();
}

function fmtFechaLarga(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = MONTHS_ES[date.getMonth()];
  const yyyy = date.getFullYear();
  return `${dd} de ${mm} de ${yyyy}`;
}

function wrapLines(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderSolicitudLegajo(_: DatosDocumento): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 60;
  const maxW = width - marginX * 2;

  const fecha = fmtFechaLarga(new Date());

  // ✅ Bloque superior (ARRIBA DE TODO)
  let y = height - 70;

  page.drawText(`RIO CUARTO , ${fecha}`, {
    x: marginX,
    y,
    size: 12,
    font: bold,
    color: rgb(0, 0, 0),
  });

  y -= 26;
  page.drawText("Sr. Asociado", {
    x: marginX,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  y -= 22;
  const parrafo =
    "Por la presente solicitamos cumplimentar todos estos requerimientos de documentación " +
    "a fin de actualizar su legajo personal.-";

  const lines = wrapLines(parrafo, maxW, font, 12);
  for (const ln of lines) {
    page.drawText(ln, { x: marginX, y, size: 12, font, color: rgb(0, 0, 0) });
    y -= 16;
  }

  y -= 8;
  page.drawText("Asociación Mutual Soberania", {
    x: marginX,
    y,
    size: 12,
    font: bold,
    color: rgb(0, 0, 0),
  });

  // ✅ ahora sí: lista (debajo del bloque superior)
  y -= 28;

  const lista = [
    "FOTOCOPIA DEL DNI",
    "FORMULARIO IVA 731 ÚLTIMOS 6 MESES",
    "MANIFESTACIÓN DE BIENES",
    "BALANCE GENERAL",
    "FOTOCOPIA DE ESCRITURA",
    "DECLARACION JURADA DE PEP´S",
    "FOTOCOPIA TITULO AUTOMOTOR",
    "CONTRATO SOCIAL – ESTATUTOS",
    "E-MAIL",
    "TELEFONO MOVIL",
    "DECLARACIÓN JURADA DE GANANCIAS",
    "CONSTANCIA INSCRIPCION AFIP",
    "SISTEMA REGISTRAL (monotributistas)",
    "DATOS IDENTIFICATORIOS DE LAS AUTORIDADES",
    "DETALLE ACTIVIDAD ECONOMICA QUE REALIZA",
  ];

  for (const item of lista) {
    page.drawText(item, {
      x: marginX,
      y,
      size: 12,
      font: bold,
      color: rgb(0, 0, 0),
    });
    y -= 18;
  }

  // “DATOS DEL CONYUGE” y otros (fijo)
  y -= 22;
  page.drawText("DATOS DEL CONYUGE", { x: marginX, y, size: 12, font: bold, color: rgb(0, 0, 0) });

  y -= 22;
  page.drawText("ULTIMO RECIBO DE SUELDO", { x: marginX, y, size: 12, font: bold, color: rgb(0, 0, 0) });

  y -= 18;
  page.drawText("COMPROBANTE DEL ULTIMO PAGO DE UN SERVCIO", {
    x: marginX,
    y,
    size: 12,
    font: bold,
    color: rgb(0, 0, 0),
  });

  // Despedida
  y -= 28;
  page.drawText("Sin otro particular, saludamos atte.-", {
    x: marginX,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  // Firma gerente + recibido (fijo)
  const footerY = 120;

  page.drawText("Gerente", { x: marginX + 30, y: footerY + 20, size: 12, font: bold, color: rgb(0,0,0) });
  page.drawText("Asociación Mutual Soberania", {
    x: marginX,
    y: footerY,
    size: 11,
    font: bold,
    color: rgb(0,0,0),
  });

  page.drawText("Recibí la presente solicitud", {
    x: marginX + 270,
    y: footerY + 40,
    size: 12,
    font,
    color: rgb(0,0,0),
  });

  page.drawText("Asociado", { x: marginX + 310, y: footerY + 20, size: 12, font: bold, color: rgb(0,0,0) });
  page.drawText("Asociación Mutual Soberania", {
    x: marginX + 260,
    y: footerY,
    size: 11,
    font: bold,
    color: rgb(0,0,0),
  });

  page.drawText("Fecha de vencimiento:  -  -", {
    x: marginX + 260,
    y: 70,
    size: 12,
    font,
    color: rgb(0,0,0),
  });

  return await pdf.save();
}


export const solicitudDocumentacionLegajo: PdfTemplate = {
  id: "solicitud-documentacion-legajo",
  label: "Solicitud documentación legajo",
  filename: () => `solicitud-documentacion-legajo.pdf`,
  render: async (d) => renderSolicitudLegajo(d),
};
