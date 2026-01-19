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

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function formatFechaLargaEs(date: Date) {
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

// ✅ usamos CUIT si existe; sino lo inferimos del CUIT/CUIL o de cuit
function pickCuit(a: any) {
  const c = safe(a.cuit) || safe(a.cuil) || safe(a.cdi);
  return onlyDigits(c);
}

/**
 * PEP: por defecto "NO" (más seguro).
 * Si en tu DB tenés un boolean o string, lo usa:
 * - a.pep === true -> "SI"
 * - a.pep === "SI" -> "SI"
 */
function pickPepSIoNO(a: any) {
  const v = a?.pep;
  if (v === true) return "SI";
  if (typeof v === "string" && v.trim().toLowerCase() === "si") return "SI";
  return "NO";
}

async function renderPEP(d: DatosDocumento) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const a = d.asociado as any;

  // Título
  page.drawText("DECLARACION JURADA SOBRE LA CONDICION", { x: 90, y: 805, size: 12, font: bold });
  page.drawText("DE PERSONA EXPUESTA POLITICAMENTE", { x: 95, y: 785, size: 12, font: bold });

  // “El/la (1) que suscribe, NOMBRE APELLIDO”
  page.drawText("El/la (1) que suscribe,", { x: 60, y: 745, size: 11, font });
  page.drawText(buildNombreApellido(a), { x: 205, y: 745, size: 11, font: bold });

  // bloque principal (resumen)
  const pep = pickPepSIoNO(a);
  const texto1 =
    'declara bajo juramento que los datos consignados en la presente son correctos, completos y fiel expresión de la';
  const texto2 =
    `verdad y que SI/NO(1) se encuentra incluido y/o alcanzado dentro de la "Nómina de Funciones de Personas"`;
  const texto3 =
    'Políticamente" aprobada por la Unidad de Información Financiera, que ha leído y suscripto';

  page.drawText(texto1, { x: 60, y: 720, size: 9.5, font });
  page.drawText(texto2, { x: 60, y: 705, size: 9.5, font });
  page.drawText(texto3, { x: 60, y: 690, size: 9.5, font });

  // Marcamos SI/NO visual (simple)
  page.drawText(`(Respuesta: ${pep})`, { x: 60, y: 670, size: 10, font: bold });

  // “En caso afirmativo indicar...”
  page.drawText(
    "En caso afirmativo indicar: Cargo/Función/Jerarquía, o relación con la Persona Expuesta Políticamente(1)",
    { x: 60, y: 645, size: 9.5, font }
  );
  page.drawLine({ start: { x: 60, y: 625 }, end: { x: 535, y: 625 }, thickness: 1 });
  page.drawLine({ start: { x: 60, y: 610 }, end: { x: 535, y: 610 }, thickness: 1 });

  // “Además, asume el compromiso...”
  page.drawText(
    "Además, asume el compromiso de informar cualquier modificación que se produzca a este respecto, dentro de",
    { x: 60, y: 585, size: 9.5, font }
  );
  page.drawText(
    "los treinta (30) días de ocurrida, mediante la presentación de una nueva declaración jurada.",
    { x: 60, y: 570, size: 9.5, font }
  );

  // Documento
  const { tipo, nro } = pickDoc(a);
  page.drawText("Documento: Tipo (3)", { x: 60, y: 535, size: 10.5, font });
  page.drawText(`${tipo} Nº ${nro}`, { x: 190, y: 535, size: 10.5, font: bold });

  page.drawText("País y Autoridad de Emisión:", { x: 60, y: 515, size: 10.5, font });
  page.drawLine({ start: { x: 210, y: 512 }, end: { x: 535, y: 512 }, thickness: 1 });

  // Carácter invocado / Denominación PJ
  page.drawText("Carácter invocado(4):", { x: 60, y: 490, size: 10.5, font });
  page.drawLine({ start: { x: 175, y: 487 }, end: { x: 535, y: 487 }, thickness: 1 });

  page.drawText("Denominación de la persona jurídica(5):", { x: 60, y: 465, size: 10.5, font });
  page.drawLine({ start: { x: 290, y: 462 }, end: { x: 535, y: 462 }, thickness: 1 });
  page.drawLine({ start: { x: 60, y: 445 }, end: { x: 535, y: 445 }, thickness: 1 });

  // CUIT/CUIL/CDI
  const cuit = pickCuit(a);
  page.drawText("CUIT/CUIL/CDI(1) Nº :", { x: 60, y: 415, size: 10.5, font });
  page.drawText(cuit, { x: 195, y: 415, size: 10.5, font: bold });

  // Lugar y fecha (como venías usando “RIO CUARTO” fijo en otros)
  const lugar = upper(a.localidad, "RIO CUARTO");
  const fecha = formatFechaLargaEs(new Date());
  page.drawText(`Lugar y fecha: ${lugar} , ${fecha}`, { x: 60, y: 385, size: 10.5, font });

  // Firma del asociado
  page.drawText("Firma del asociado:", { x: 60, y: 365, size: 10.5, font });
  page.drawLine({ start: { x: 180, y: 362 }, end: { x: 535, y: 362 }, thickness: 1 });

  // Certifico...
  page.drawText(
    "Certifico/Certificamos que la firma que antecede concuerda con la registrada en nuestros libros/fue puesta en",
    { x: 60, y: 330, size: 9.5, font }
  );
  page.drawText("mi/nuestra presencia (1).", { x: 60, y: 315, size: 9.5, font });

  // Firma y sello funcionario
  page.drawText("Firma y Sello del funcionario autorizado:", { x: 60, y: 290, size: 10.5, font });
  page.drawLine({ start: { x: 290, y: 287 }, end: { x: 535, y: 287 }, thickness: 1 });

  // Notas al pie (muy compacto)
  const foot = [
    "(1) Tachar lo que no corresponda.-",
    "(2) Integrar con el nombre y apellido de cliente/asociado, en el caso de personas físicas aun cuando en su representación firme un apoderado.-",
    "(3) Indicar DNI, LE o LC para argentinos nativos. Para extranjeros: DNI extranjeros, Carné internacional, Pasaporte, Certificado provisorio, etc.-",
    "(4) Indicar titular, representante legal, apoderado...-",
    "(5) Integrar solo en casos en que el firmante lo hace en carácter de apoderado o representante legal de una persona jurídica.-",
  ];

  let fy = 245;
  for (const ln of foot) {
    page.drawText(ln, { x: 60, y: fy, size: 7.5, font });
    fy -= 11;
  }

  return await pdf.save();
}

export const declaracionJuradaPEP: PdfTemplate = {
  id: "declaracion-jurada-pep",
  label: "Declaración jurada PEP",
  filename: (d) => `declaracion-jurada-pep-${d.asociado.id_asociado}.pdf`,
  render: async (d) => renderPEP(d),
};
