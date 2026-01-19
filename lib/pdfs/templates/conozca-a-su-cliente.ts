import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { DatosDocumento, PdfTemplate } from "../types";
import { fmtConvenio } from "@/lib/utils/documento-credito-pdflib";

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
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatFechaLargaEs(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = MONTHS_ES[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} de ${mm} de ${yyyy}`;
}

function pickDoc(a: Record<string, any>) {
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
  return { tipo, nro: onlyDigits(nro) };
}

function buildNombreApellido(a: Record<string, any>) {
  if (safe(a.razon_social)) return upper(a.razon_social);
  const ap = safe(a.apellido);
  const no = safe(a.nombre);
  const full = [ap, no].filter(Boolean).join(" ");
  return upper(full);
}

function buildDomicilioReal(a: Record<string, any>) {
  const calle = safe(a.calle);
  const nro = a.numero_calle != null ? String(a.numero_calle) : "";
  const piso = safe(a.piso);
  const dpto = safe(a.departamento);

  const base = [calle, nro].filter(Boolean).join(" ");
  const extra = [piso ? `PISO ${piso}` : "", dpto ? `DEPTO ${dpto}` : ""]
    .filter(Boolean)
    .join(" ");

  const loc = safe(a.localidad);
  const prov = safe(a.provincia);

  const parts = [
    [base, extra].filter(Boolean).join(" ").trim(),
    loc ? `LOCALIDAD: ${upper(loc)}` : "",
    prov ? `PROVINCIA: ${upper(prov)}` : "",
  ].filter(Boolean);

  return upper(parts.join(" / "));
}

function wrapText(text: string, maxWidth: number, measure: (s: string) => number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (measure(test) <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function renderConozcaCliente(d: DatosDocumento) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const a = d.asociado as any;

  // -------- Encabezado --------
  const title = "CONOZCA A SU CLIENTE";
  const titleSize = 14;
  const titleW = bold.widthOfTextAtSize(title, titleSize);
  const titleX = (A4.w - titleW) / 2;
  const titleY = 800;

  page.drawText(title, { x: titleX, y: titleY, size: titleSize, font: bold });
  page.drawLine({
    start: { x: titleX, y: titleY - 4 },
    end: { x: titleX + titleW, y: titleY - 4 },
    thickness: 1,
  });

  // Lugar y fecha
  const lugar = upper(a.localidad, "");
  const fecha = formatFechaLargaEs(new Date());
  const topRight = `${lugar ? `${lugar} , ` : ""}${fecha}`;
  page.drawText(topRight, { x: 330, y: 765, size: 11, font });

  // -------- Campos --------
  const leftX = 70;
  let y = 720;

  const labelSize = 11;
  const valueSize = 11;
  const maxRight = A4.w - 70;
  const lineGap = 18;

  function drawField(label: string, value: string) {
    const labelText = `${label}:`;
    page.drawText(labelText, { x: leftX, y, size: labelSize, font });

    const labelW = font.widthOfTextAtSize(labelText + " ", labelSize);
    const valueX = leftX + labelW + 4;
    const maxWidth = maxRight - valueX;

    const v = upper(value);
    const lines = wrapText(v, maxWidth, (s) => bold.widthOfTextAtSize(s, valueSize));

    lines.forEach((ln, idx) => {
      page.drawText(ln, { x: valueX, y: y - idx * lineGap, size: valueSize, font: bold });
    });

    y -= lineGap * Math.max(1, lines.length);
  }

  const { tipo, nro } = pickDoc(a);

  drawField("NOMBRE Y APELLIDO", buildNombreApellido(a));
  drawField(
    "FECHA Y LUGAR DE NACIMIENTO",
    `${safe(a.fecha_nac)}${safe(a.lugar_nacimiento) ? ` - ${safe(a.lugar_nacimiento)}` : ""}`
  );
  drawField("NACIONALIDAD", safe(a.nacionalidad));
  drawField("SEXO", safe(a.sexo));
  drawField("ESTADO CIVIL", safe(a.estado_civil));
  drawField("NOMBRE DEL CONYUGUE", safe(a.nombre_conyuge));

  // ✅ OCUPACIÓN desde CONVENIO
  drawField("OCUPACION", fmtConvenio(a.convenio ?? null));


  drawField("TIPO Y N° DE DOC", `${upper(tipo)} N° ${onlyDigits(nro)}`);
  drawField("C.U.I.L. C.U.I.T. O C.D.I.", onlyDigits(a.cuit));

  drawField("DOMICILIO REAL", buildDomicilioReal(a));
  drawField("DOMICILIO LABORAL O COMERCIAL", safe(a.domicilio_laboral));
  drawField("N° DE TELEFONO LABORAL O COMERCIAL", safe(a.telefono_laboral));
  drawField(
    "N° DE TELEFONO PARTICULAR / CELULAR",
    [safe(a.telefono), safe(a.celular)].filter(Boolean).join(" / ")
  );
  drawField("ACTIVIDAD PRINCIPAL REALIZADA", safe(a.actividad_principal));
  drawField("DIRECCION DE CORREO ELECTRONICO", safe(a.email));

  // -------- Firma / Aclaración --------
  const firmaY = 230;
  page.drawText("FIRMA:", { x: leftX, y: firmaY + 10, size: 12, font });
  page.drawLine({ start: { x: leftX, y: firmaY }, end: { x: 300, y: firmaY }, thickness: 1 });

  const aclarY = 165;
  page.drawText("ACLARACION:", { x: leftX, y: aclarY + 10, size: 12, font });
  page.drawLine({ start: { x: leftX, y: aclarY }, end: { x: 300, y: aclarY }, thickness: 1 });

  return await pdf.save();
}

export const conozcaACliente: PdfTemplate = {
  id: "conozca-a-su-cliente",
  label: "Conozca a su cliente",
  filename: (d) => `conozca-a-su-cliente-${d.asociado.id_asociado}.pdf`,
  render: async (d) => renderConozcaCliente(d),
};
