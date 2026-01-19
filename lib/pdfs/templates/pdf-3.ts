import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento, PdfTemplate } from "../types";

const A4 = { w: 595.32, h: 841.92 };

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function safe(v?: string | null, fallback = "—") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function upper(v?: string | null, fallback = "—") {
  return safe(v, fallback).toUpperCase();
}

function onlyDigits(v?: string | null) {
  return safe(v, "").replace(/\D/g, "");
}

function dniFromCuit(cuit?: string | null) {
  const d = onlyDigits(cuit);
  return d.length >= 10 ? d.slice(2, 10) : "";
}

function fmtFechaLarga(d: Date) {
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtConvenio(convenio?: any) {
  return safe(String(convenio ?? ""), "").toUpperCase().replace(/_/g, " ").trim();
}

function buildNombreCompleto(d: DatosDocumento) {
  const a = d.asociado;
  if (safe(a.razon_social, "") !== "") return upper(a.razon_social);
  const nom = `${upper(a.apellido, "")} ${upper(a.nombre, "")}`.trim();
  return nom.length ? nom : "—";
}

function buildDomicilio(d: DatosDocumento) {
  const a = d.asociado;
  const parts = [
    upper(a.calle, ""),
    a.numero_calle ? String(a.numero_calle) : "",
    a.piso ? `PISO ${upper(a.piso, "")}` : "",
    a.departamento ? `DPTO ${upper(a.departamento, "")}` : "",
  ].filter(Boolean);
  return parts.join(" ").trim() || "—";
}

function buildLocalidadLinea(d: DatosDocumento) {
  const a = d.asociado;
  const cp = safe(a.codigo_postal, "");
  const loc = upper(a.localidad, "");
  const prov = upper(a.provincia, "");

  if (cp && loc) return `${cp} - ${loc}`;
  if (loc && prov) return `${loc} - ${prov}`;
  return loc || prov || "—";
}

function buildAsociadoNro(d: DatosDocumento) {
  // ✅ Siempre existe
  return String(d.asociado.id_asociado ?? "—");
}

function buildCuentaNro(d: DatosDocumento) {
  // ✅ Si tenés un número externo lo usamos, sino repetimos id_asociado
  const a = d.asociado;
  const ext = safe(a.codigo_externo, "");
  return ext || String(a.id_asociado ?? "—");
}

function wrapLines(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) cur = test;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function renderDeclaracionJuradaLey25426(d: DatosDocumento): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4.w, A4.h]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 45;
  const maxW = width - marginX * 2;

  let y = height - 70;

  const drawParagraph = (t: string, size = 10, bold = false, extraGap = 3) => {
    const f = bold ? fontBold : font;
    const lines = wrapLines(t, f, size, maxW);
    for (const ln of lines) {
      page.drawText(ln, {
        x: marginX,
        y,
        size,
        font: f,
        color: rgb(0, 0, 0),
      });
      y -= size + extraGap;
    }
  };

  const gap = (px: number) => (y -= px);

  // ✅ helper: dibuja “fit” en una sola línea recortando con …
  const drawFitAt = (
    text: string,
    x: number,
    y0: number,
    size: number,
    maxWidth: number,
    bold = false
  ) => {
    const f = bold ? fontBold : font;
    let t = safe(text, "—");
    if (!t) t = "—";

    const fits = () => f.widthOfTextAtSize(t, size) <= maxWidth;
    if (!fits()) {
      const ell = "…";
      while (t.length > 1 && f.widthOfTextAtSize(t + ell, size) > maxWidth) {
        t = t.slice(0, -1);
      }
      t = t.trimEnd() + "…";
    }

    page.drawText(t, {
      x,
      y: y0,
      size,
      font: f,
      color: rgb(0, 0, 0),
    });
  };

  // ========= Datos =========
  const hoy = new Date(); // fecha generación
  const fecha = `RIO CUARTO , ${fmtFechaLarga(hoy)}`;

  const convenioNombre = fmtConvenio(d.asociado.convenio) || "—";
  const nombre = buildNombreCompleto(d);
  const domicilio = buildDomicilio(d);
  const localidadLinea = buildLocalidadLinea(d);

  const dni = dniFromCuit(d.asociado.cuit);
  const cuit = safe(d.asociado.cuit, "—");

  const asociadoNro = buildAsociadoNro(d);
  const cuentaNro = buildCuentaNro(d);

  // ========= Cuerpo =========
  drawParagraph("Sr. Presidente de la", 11);
  drawParagraph("De mi / nuestra consideración:", 11);
  gap(6);

  drawParagraph(
    `Declaro/mos bajo juramento que las operaciones canalizadas a través de la Cuenta Personal de Ahorro / Ahorro Mutual a Término / Ayuda Económica abierta en vuestro Departamento de Ayuda Económica se originan con fondos provenientes de mi / nuestra actividad de ${convenioNombre}.`,
    10
  );
  gap(6);

  drawParagraph(
    "Por otra parte me/nos comprometemos a informarles cualquier modificación que pueda producirse respecto de la información señalada.-",
    10
  );
  gap(6);

  drawParagraph(
    "Atento a lo dispuesto por la Ley Nº 25.246 declaramos bajo juramento que los fondos cursados a través del Departamento de Ayuda Económica son legítimos y de mí / nuestra propiedad.-",
    10
  );

  gap(18);

  // Línea firma
  page.drawText("Firma del Asociado", { x: marginX, y, size: 10, font, color: rgb(0, 0, 0) });
  page.drawLine({
    start: { x: marginX, y: y - 6 },
    end: { x: marginX + 220, y: y - 6 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  gap(22);

  page.drawText(fecha, { x: marginX, y, size: 10, font, color: rgb(0, 0, 0) });
  gap(14);
  page.drawText(convenioNombre, { x: marginX, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  gap(14);
  page.drawText("ASOCIACIÓN MUTUAL SOBERANIA", { x: marginX, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
  gap(12);
  page.drawText("RIO CUARTO", { x: marginX, y, size: 10, font, color: rgb(0, 0, 0) });
  gap(14);

  // Texto legal (chico)
  const legal1 =
    `Nota: Articulo 2º: Sustitúyese el artículo 277 del Código Penal, por el siguiente: Artículo 277...`;
  const legal2 =
    `Articulo 3º : Sustitúyese el artículo 278 del Código Penal, por el siguiente: Artículo 278...`;

  drawParagraph(legal1, 7.2, false, 2);
  gap(6);
  drawParagraph(legal2, 7.2, false, 2);

  // ========= Cuadro final (SIEMPRE VISIBLE) =========
  // Usamos coordenadas ABSOLUTAS desde abajo (pdf-lib)
  const baseY = 120;

  const label = (t: string, x: number, y0: number) =>
    page.drawText(t, { x, y: y0, size: 9, font: fontBold, color: rgb(0, 0, 0) });

  label("Asociado Nº:", marginX, baseY);
  label("Cta. Nº", marginX + 145, baseY);

  label("Apellido y Nombre", marginX, baseY - 16);
  label("Domicilio", marginX, baseY - 32);
  label("Localidad", marginX, baseY - 48);
  label("Tipo y Nº de Documento", marginX, baseY - 64);
  label("C.U.I.T. Nº", marginX, baseY - 80);

  // Valores (con recorte si son largos)
  drawFitAt(asociadoNro, marginX + 80, baseY, 9, 60, false);
  drawFitAt(cuentaNro, marginX + 200, baseY, 9, 90, false);

  drawFitAt(nombre, marginX + 140, baseY - 16, 9, 380, false);
  drawFitAt(domicilio, marginX + 85, baseY - 32, 9, 435, false);
  drawFitAt(localidadLinea, marginX + 75, baseY - 48, 9, 445, false);

  drawFitAt(`DNI ${dni || "—"}`, marginX + 165, baseY - 64, 9, 200, false);
  drawFitAt(cuit, marginX + 80, baseY - 80, 9, 220, false);

  return await pdfDoc.save();
}

export const pdf3: PdfTemplate = {
  id: "pdf-3",
  label: "Declaración jurada (Ley 25.246)",
  filename: (d: DatosDocumento) => `declaracion-jurada-${d.credito.id_credito}.pdf`,
  render: async (d: DatosDocumento) => renderDeclaracionJuradaLey25426(d),
};
