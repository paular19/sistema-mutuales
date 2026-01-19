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

function pickSocioNro(a: any) {
  return safe(a.socio_nro) || safe(a.codigo_externo) || (a?.id_asociado ? `${a.id_asociado}/00` : "");
}

function wrapLines(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderNominaPep(d: DatosDocumento): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;
  const maxW = width - marginX * 2;

  // --- Header ---
  page.drawText("NOMINA DE FUNCIONES DE PERSONAS EXPUESTAS POLITICAMENTE", {
    x: marginX,
    y: height - 50,
    size: 11,
    font: bold,
    color: rgb(0, 0, 0),
  });

  page.drawText("ARTICULO 1° A 4° RESOL. 192/2024 (MODIFICA RESOL. PEP 35/2023)", {
    x: marginX,
    y: height - 68,
    size: 9.5,
    font,
    color: rgb(0, 0, 0),
  });

  // --- Body (texto copiado) ---
  const blocks: string[] = [
    "ARTÍCULO 1º.- PERSONAS EXPUESTAS POLÍTICAMENTE EXTRANJERAS.",
    "Son consideradas Personas Expuestas Políticamente Extranjeras los funcionarios públicos pertenecientes a países extranjeros que se desempeñen o se hayan desempeñado en alguna de las siguientes funciones:",
    "a) Jefe de Estado, Jefe de Gobierno, Gobernador, Intendente, Ministro, Secretario de Estado u otro cargo gubernamental equivalente.",
    "b) Miembro del Parlamento, Poder Legislativo o de otro órgano de naturaleza equivalente.",
    "c) Juez o Magistrado de Tribunales Superiores u otra alta instancia judicial o administrativa, en el ámbito del Poder Judicial.",
    "d) Embajador o cónsul de un país u organismo internacional.",
    "e) Autoridad, apoderado, integrante del órgano de administración o control dentro de un partido político extranjero.",
    "f) Oficial de alto rango de las Fuerzas Armadas (a partir de coronel o grado equivalente en la fuerza y/o país de que se trate) o de las fuerzas de seguridad pública (a partir de comisario o rango equivalente según la fuerza y/o país de que se trate).",
    "g) Miembro de los órganos de dirección y control de empresas de propiedad estatal.",
    "h) Miembro de los órganos de dirección o control de empresas de propiedad privada o mixta cuando el Estado posea una participación igual o superior al VEINTE POR CIENTO (20%) del capital o del derecho a voto, o que ejerza de forma directa o indirecta el control de dicha entidad.",
    "i) Presidente, vicepresidente, director, gobernador, consejero, síndico o autoridad equivalente de bancos centrales y otros organismos de regulación y/o supervisión del sector financiero.",
    "j) Representantes consulares, miembros de la alta gerencia, como son los directores y miembros de la junta, o cargos equivalentes, apoderados y representantes legales de una organización internacional, con facultades de decisión, administración o disposición.",

    "ARTÍCULO 2º.- PERSONAS EXPUESTAS POLÍTICAMENTE NACIONALES, PROVINCIALES, MUNICIPALES O DE LA CIUDAD AUTÓNOMA DE BUENOS AIRES.",
    "Son consideradas Personas Expuestas Políticamente nacionales, provinciales, municipales o de la Ciudad Autónoma de Buenos Aires, los funcionarios públicos de dichas jurisdicciones que se desempeñen o se hayan desempeñado en alguno de los siguientes cargos:",
    "a) Presidente o Vicepresidente de la Nación.",
    "b) Legislador nacional, provincial, municipal o de la Ciudad Autónoma de Buenos Aires.",
    "c) Gobernador, Vicegobernador, Intendente, Vice-intendente, Jefe de Gobierno o Vicejefe de Gobierno.",
    "d) Jefe de Gabinete de Ministros, Ministro o Secretario del Poder Ejecutivo de la Nación, o funcionario con rango equivalente dentro de la Administración Pública Nacional centralizada o descentralizada, su equivalente en las provincias o en la Ciudad Autónoma de Buenos Aires.",
    "e) Miembros del Poder Judicial de la Nación o del Ministerio Público de la Nación, con cargo no inferior a Juez o Fiscal de primera instancia, su equivalente en las provincias o en la Ciudad Autónoma de Buenos Aires.",
    "f) Defensor del Pueblo de la Nación, su equivalente en las provincias o en la Ciudad Autónoma de Buenos Aires y los adjuntos del Defensor del Pueblo.",
    "g) Interventor federal, o colaboradores del mismo con categoría no inferior a Secretario o su equivalente.",
    "h) Síndico General de la Nación o Síndico General Adjunto de la Sindicatura General de la Nación; Presidente o Auditor General de la Auditoría General de la Nación; máxima autoridad de un ente regulador o de los demás órganos que integran los sistemas de control del sector público nacional.",
    "i) Miembro del Consejo de la Magistratura de la Nación o del Jurado de Enjuiciamiento, su equivalente en las provincias o en la Ciudad Autónoma de Buenos Aires.",
    "j) Embajador o Cónsul.",
    "k) Máxima autoridad de las Fuerzas Armadas, de la Policía Federal Argentina, de Gendarmería Nacional, de la Prefectura Naval Argentina, del Servicio Penitenciario Federal o de la Policía de Seguridad Aeroportuaria, su equivalente en las provincias o en la Ciudad Autónoma de Buenos Aires.",
    "l) Rector o Decano de las Universidades Nacionales o provinciales.",
    "m) Máxima autoridad de un organismo estatal encargado de otorgar habilitaciones administrativas, permisos o concesiones, para el ejercicio de cualquier actividad; y de controlar el funcionamiento de dichas actividades o de ejercer cualquier otro control en virtud de un poder de policía.",
    "n) Máxima autoridad de los organismos de control de servicios públicos, nacional, provincial o de la Ciudad Autónoma de Buenos Aires.",

    "ARTÍCULO 3º.- OTRAS PERSONAS EXPUESTAS POLÍTICAMENTE.",
    "Sin perjuicio de lo expuesto en los artículos precedentes, son, asimismo, consideradas Personas Expuestas Políticamente las siguientes:",
    "a) Autoridad, apoderado o candidato de partidos políticos o alianzas electorales, ya sea a nivel nacional o distrital, de conformidad con lo establecido en las Leyes Nros. 23.298 y 26.215.",
    "b) Autoridad de los órganos de dirección y administración de organizaciones sindicales. El alcance comprende a las personas humanas con capacidad de decisión, administración, control o disposición del patrimonio de la organización sindical.",
    "c) Autoridad, representante legal, integrante del órgano de administración o de la Comisión Directiva de las obras sociales contempladas en la Ley Nº 23.660.",
    "d) Las personas humanas con capacidad de decisión, administración, control o disposición del patrimonio de personas jurídicas privadas en los términos del artículo 148 del Código Civil y Comercial de la Nación, que reciban fondos públicos destinados a terceros y cuenten con poder de control y disposición respecto del destino de dichos fondos.",

    "ARTÍCULO 4º.- PERSONAS EXPUESTAS POLÍTICAMENTE POR PARENTESCO O CERCANÍA.",
    "Se consideran Personas Expuestas Políticamente por parentesco o cercanía a aquellas que mantienen, con las individualizadas en los artículos 1° a 3° de la presente, cualquiera de los siguientes vínculos:",
    "a) Cónyuge o conviviente.",
    "b) Padres/madres, hermanos/as, hijos/as, suegros/as, yernos/nueras, cuñados/as.",
    "c) Personas allegadas o cercanas: debe entenderse como tales a aquellas que mantengan relaciones jurídicas de negocios del tipo asociativas, aún de carácter informal, cualquiera fuese su naturaleza.",
    "d) Toda otra relación o vínculo que por sus características y en función de un análisis basado en riesgo, a criterio del Sujeto Obligado, pueda resultar relevante.",
  ];

  // Dibujado con wrap
  let y = height - 95;
  const bodySize = 9.2;
  const titleSize = 9.8;
  const lineH = 12;

  for (const b of blocks) {
    const isTitle = b.startsWith("ARTÍCULO");
    const f = isTitle ? bold : font;
    const s = isTitle ? titleSize : bodySize;

    const lines = wrapLines(b, maxW, f, s);
    for (const ln of lines) {
      page.drawText(ln, { x: marginX, y, size: s, font: f, color: rgb(0, 0, 0) });
      y -= lineH;
      if (y < 240) break; // dejamos espacio para sello
    }
    y -= 6; // espacio entre párrafos
    if (y < 240) break;
  }

  // --- Sello / Firma del asociado (abajo) ---
  const a = d.asociado as any;
  const lugar = upper(a.localidad, "RIO CUARTO");
  const fecha = fmtFechaLarga(new Date());
  const socio = pickSocioNro(a);
  const nombre = buildNombreApellido(a);
  const { tipo, nro } = pickDoc(a);

  const boxX = marginX;
  const boxW = maxW;
  const boxY = 60;
  const boxH = 160;

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0),
    color: rgb(1, 1, 1),
  });

  page.drawText(`Lugar y fecha: ${lugar} , ${fecha}`, {
    x: boxX + 12,
    y: boxY + boxH - 28,
    size: 10.5,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText("Firma del asociado:", {
    x: boxX + 12,
    y: boxY + boxH - 58,
    size: 10.5,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: boxX + 130, y: boxY + boxH - 60 },
    end: { x: boxX + boxW - 12, y: boxY + boxH - 60 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Datos del asociado preimpresos (como el ejemplo)
  const pie = `(${socio}) ${nombre}, documento ${tipo} Nº ${nro}`;
  page.drawText(pie, {
    x: boxX + 12,
    y: boxY + 18,
    size: 10,
    font: bold,
    color: rgb(0, 0, 0),
  });

  return await pdf.save();
}

export const nominaPEP: PdfTemplate = {
  id: "nomina-pep",
  label: "Nómina PEP + sello firma",
  filename: (d) => `nomina-pep-${d.asociado.id_asociado}.pdf`,
  render: async (d) => renderNominaPep(d),
};
