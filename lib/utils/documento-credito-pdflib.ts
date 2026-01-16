// src/lib/utils/documento-credito-pdflib.ts
import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Convenio } from "@prisma/client";

/** Tipado completo */
export type DatosDocumento = {
  credito: {
    id_credito: number;
    monto: number;
    numero_cuotas: number;
    tasa_interes: number;
    fecha_creacion: Date;
    primera_venc: Date;
    producto: { nombre: string };
  };
  asociado: {
    id_asociado: number;
    nombre?: string | null;
    apellido?: string | null;
    razon_social?: string | null;
    cuit?: string | null;

    telefono?: string | null;
    email?: string | null;

    calle?: string | null;
    numero_calle?: number | null;
    piso?: string | null;
    departamento?: string | null;

    localidad?: string | null;
    provincia?: string | null;
    codigo_postal?: string | null;

    convenio?: Convenio | null;

    fecha_nac?: string | null; // "YYYY-MM-DD" o "DD-MM-YYYY"
    estado_civil?: string | null;
    lugar_nacimiento?: string | null;

    socio_nro?: string | null;
    codigo_externo?: string | null;
    convenio_numero?: string | null;

    [k: string]: any;
  };
  mutual: {
    nombre: string;
    cuit?: string | null;
  };
};

/* ----------------- helpers ----------------- */

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

function fmtConvenio(convenio?: string | null) {
  return upper(convenio).replace(/_/g, " ").trim();
}

function onlyDigits(v?: string | null) {
  return safe(v).replace(/\D/g, "");
}

function dniFromCuit(cuit?: string | null) {
  const d = onlyDigits(cuit);
  return d.length >= 10 ? d.slice(2, 10) : "";
}

