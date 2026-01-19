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
function onlyDigits(v?: any) {
  return safe(v).replace(/\D/g, "");
}
function yFromTop(pageHeight: number, yTop: number) {
  return pageHeight - yTop;
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function fmtFechaCorta(v: any) {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
function fmtFechaLarga(v: any) {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

// ✅ en el PDF se ve con miles "," y decimales "."
function moneyPdf(n: any) {
  const x = Number(n ?? 0);
  const v = isFinite(x) ? x : 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function dniFromCuit(cuit?: string | null) {
  const d = onlyDigits(cuit);
  return d.length >= 10 ? d.slice(2, 10) : "";
}

function buildNombreApellido(a: any) {
  if (safe(a.razon_social)) return upper(a.razon_social);
  const ap = safe(a.apellido);
  const no = safe(a.nombre);
  return upper([ap, no].filter(Boolean).join(" "));
}

// solicitante usa (en el ejemplo) un código tipo 50649 + nombre
function pickSolicitanteCodigo(a: any) {
  return safe(a.codigo_externo) || safe(a.socio_nro) || (a?.id_asociado ? String(a.id_asociado) : "");
}

// “Asociado Nº 360370/00” (en el ejemplo parece socio_nro)
function pickAsociadoNro(a: any) {
  return safe(a.socio_nro) || safe(a.codigo_externo) || (a?.id_asociado ? String(a.id_asociado) : "");
}

function buildDomicilio(a: any) {
  // en el ejemplo aparece en una sola línea, en mayúsculas
  const calle = safe(a.calle);
  const nro = a.numero_calle != null ? String(a.numero_calle) : "";
  const piso = safe(a.piso);
  const dpto = safe(a.departamento);
  const base = [calle, nro].filter(Boolean).join(" ");
  const extra = [piso ? `PISO ${piso}` : "", dpto ? `DPTO ${dpto}` : ""].filter(Boolean).join(" ");
  return upper([base, extra].filter(Boolean).join(" ").trim());
}

function buildLocalidad(a: any) {
  const cp = safe(a.codigo_postal);
  const loc = safe(a.localidad);
  const prov = safe(a.provincia);
  const left = cp ? `(${cp})` : "";
  return upper([left, loc && prov ? `${loc},${prov}` : loc || prov].filter(Boolean).join(" "));
}

// convenio/producto -> línea “clinica san rafael con gtia personal”
function fmtConvenioLikePdf(a: any, productoNombre?: string) {
  const convRaw = safe(a?.convenio).toLowerCase().replace(/_/g, " ").trim();
  const prodRaw = safe(productoNombre).toLowerCase().replace(/_/g, " ").trim();

  // preferimos convenio si existe, si no producto
  const base = convRaw || prodRaw;
  if (!base) return "";

  // en el ejemplo: "clinica san rafael con gtia personal"
  if (base.includes("san rafael")) return "clinica san rafael con gtia personal";
  if (base.includes("centro")) return "centro con gtia personal";
  if (base.includes("3") || base.includes("tres") || base.includes("abril")) return "3 de abril con gtia personal";

  // fallback: lo dejamos tal cual venga
  return base;
}

/* -------- número a letras (simple) -------- */
function numToWordsES(n: number): string {
  n = Math.floor(Math.abs(n));
  const u = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const d = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const c = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const teens: Record<number, string> = {
    11:"ONCE",12:"DOCE",13:"TRECE",14:"CATORCE",15:"QUINCE",
    16:"DIECISEIS",17:"DIECISIETE",18:"DIECIOCHO",19:"DIECINUEVE"
  };

  const two = (x: number) => {
    if (x < 10) return u[x];
    if (x === 10) return "DIEZ";
    if (x > 10 && x < 20) return teens[x] ?? "";
    if (x === 20) return "VEINTE";
    if (x > 20 && x < 30) return ("VEINTI" + u[x - 20].toLowerCase()).toUpperCase();
    const dd = Math.floor(x / 10);
    const uu = x % 10;
    return uu ? `${d[dd]} Y ${u[uu]}` : d[dd];
  };

  const three = (x: number) => {
    if (x === 0) return "";
    if (x === 100) return "CIEN";
    const cc = Math.floor(x / 100);
    const rr = x % 100;
    return [c[cc], two(rr)].filter(Boolean).join(" ").trim();
  };

  const parts: string[] = [];
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  if (millones) parts.push(millones === 1 ? "UN MILLON" : `${three(millones)} MILLONES`);
  if (miles) parts.push(miles === 1 ? "MIL" : `${three(miles)} MIL`);
  if (resto) parts.push(three(resto));

  return parts.join(" ").replace(/\s+/g, " ").trim() || "CERO";
}

function moneyToWordsLikePdf(amount: number) {
  const abs = Math.abs(amount);
  const entero = Math.floor(abs);
  const cent = Math.round((abs - entero) * 100);
  const centTxt = String(cent).padStart(2, "0");
  // en el PDF: "... C/ 56 centavos" (centavos en minúscula)
  return `${numToWordsES(entero)} C/ ${centTxt} centavos`;
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

async function render(d: DatosDocumento): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const a = d.asociado as any;
  const mutualName = safe(d.mutual?.nombre, "Asociación Mutual Soberania");
  const mutualUpper = upper(mutualName);

  // ✅ números como en el PDF
  const solicitudNro = (d.credito as any).codigo_externo ?? d.credito.id_credito; // Solicitud/Pagaré/Liquidación
  const ayudaNro = d.credito.id_credito; // Ayuda Económica
  const asociadoNro = `${pickAsociadoNro(a)}/00`;

  // ✅ solicitante
  const solicitante = `${pickSolicitanteCodigo(a)}-${buildNombreApellido(a)}`;

  // ✅ fecha emisión = fecha_creacion del crédito
  const fecha = fmtFechaCorta(d.credito.fecha_creacion);
  const fechaLarga = fmtFechaLarga(d.credito.fecha_creacion);

  // ✅ vencimiento = primera_venc
  const vencCorta = fmtFechaCorta(d.credito.primera_venc);
  const vencLarga = fmtFechaLarga(d.credito.primera_venc);

  // ✅ importes
  const monto = Number(d.credito.monto ?? 0);
  const montoFmt = moneyPdf(monto);
  const montoWords = moneyToWordsLikePdf(monto);

  const cuotas = Number(d.credito.numero_cuotas ?? 0) || 0;

  // ✅ doc/domicilio/localidad
  const dni = onlyDigits(a.dni) || dniFromCuit(a.cuit) || "";
  const domicilio = buildDomicilio(a);
  const localidad = buildLocalidad(a);

  // “con la fianza …”
  const fianza = fmtConvenioLikePdf(a, d.credito.producto?.nombre);

  const draw = (text: string, x: number, yTop: number, size: number, isBold = false) => {
    page.drawText(text, {
      x,
      y: yFromTop(height, yTop),
      size,
      font: isBold ? bold : font,
      color: rgb(0, 0, 0),
    });
  };

  const line = (x1: number, yTop: number, x2: number) => {
    page.drawLine({
      start: { x: x1, y: yFromTop(height, yTop) },
      end: { x: x2, y: yFromTop(height, yTop) },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  };

  /* =======================
     BLOQUE SUPERIOR (SOLICITUD)
     ======================= */

  // Títulos centrados (2 líneas)
  draw(mutualName, 195.7, 52.1, 16, true);
  draw(mutualName, 244.6, 85.3, 9.5, true);

  // "Solicitud Nº: 338"
  draw("Solicitud Nº:", 49.2, 108.5, 10.5, true);
  draw(String(solicitudNro), 135.0, 108.5, 10.5, false);

  // "Solicitante: ...   Fecha: ..."
  draw(`Solicitante: ${solicitante}`, 193.2, 107.0, 9.5, false);
  draw(`Fecha: ${fecha}`, 455.0, 107.0, 9.5, false);

  // "Solicito una ayuda..."
  draw(`Solicito una ayuda económica AMORTIZABLE en CUOTAS de $${montoFmt}`, 50.0, 120.5, 9.5, false);

  // monto en letras
  draw(montoWords, 51.5, 134.7, 9.5, false);

  // "con la fianza ..."
  if (fianza) draw(`con la fianza  ${fianza}`, 51.5, 146.7, 9.5, false);

  // Pagaderos en  5  cuotas...
  draw("Pagaderos en", 51.5, 158.5, 9.5, false);
  draw(String(cuotas), 122.8, 161.7, 9.5, false);
  draw("cuotas mensuales y consecutivas, cuyo destino será:", 145.0, 161.7, 9.5, false);

  // GASTOS VARIOS
  draw("GASTOS VARIOS", 51.5, 176.0, 10.5, false);

  // Párrafo “Autorizamos …” (igual al PDF)
  const autoriza = [
    "Autorizamos expresamente en caso de mora en el primer cumplimiento de la obligación apicara al importe determinado en el presente",
    "titulo, una tasa de servicio equivalente al  115.0  % anual. A lo anterior se le adicionará una tasa punitoria que se conviene en el 50% del",
    "interés compensatorio pactado.",
  ];
  let yAuth = 237.6;
  for (const ln of autoriza) {
    draw(ln, 53.8, yAuth, 8.2, false);
    yAuth += 13.0;
  }

  // Firma bloque derecho (línea, label, nombre, dni, domicilio)
  draw(".................................................", 400.2, 326.3, 10, false);
  draw("Firma del Solicitante", 434.8, 334.5, 8.5, false);

  draw(solicitante, 417.5, 346.5, 8.8, true);
  draw(dni, 459.4, 359.2, 8.8, true);
  draw(domicilio || "—", 403.2, 372.6, 8.8, true);

  /* =======================
     BLOQUE INFERIOR (PAGARÉ / EMISIÓN)
     ======================= */

  // Encabezado grande (2 líneas)
  draw("Solicitud de Ayuda Económica - Emisión de Ayudas Económicas", 49.2, 430.0, 13.5, true);
  draw("Amortizables en $ sin Solicitud", 49.2, 446.5, 13.5, true);

  // Mutual x2
  draw(mutualName, 49.2, 459.6, 9.5, true);
  draw(mutualName, 49.2, 471.6, 9.5, true);

  // Pagaré + fecha (misma línea)
  draw(`Pagaré Nº ${solicitudNro}`, 49.2, 484.6, 10.5, true);
  draw(`RIO CUARTO , ${fechaLarga}`, 305.0, 484.6, 10.5, true);

  // Ayuda Económica Nº (izq)
  draw(`Ayuda Económica Nº ${ayudaNro}`, 49.2, 499.6, 10, false);

  // Asociado Nº (centro)
  draw(`Asociado Nº ${asociadoNro}`, 235.0, 499.6, 10, false);

  // Liquidación Nº (der)
  draw("Liquidación Nº", 370.0, 499.6, 10, false);
  draw(String(solicitudNro), 455.0, 499.6, 10, false);

  // Vencimiento + $ (fila siguiente)
  draw("Vencimiento", 49.2, 513.5, 10, false);
  draw(vencCorta, 140.0, 513.5, 10, true);

  draw("$", 405.0, 513.5, 10, false);
  draw(montoFmt, 420.0, 513.5, 10, true);

  // Texto pagaré
  draw(`El día ${vencLarga}`, 49.2, 528.2, 9.5, false);
  draw("PAGARE(MOS) sin protesto (art. 50 Dec.-Ley 5965/63) a la ASOCIACION MUTUAL", 210.0, 528.2, 9.5, false);

  draw(`${mutualUpper} o a su orden la cantidad de pesos :`, 49.2, 544.5, 9.5, false);

  // línea monto en letras + ($  539,083.56)
  draw(`${montoWords}($    ${montoFmt})`, 49.2, 556.0, 9.5, true);

  draw("por igual valor recibido en Ayuda Económica Mutual a mi/nuestra entera satisfacción pagadero en San Martín 1515 -", 49.2, 570.5, 9.5, false);
  draw("Rio Cuarto (Cba.)", 49.2, 582.5, 9.5, false);

  // Datos solicitante (izq)
  draw("Solicitante:", 92.0, 602.2, 9, false);
  draw(solicitante, 134.0, 601.7, 9, true);

  draw("Calle :", 109.2, 613.5, 9, false);
  draw(domicilio || "—", 134.0, 613.5, 9, true);

  draw("D.N.I. :", 107.8, 624.6, 9, false);
  draw(`DNI ${dni}`, 134.0, 624.1, 9, true);

  draw("Localidad :", 92.0, 635.9, 9, false);
  draw(localidad || "—", 134.0, 635.4, 9, true);

  // Firmas derecha (líneas punteadas + labels)
  draw("Firma del Solicitante", 394.2, 598.8, 9, false);
  draw(".................................................", 465.0, 598.8, 9, false);

  draw("Aclaración del Solicitante", 394.2, 623.5, 9, false);
  draw(".................................................", 485.0, 623.5, 9, false);

  draw("Tipo y Nº Doc. del Solicitante", 394.2, 645.4, 9, false);
  draw(".................................................", 510.0, 645.4, 9, false);

  // Tabla codeudor (líneas y encabezado)
  line(49.2, 658.0, 562.6);
  draw("Codeudor", 70.0, 658.7, 9, true);
  draw("Tipo y Nº de Doc.", 230.0, 658.7, 9, true);
  draw("Domicilio", 340.0, 658.7, 9, true);
  draw("Localidad", 435.0, 658.7, 9, true);
  draw("Teléfono", 515.0, 658.7, 9, true);
  line(49.2, 666.0, 562.6);

  return await pdf.save();
}

export const solicitudAyudaEconomicaPagare: PdfTemplate = {
  id: "solicitud-ayuda-economica-pagare",
  label: "Solicitud ayuda económica + pagaré (igual PDF)",
  filename: (d) => `solicitud-ayuda-pagare-${d.credito.id_credito}.pdf`,
  render: async (d) => render(d),
};

