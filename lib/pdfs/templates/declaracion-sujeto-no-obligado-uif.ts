import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento, PdfTemplate } from "../types";

const A4 = { w: 595.32, h: 841.92 };

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

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function fmtFechaLarga(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = MONTHS_ES[date.getMonth()];
  const yyyy = date.getFullYear();
  return `${dd} de ${mm} de ${yyyy}`;
}

function buildNombreApellido(a: any) {
  if (safe(a.razon_social)) return upper(a.razon_social);
  const ap = safe(a.apellido);
  const no = safe(a.nombre);
  return upper([ap, no].filter(Boolean).join(" "));
}

function pickDni(a: any) {
  const v =
    safe(a.dni) ||
    safe(a.documento) ||
    safe(a.nro_doc) ||
    safe(a.numero_documento) ||
    safe(a.num_documento) ||
    "";
  return onlyDigits(v);
}

async function render(d: DatosDocumento): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 55;
  const maxW = width - marginX * 2;

  const a = d.asociado as any;

  const nombre = buildNombreApellido(a);
  const dni = pickDni(a);
  const cuit = onlyDigits(a.cuit);
  const fecha = fmtFechaLarga(new Date());

  // ----- Encabezado -----
  let y = height - 70;

  page.drawText(
    "DECLARACION JURADA DE SUJETOS OBLIGADOS A",
    { x: marginX, y, size: 12, font: bold, color: rgb(0, 0, 0) }
  );
  y -= 18;

  page.drawText(
    "INFORMAR A LA UNIDAD DE INFORMACION FINANCIERA (UIF)",
    { x: marginX, y, size: 12, font: bold, color: rgb(0, 0, 0) }
  );
  y -= 40;

  // ----- Cuerpo -----
  const linea1 = `El/la que suscribe, ${nombre} DNI ${dni},`;
  page.drawText(linea1, { x: marginX, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 18;

  const texto =
    "declara bajo juramento NO estar incluido como Sujeto Obligado a informar de acuerdo a lo " +
    "establecido en el art. 20 de la Ley Nº 25.246 (modificada por la Ley Nº 26.683) en materia de " +
    "Prevención del Lavado de Activos y Financiación del Terrorismo.-";

  // wrap simple
  const words = texto.split(" ");
  let line = "";
  const size = 11;

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      line = test;
    } else {
      page.drawText(line, { x: marginX, y, size, font, color: rgb(0, 0, 0) });
      y -= 16;
      line = w;
    }
  }
  if (line) {
    page.drawText(line, { x: marginX, y, size, font, color: rgb(0, 0, 0) });
    y -= 24;
  }

  page.drawText(`Lugar : RIO CUARTO , Fecha : ${fecha}`, {
    x: marginX,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 24;

  // Firma del asociado (línea)
  page.drawText("Firma del asociado:", { x: marginX, y, size: 11, font, color: rgb(0, 0, 0) });
  page.drawLine({
    start: { x: marginX + 120, y: y - 2 },
    end: { x: width - marginX, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 24;

  page.drawText("Certifico que la firma que antecede ha sido puesta en mi presencia.-", {
    x: marginX,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 24;

  page.drawText("Firma y Sello del oficial de cumplimiento:", {
    x: marginX,
    y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: marginX + 235, y: y - 2 },
    end: { x: width - marginX, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // ----- Pie / Bloque fijo -----
  const footerY = 160;

  page.drawText("Asociación Mutual Soberania", { x: marginX, y: footerY + 70, size: 11, font: bold, color: rgb(0,0,0) });
  page.drawText("Asociación Mutual Soberania", { x: marginX, y: footerY + 52, size: 11, font: bold, color: rgb(0,0,0) });

  page.drawText("INFORMAR A LA UNIDAD DE INFORMACION FINANCIERA (UIF)", {
    x: marginX,
    y: footerY + 34,
    size: 10,
    font: bold,
    color: rgb(0,0,0),
  });

  page.drawText("(Según Resolución 3/2014 de la UIF)", {
    x: marginX,
    y: footerY + 18,
    size: 10,
    font,
    color: rgb(0,0,0),
  });

  page.drawText("SUJETO NO OBLIGADO PERSONA FISICA", {
    x: marginX,
    y: footerY,
    size: 10,
    font: bold,
    color: rgb(0,0,0),
  });

  page.drawText("Aclaración:", { x: marginX, y: footerY - 28, size: 10.5, font, color: rgb(0,0,0) });
  page.drawLine({
    start: { x: marginX + 75, y: footerY - 30 },
    end: { x: width - marginX, y: footerY - 30 },
    thickness: 1,
    color: rgb(0,0,0),
  });

  page.drawText("C.U.I.T.:", { x: marginX, y: footerY - 55, size: 10.5, font, color: rgb(0,0,0) });
  // si querés que sea completo en vez de línea vacía, imprimimos CUIT si hay
  if (cuit) {
    page.drawText(cuit, { x: marginX + 60, y: footerY - 55, size: 10.5, font: bold, color: rgb(0,0,0) });
  } else {
    page.drawLine({
      start: { x: marginX + 60, y: footerY - 57 },
      end: { x: width - marginX, y: footerY - 57 },
      thickness: 1,
      color: rgb(0,0,0),
    });
  }

  return await pdf.save();
}

export const declaracionSujetoNoObligadoUIF: PdfTemplate = {
  id: "declaracion-sujeto-no-obligado-uif",
  label: "Declaración jurada sujeto no obligado UIF",
  filename: (d) => `dj-sujeto-no-obligado-uif-${d.asociado.id_asociado}.pdf`,
  render: async (d) => render(d),
};
