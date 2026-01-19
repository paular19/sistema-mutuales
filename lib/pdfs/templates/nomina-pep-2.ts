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
    if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderNominaPep2(d: DatosDocumento): Promise<Uint8Array> {
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

  page.drawText("Resolución UIF Nº 35/2023", {
    x: marginX,
    y: height - 68,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  // --- Body (texto copiado del PDF 8) ---
  const blocks: string[] = [
    "ARTÍCULO 5°.- MEDIDAS A ADOPTAR EN RELACIÓN CON LAS PERSONAS EXPUESTAS POLÍTICAMENTE. (continuación)",
    "a) Obtener, de acuerdo con la normativa aplicable a cada Sujeto Obligado, la aprobación del Oficial de Cumplimiento, para iniciar las relaciones comerciales, o mantener las mismas con este tipo de clientes y sus beneficiarios finales.",
    "b) Adoptar las medidas razonables para poder establecer el origen de los fondos y del patrimonio.",
    "c) Adoptar las medidas de Debida Diligencia Reforzadas, que disponga la regulación específica vigente para cada Sujeto Obligado, en relación con este tipo de cliente y realizar el monitoreo continuado de la relación comercial.",
    "2) En los casos que se tratase de Personas Expuestas Políticamente nacionales, provinciales, municipales, de la Ciudad Autónoma de Buenos Aires o a las que se les haya encomendado una función de relevancia en una organización internacional (clientes o beneficiarios finales), que hayan sido calificados como clientes de riesgo alto, los Sujetos Obligados deberán cumplir con las medidas indicadas en los incisos a), b) y c) referidos precedentemente.",
    "Las Personas Expuestas Políticamente, a la que aluden los artículos 1° a 3° de la presente, mantendrán tal condición mientras ejerzan el cargo o desempeñen la función y hasta transcurridos DOS (2) años desde el cese en los mismos.",
    "Una vez cumplido el plazo de los DOS (2) años, el Sujeto Obligado deberá evaluar el nivel de riesgo del cliente o beneficiario final tomando en consideración la relevancia de la función desempeñada, la potestad de disposición y/o administración de fondos y la antigüedad en la función pública ejercida, entre otros factores de relevancia para el análisis del nivel de riesgo.",
    "Los requerimientos previstos en los puntos a) y b) descriptos precedentemente, serán aplicables a los vínculos de parentesco y a los allegados, según lo indicado en la presente resolución.",

    "ARTÍCULO 6°.- MANTENIMIENTO DE LA CONDICIÓN DE PERSONA EXPUESTA POLÍTICAMENTE",
    "Las Personas Expuestas Políticamente por parentesco o cercanía mantendrán su condición por el mismo tiempo que el de la persona con la que tienen o hayan tenido el vínculo.",

    "ARTÍCULO 7º.- ANÁLISIS DEL NIVEL DEL RIESGO Y MONITOREO DE PERSONAS EXPUESTAS POLÍTICAMENTE.",
    "Cada Sujeto Obligado deberá tomar medidas razonables para determinar si un cliente o beneficiario final es una Persona Expuesta Políticamente, al momento de iniciar o continuar con la relación comercial con estas, a cuyo efecto deberá contemplar -al menos- los siguientes parámetros:",
    "a) El objetivo y riesgo inherente de la relación comercial.",
    "b) Las características de las operaciones, considerando:",
    "1) La cuantía, naturaleza y complejidad de los productos o servicios comprendidos, canales de distribución, localización geográfica y países intervinientes en la operación u operaciones implicadas.",
    "2) El riesgo propio de las operaciones, como ser el uso de efectivo en forma intensiva, las transacciones de alto valor, la complejidad y diversidad de productos o servicios, el empleo de múltiples jurisdicciones, el uso de patrimonios de afectación y la dificultad de identificar al beneficiario final.",
    "3) El origen de los fondos u otros activos involucrados.",
    "c) Los actuales o potenciales conflictos de interés.",
    "Deberá asimismo tenerse en cuenta para el riesgo, el ejercicio de cargos sucesivos en la misma o diferente jurisdicción, su nivel jerárquico y relevancia de la persona que reúne la condición de Persona Expuesta Políticamente.",
    "En atención a lo expuesto, las Personas Expuestas Políticamente serán objeto de medidas de debida diligencia, adecuadas y proporcionales al riesgo asociado y a la operatoria involucrada.",
    "En todos los casos tendrán que implementarse reglas de control de operaciones y alertas automatizadas, de modo que resulte posible monitorear, en forma intensa y continua, la ejecución de operaciones y su adecuación al perfil del cliente, su nivel de riesgo y las posibles desviaciones en éste.",

    "ARTÍCULO 8º.- DECLARACIÓN JURADA DE PERSONAS EXPUESTAS POLÍTICAMENTE",
    "Los Sujetos Obligados enumerados en el artículo 20 de la Ley N° 25.246, deberán requerir a sus clientes, al momento de iniciar la relación contractual y al momento de modificar la condición de Persona Expuesta Políticamente (sea que empiece a revestir tal carácter o deje de serlo), que suscriban una declaración jurada en la que manifiesten si revisten o no dicha condición.",
    "A su vez, los clientes deberán informar la condición de Persona Expuesta Políticamente de los beneficiarios finales, en caso de corresponder.",
    "En forma previa a la firma de la declaración jurada de Persona Expuesta Políticamente, cada Sujeto Obligado deberá poner en conocimiento de su cliente el contenido de la presente Resolución a fin de que manifiesten si se encuentran incluidos en la nómina de personas establecidas en los artículos 1° a 4°.",
    "Cada Sujeto Obligado deberá adoptar las medidas razonables que le permitan verificar, en todos los casos, la condición de Persona Expuesta Políticamente de sus clientes y beneficiarios finales de éstos.",
    "La suscripción de la declaración jurada de Persona Expuesta Políticamente podrá ser realizada tanto presencialmente o a través de medios electrónicos o digitales, dejando constancia de las evidencias correspondientes.",

    "ARTÍCULO 9º.- VERIFICACIÓN DE LA CONDICIÓN DE PERSONAS EXPUESTAS POLÍTICAMENTE.",
    "Podrán requerir información, o en su caso documentación, respecto de la actividad desarrollada por sus clientes, a efectos de determinar si el origen de los fondos involucrados en las operaciones se encuentra vinculado con el ejercicio de las funciones establecidas en los artículos 1° a 3° de la presente, o puedan provenir de una persona relacionada por parentesco o cercanía en los términos del artículo 4° de esta Resolución.",
    "La condición de Persona Expuesta Políticamente también podrá ser verificada mediante fuentes públicas de cualquier tipo, tales como las contenidas en boletines oficiales y registros, y por medio de fuentes privadas que por su reconocimiento y prestigio puedan brindar razonable certeza sobre la veracidad de su contenido (proveedores de información crediticia, servicios de validación de identidad, medios de prensa, entre otras).",
    "En todos los casos, los Sujetos Obligados deberán guardar las evidencias correspondientes de la verificación realizada.",

    "ARTÍCULO 10.- REQUERIMIENTOS ESPECIALES.",
    "ARTÍCULO 11.- ENTRADA EN VIGENCIA Y DEROGACIÓN.",
    "ARTÍCULO 12.- APLICACIÓN TEMPORAL.",
    "Para los procedimientos sumariales que se encuentren en trámite a la fecha de la entrada en vigencia, o bien, para el análisis y supervisión de hechos, circunstancias y cumplimientos ocurridos con anterioridad a dicha fecha, se aplicará la Resolución UIF N° 134/2018.",
    "ARTÍCULO 13.- Comuníquese, publíquese, dese a la Dirección Nacional del Registro Oficial y archívese.",

    "Juan Carlos Otero",
    "Fecha de publicación 02/03/2023",
  ];

  let y = height - 95;
  const bodySize = 9.2;
  const titleSize = 9.8;
  const lineH = 12;

  for (const b of blocks) {
    const isTitle = b.startsWith("ARTÍCULO");
    const isFooter = b === "Juan Carlos Otero" || b.startsWith("Fecha de publicación");
    const f = isTitle || isFooter ? bold : font;
    const s = isTitle ? titleSize : bodySize;

    const lines = wrapLines(b, maxW, f, s);
    for (const ln of lines) {
      page.drawText(ln, { x: marginX, y, size: s, font: f, color: rgb(0, 0, 0) });
      y -= lineH;
      if (y < 240) break; // espacio sello
    }
    y -= 6;
    if (y < 240) break;
  }

  // --- Sello / firma (abajo) ---
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

export const nominaPEP2: PdfTemplate = {
  id: "nomina-pep-2",
  label: "Nómina PEP (Art. 5 a 13) + sello",
  filename: (d) => `nomina-pep-2-${d.asociado.id_asociado}.pdf`,
  render: async (d) => renderNominaPep2(d),
};