function parseDateAny(v?: string | Date | null): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const s = v.trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yy = Number(m[3]);
    const d = new Date(yy, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fmtFechaLarga(v?: string | Date | null) {
  const d = parseDateAny(v);
  if (!d) return "";
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtFechaCorta(v?: string | Date | null) {
  const d = parseDateAny(v);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${dd}-${mm}-${yy}`;
}

/** pdf-lib usa origen abajo-izq; este helper te deja trabajar "desde arriba" */
function yFromTop(pageHeight: number, yTop: number) {
  return pageHeight - yTop;
}

/* ----------------- layout ----------------- */

const A4 = { w: 595.32, h: 841.92 };

const POS = {
  title: { x: 192.7, y: 34.0, size: 14 },
  cityDate: { x: 184.3, y: 69.2, size: 10 },
  convenioTop: { x: 221.3, y: 92.6, size: 10 },

  presi: { x: 34.6, y: 124.4, size: 10 },
  deMi: { x: 34.6, y: 147.0, size: 10 },

  datosPersonales: { x: 34.6, y: 268.2, size: 10 },

  nombreLbl: { x: 34.6, y: 291.6, size: 10 },
  estadoCivilLbl: { x: 34.6, y: 334.4, size: 10 },
  lugarNacLbl: { x: 34.6, y: 311.9, size: 10 },
  fechaLbl: { x: 332.3, y: 311.9, size: 10 },
  nupciasLbl: { x: 300.7, y: 334.4, size: 10 },
  conyugeLbl: { x: 34.6, y: 356.9, size: 10 },
  nacionalidadLbl: { x: 34.6, y: 377.1, size: 10 },
  profesionLbl: { x: 261.0, y: 377.1, size: 10 },
  padreLbl: { x: 34.6, y: 397.4, size: 10 },
  madreLbl: { x: 34.6, y: 418.9, size: 10 },
  domicilioLbl: { x: 34.6, y: 444.6, size: 10 },
  localidadLbl: { x: 204.0, y: 444.6, size: 10 },
  pciaLbl: { x: 334.6, y: 444.6, size: 10 },
  telLbl: { x: 432.8, y: 444.6, size: 10 },
  documentoLbl: { x: 34.6, y: 467.9, size: 10 },
  cuilLbl: { x: 204.0, y: 467.9, size: 10 },
  ivaLbl: { x: 374.3, y: 467.9, size: 10 },

  presentadoLbl: { x: 34.6, y: 607.0, size: 10 },
  firmaLbl: { x: 34.6, y: 632.1, size: 10 },
  aclaracionLbl: { x: 34.6, y: 654.6, size: 10 },

  observaciones: { x: 34.6, y: 674.9, size: 10 },
  resolucion: { x: 34.6, y: 716.9, size: 10 },

  reunionLinea: { x: 34.6, y: 739.4, size: 10 },
  acta: { x: 314.3, y: 739.4, size: 10 },
  socio: { x: 413.3, y: 739.4, size: 10 },

  firma2: { x: 34.6, y: 763.3, size: 10 },
  aclaracion2: { x: 34.6, y: 785.7, size: 10 },
};

async function generarSolicitudIngresoPDF(datos: DatosDocumento): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4.w, A4.h]);
  const { height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const draw = (text: string, p: { x: number; y: number; size: number }, bold = false) => {
    page.drawText(text, {
      x: p.x,
      y: yFromTop(height, p.y),
      size: p.size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  // ✅ recorta para que no se pise con labels
  const drawFit = (
    text: string,
    opts: { x: number; y: number; size: number; maxWidth: number },
    bold = false
  ) => {
    const f = bold ? fontBold : font;
    let t = safe(text);
    if (!t) return;

    const size = opts.size;
    const max = opts.maxWidth;

    const fits = () => f.widthOfTextAtSize(t, size) <= max;

    if (fits()) {
      page.drawText(t, { x: opts.x, y: yFromTop(height, opts.y), size, font: f, color: rgb(0, 0, 0) });
      return;
    }

    const ell = "…";
    while (t.length > 1 && f.widthOfTextAtSize(t + ell, size) > max) {
      t = t.slice(0, -1);
    }
    t = t.trimEnd();
    page.drawText(t + ell, { x: opts.x, y: yFromTop(height, opts.y), size, font: f, color: rgb(0, 0, 0) });
  };

  const line = (x1: number, yTop: number, x2: number) => {
    page.drawLine({
      start: { x: x1, y: yFromTop(height, yTop) },
      end: { x: x2, y: yFromTop(height, yTop) },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  };

  const a = datos.asociado;

  // ✅ Fecha del PDF = fecha actual de generación
  const fechaGeneracion = new Date();
  const fechaHeaderLarga = fmtFechaLarga(fechaGeneracion);
  const fechaHeaderCorta = fmtFechaCorta(fechaGeneracion);

  const nombreCompleto =
    upper(a.razon_social) || `${upper(a.apellido)} ${upper(a.nombre)}`.trim();

  const domicilio = [
    upper(a.calle),
    a.numero_calle ? String(a.numero_calle) : "",
    a.piso ? `PISO ${upper(a.piso)}` : "",
    a.departamento ? `DPTO ${upper(a.departamento)}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const dni = dniFromCuit(a.cuit);
  const cuit = safe(a.cuit);
  const tel = safe(a.telefono);
  const localidad = upper(a.localidad);
  const provincia = upper(a.provincia);

  const fechaNac = fmtFechaCorta(a.fecha_nac);

  const socioNro = safe(a.socio_nro) || safe(a.codigo_externo) || `${a.id_asociado}/00`;
  const convenioNumero = safe(a.convenio_numero) || safe(a.codigo_externo);

  const convenioNombre = fmtConvenio(a.convenio ?? null) || "—";

  const estadoCivil = upper(a.estado_civil);
  const lugarNacimiento = upper(a.lugar_nacimiento);

  // ----------------- HEADER -----------------
  draw("SOLICITUD DE INGRESO", POS.title, true);
  draw(`RIO CUARTO , ${fechaHeaderLarga}`, POS.cityDate, false);


  if (convenioNumero) {
    draw(`Convenio ${convenioNumero}`, POS.convenioTop, false);
  }

  draw("Al señor Presidente de la", POS.presi, false);
  draw("De mi consideración:", POS.deMi, false);

  // Intro
  draw(
    "Solicito al Señor Presidente y por su intermedio al Consejo Directivo de esa institución,",
    { x: 34.6, y: 165.8, size: 10 },
    false
  );
  draw(
    "ser admitido en carácter de asociado de la misma, a cuyo efecto declaro reunir las condiciones establecidas",
    { x: 34.6, y: 178.2, size: 10 },
    false
  );
  draw(
    "por los Estatutos, cuyo texto conozco y acepto.",
    { x: 34.6, y: 190.6, size: 10 },
    false
  );

  // ----------------- DATOS PERSONALES -----------------
  draw("DATOS PERSONALES", POS.datosPersonales, true);

  // Labels
  draw("Nombre", POS.nombreLbl, false);
  draw("Lugar de Nacimiento", POS.lugarNacLbl, false);
  draw("Fecha", POS.fechaLbl, false);
  draw("Estado Civil", POS.estadoCivilLbl, false);
  draw("Nupcias", POS.nupciasLbl, false);
  draw("Apellido y Nombre del/la cónyuge", POS.conyugeLbl, false);
  draw("Nacionalidad", POS.nacionalidadLbl, false);
  draw("Profesión o Actividad", POS.profesionLbl, false);
  draw("Apellido y Nombre del Padre", POS.padreLbl, false);
  draw("Apellido y Nombre de la Madre", POS.madreLbl, false);
  draw("Domicilio", POS.domicilioLbl, false);
  draw("Localidad", POS.localidadLbl, false);
  draw("Pcia.", POS.pciaLbl, false);
  draw("Tel.", POS.telLbl, false);
  draw("Documento", POS.documentoLbl, false);
  draw("C.U.I.L. O C.U.I.T.", POS.cuilLbl, false);
  draw("Condición I.V.A.", POS.ivaLbl, false);

  // Valores
  drawFit(nombreCompleto, { x: 110, y: 291.95, size: 10, maxWidth: 450 }, true);

  drawFit(lugarNacimiento, { x: 160, y: 312.2, size: 10, maxWidth: 150 }, true);
  drawFit(fechaNac, { x: 366.7, y: 312.2, size: 10, maxWidth: 120 }, true);

  drawFit(estadoCivil, { x: 120, y: 334.8, size: 10, maxWidth: 160 }, true);

  drawFit("ARGENTINO", { x: 145, y: 377.5, size: 10, maxWidth: 100 }, true);

  // ✅ Profesión o Actividad = Convenio (visible y sin pisar label)
  drawFit(convenioNombre, { x: 360.7, y: 377.5, size: 11, maxWidth: 220 }, true);

  drawFit(domicilio, { x: 110, y: 444.9, size: 10, maxWidth: 250 }, true);
  drawFit(localidad, { x: 250.6, y: 444.9, size: 10, maxWidth: 80 }, true);
  drawFit(provincia, { x: 360.7, y: 444.9, size: 10, maxWidth: 70 }, true);
  drawFit(tel, { x: 460.0, y: 444.9, size: 10, maxWidth: 110 }, true);

  drawFit(`DNI Nº ${dni}`, { x: 90.7, y: 467.5, size: 10, maxWidth: 110 }, true);
  drawFit(cuit, { x: 288.7, y: 467.5, size: 10, maxWidth: 120 }, true);
  drawFit("Consumidor final", { x: 450.8, y: 467.5, size: 10, maxWidth: 130 }, true);

  // Presentado / Firma / Aclaración (líneas)
  draw("Presentado por los Socios", POS.presentadoLbl, false);
  line(34.6, 615, 560);

  draw("Firma", POS.firmaLbl, false);
  line(80, 640, 560);

  draw("Aclaración", POS.aclaracionLbl, false);
  line(95, 662, 560);

  // Observaciones
  draw("OBSERVACIONES", POS.observaciones, false);
  draw("Resolución", POS.resolucion, false);
  line(110, 724, 560);

  // Reunión consejo directivo
  draw("REUNION CONSEJO DIRECTIVO  Fecha", POS.reunionLinea, false);
  draw("Acta Nº", POS.acta, false);
  draw("Socio Nº", POS.socio, false);

  drawFit(fechaHeaderCorta, { x: 225.7, y: 739.8, size: 10, maxWidth: 85 }, true);
  drawFit(socioNro, { x: 458.2, y: 739.8, size: 10, maxWidth: 100 }, true);

  draw("Firma", POS.firma2, false);
  line(80, 771, 560);

  draw("Aclaración", POS.aclaracion2, false);
  line(95, 794, 560);

  // Legal + firma final
  const legal =
    `"El titular de los datos brinda su consentimiento para que la Entidad ceda o transfiera los datos personales contenidos
en nuestras bases de datos en los términos de las leyes vigentes. Asimismo, de conformidad con las leyes vigentes,
el titular se notifica expresamente del derecho que le asiste a los efectos de acceder, rectificar y/o suprimir datos en
caso que estos sean inexactos o erróneos"`;

  const legalX = 34.6;
  const legalY = 560;
  const legalSize = 9;

  legal.split("\n").forEach((ln, i) => {
    page.drawText(ln, {
      x: legalX,
      y: yFromTop(height, legalY + i * 12),
      size: legalSize,
      font,
      color: rgb(0, 0, 0),
    });
  });

  page.drawText("FIRMA, Aclaración y DNI :", {
    x: 34.6,
    y: yFromTop(height, 805),
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  line(180, 813, 560);

  return await pdfDoc.save();
}

export async function generarDocumentoCredito(datos: DatosDocumento): Promise<Buffer> {
  const bytes = await generarSolicitudIngresoPDF(datos);
  return Buffer.from(bytes);
}

export function getNombreArchivoPDF(idCredito: number, convenio?: string | null): string {
  const convenioStr = convenio?.toLowerCase().replace(/_/g, "-") || "base";
  return `credito-${idCredito}-${convenioStr}.pdf`;
}
