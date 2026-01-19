import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
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

function buildNombreApellido(a: any) {
  if (safe(a.razon_social)) return upper(a.razon_social);
  const ap = safe(a.apellido);
  const no = safe(a.nombre);
  return upper([ap, no].filter(Boolean).join(" "));
}

function buildDomicilio(a: any) {
  const calle = safe(a.calle);
  const nro = a.numero_calle != null ? String(a.numero_calle) : "";
  const piso = safe(a.piso);
  const dpto = safe(a.departamento);
  const loc = safe(a.localidad);
  const prov = safe(a.provincia);

  const base = [calle, nro].filter(Boolean).join(" ");
  const extra = [piso ? `PISO ${piso}` : "", dpto ? `DEPTO ${dpto}` : ""].filter(Boolean).join(" ");
  const tail = [loc, prov].filter(Boolean).join(", ");

  return upper([base, extra, tail].filter(Boolean).join(" - "));
}

function pickDoc(a: any) {
  const tipo =
    safe(a.tipo_doc) ||
    safe(a.tipoDocumento) ||
    safe(a.tipo_documento) ||
    "DNI";
  const nro =
    safe(a.dni) ||
    safe(a.documento) ||
    safe(a.nro_doc) ||
    safe(a.numero_documento) ||
    safe(a.num_documento) ||
    "";
  return { tipo: upper(tipo), nro: onlyDigits(nro) };
}

function formatFechaDDMMYYYY(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function convenioToOcupacion(a: any) {
  const raw = a?.convenio ?? a?.convenio_nombre ?? a?.convenioName ?? "";
  const s = (raw ?? "").toString().trim();
  if (!s) return "";

  const norm = s.toLowerCase().replace(/_/g, " ").trim();

  if (norm.includes("san rafael")) return "CLINICA SAN RAFAEL";
  if (norm === "centro" || norm.includes("centro")) return "CENTRO";
  if (norm.includes("3") || norm.includes("tres") || norm.includes("abril")) return "3 DE ABRIL";

  return s.toUpperCase().replace(/_/g, " ").trim();
}


async function renderDJ(d: DatosDocumento) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const a = d.asociado as any;

  // título
  page.drawText("DECLARACION JURADA", { x: 200, y: 800, size: 14, font: bold });

  // labels + values
  const leftX = 60;
  const valueX = 220;
  let y = 740;

  function row(label: string, value: string) {
    page.drawText(label, { x: leftX, y, size: 11, font });
    page.drawText(upper(value), { x: valueX, y, size: 11, font: bold });
    y -= 26;
  }

  const { tipo, nro } = pickDoc(a);

  row("NOMBRE Y APELLIDO:", buildNombreApellido(a));
  row("OCUPACION:", convenioToOcupacion(a));
  row("DOMICILIO:", buildDomicilio(a));
  row("TIPO Y Nº DE DOC:", `${tipo} Nº ${nro}`);

  // aclaración (en el ejemplo aparece a la derecha de doc)
  page.drawText("Aclaración", { x: 350, y: 650, size: 10, font });

  // resolución UIF
  page.drawText("(Resolución 10/2004 de la Unidad de Información Financiera)", {
    x: leftX,
    y: 600,
    size: 10,
    font,
  });

  // fecha
  const fecha = formatFechaDDMMYYYY(new Date());
  page.drawText(`FECHA: ${fecha}`, { x: leftX, y: 560, size: 11, font: bold });

  // texto principal
  const texto =
    "El suscripto manifiesta con carácter de DECLARACION JURADA que el origen de los " +
    "fondos depositados provienen de mi actividad que es";

  // texto en 2-3 líneas simple
  const maxWidth = A4.w - leftX - 60;
  const words = texto.split(" ");
  let line = "";
  let ty = 520;

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, 11) <= maxWidth) {
      line = test;
    } else {
      page.drawText(line, { x: leftX, y: ty, size: 11, font });
      ty -= 18;
      line = w;
    }
  }
  if (line) page.drawText(line, { x: leftX, y: ty, size: 11, font });

  // línea para completar actividad
  page.drawLine({
    start: { x: leftX, y: ty - 10 },
    end: { x: A4.w - 60, y: ty - 10 },
    thickness: 1,
  });

  return await pdf.save();
}

export const declaracionJuradaUIF: PdfTemplate = {
  id: "declaracion-jurada-uif",
  label: "Declaración jurada UIF",
  filename: (d) => `declaracion-jurada-${d.asociado.id_asociado}.pdf`,
  render: async (d) => renderDJ(d),
};
