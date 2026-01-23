// src/lib/pdf/templates/notificacion-ley-24240.ts
import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento } from "@/lib/utils/documento-credito-pdflib";
import { PdfTemplate } from "../types";

const A4 = { w: 595.32, h: 841.92 };

/* ----------------- helpers ----------------- */

function safe(v?: any, fallback = "") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function onlyDigits(v?: string | null) {
  return safe(v).replace(/\D/g, "");
}

function dniFromCuit(cuit?: string | null) {
  const d = onlyDigits(cuit);
  return d.length >= 10 ? d.slice(2, 10) : "";
}

function yFromTop(pageHeight: number, yTop: number) {
  return pageHeight - yTop;
}

function money(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFechaLargaRioCuarto(d?: Date | string | null) {
  const dt = d instanceof Date ? d : d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return safe(d);
  const months = [
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
  return `RIO CUARTO , ${dt.getDate()} de ${months[dt.getMonth()]} de ${dt.getFullYear()}`;
}

function fmtFechaCorta(d?: Date | string | null) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return safe(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear());
  return `${dd}-${mm}-${yy}`;
}

/* ----------------- extras (sin tocar tu type) ----------------- */

function getExtras(datos: DatosDocumento) {
  const anyD = datos as any;
  const anyC = datos.credito as any;

  const liquidacionNro =
    anyD?.liquidacion?.nroLiquidacion ??
    anyD?.nroLiquidacion ??
    anyD?.liquidacionNro ??
    anyC?.nroLiquidacion ??
    datos.credito.id_credito;

  const ayudaNro =
    anyD?.liquidacion?.nroAyuda ??
    anyD?.nroAyuda ??
    anyD?.ayudaEconomicaNro ??
    anyC?.nroAyuda ??
    datos.credito.id_credito;

  const fecha =
    anyD?.liquidacion?.fecha ??
    anyD?.fecha ??
    anyC?.fecha_liquidacion ??
    datos.credito.fecha_creacion;

  // cuota exacta (monto_total)
  const cuotaExacta = Number(anyC?.monto_total ?? anyD?.monto_total ?? anyD?.cuota_monto ?? NaN);

  // vencimiento 1er cuota
  const vencPrimera =
    anyC?.vencimiento_primera_cuota ?? anyD?.vencimiento_primera_cuota ?? datos.credito.primera_venc;

  // desglose opcional
  const capitalCuota = anyC?.capital_cuota ?? anyD?.capital_cuota;
  const tasaServicioCuota = anyC?.tasa_servicio_cuota ?? anyD?.tasa_servicio_cuota;

  const asociadoNro = safe(datos.asociado.socio_nro, safe(datos.asociado.codigo_externo, safe(datos.asociado.id_asociado)));
  const codigoLinea = safe(datos.asociado.codigo_externo, asociadoNro);

  return {
    liquidacionNro: safe(liquidacionNro),
    ayudaNro: safe(ayudaNro),
    fecha,
    cuotaExacta: Number.isFinite(cuotaExacta) ? cuotaExacta : undefined,
    vencPrimera,
    capitalCuota: capitalCuota != null ? Number(capitalCuota) : undefined,
    tasaServicioCuota: tasaServicioCuota != null ? Number(tasaServicioCuota) : undefined,
    asociadoNro,
    codigoLinea,
  };
}

/* ----------------- layout ----------------- */

function drawCopy(
  page: any,
  datos: DatosDocumento,
  topY: number,
  fonts: { regular: any; bold: any }
) {
  const { height } = page.getSize();
  const font = fonts.regular;
  const bold = fonts.bold;

  const marginX = 48;
  const maxW = A4.w - marginX * 2;

  const draw = (text: string, x: number, y: number, size = 10, isBold = false) => {
    page.drawText(safe(text), {
      x,
      y: yFromTop(height, y),
      size,
      font: isBold ? bold : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawWrap = (text: string, x: number, y: number, size: number, leading: number, width: number) => {
    const words = safe(text).replace(/\s+/g, " ").trim().split(" ");
    let line = "";
    let yy = y;

    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) <= width) {
        line = test;
      } else {
        if (line) draw(line, x, yy, size, false);
        yy += leading;
        line = w;
      }
    }
    if (line) draw(line, x, yy, size, false);
    return yy + leading;
  };

  const ex = getExtras(datos);

  // tasa anual (en el PDF) — fallback/hardcode a 115.00% si no viene o es 0
  const tasaServicioAnual = Number(datos.credito.tasa_interes) || 115.0;

  // cuota: monto_total si viene; sino fallback
  const cuotaValor =
    ex.cuotaExacta ??
    (datos.credito.numero_cuotas ? datos.credito.monto / datos.credito.numero_cuotas : undefined);

  // --- HEADER ---
  draw(datos.mutual.nombre, marginX, topY, 11, true);
  draw(fmtFechaLargaRioCuarto(ex.fecha), marginX, topY + 18, 10, false);

  draw(`Liquidación Nº ${ex.liquidacionNro}`, marginX, topY + 36, 10, false);
  draw("NOTIFICACION LEY 24240", marginX, topY + 54, 11, true);
  draw(`Ayuda Económica Nº ${ex.ayudaNro}`, marginX, topY + 72, 10, false);

  // columna derecha (código y asociado nro)
  draw(ex.codigoLinea, marginX + maxW - 140, topY + 98, 10, false);
  draw("Asociado Nº", marginX + maxW - 140, topY + 124, 10, false);
  draw(ex.asociadoNro, marginX + maxW - 65, topY + 124, 10, false);

  // --- CUERPO ---
  let y = topY + 98;

  y = drawWrap(
    `Por la presente la ${datos.mutual.nombre} me notifica en referencia a la`,
    marginX,
    y,
    10,
    12,
    maxW - 170
  );

  y = drawWrap(
    `Ayuda Económica N° ${ex.ayudaNro} que:`,
    marginX,
    y,
    10,
    12,
    maxW - 170
  );

  y += 4;

  draw(`- Devenga una tasa de servicio del ${tasaServicioAnual.toFixed(2)} % anual.-`, marginX, y, 10, false);
  y += 14;

  draw(
    `- En caso mora en el pago devengará un interés punitorio del 50% de la tasa de servicio.-`,
    marginX,
    y,
    10,
    false
  );
  y += 14;

  const cuotas = datos.credito.numero_cuotas;
  const venc1Fmt = fmtFechaCorta(ex.vencPrimera);

  draw(
    `- Cantidad de cuotas ${cuotas} mensuales, iguales y consecutivas de ${money(cuotaValor)} vencimiento 1er. cuota ${venc1Fmt}`,
    marginX,
    y,
    10,
    false
  );
  y += 14;

  draw(`  las demás en los meses subsiguientes.-`, marginX, y, 10, false);
  y += 14;

  if (ex.capitalCuota != null || ex.tasaServicioCuota != null) {
    draw(
      `- Constitución de la cuota: $ ${money(ex.capitalCuota ?? 0)} capital - $ ${money(ex.tasaServicioCuota ?? 0)} tasa de servicio.-`,
      marginX,
      y,
      10,
      false
    );
  } else {
    draw(`- Constitución de la cuota:`, marginX, y, 10, false);
  }
  y += 18;

  y = drawWrap(
    `Acepto voluntariamente el contenido de la presente notificación, dando cumplimiento la Asociacion Mutual`,
    marginX,
    y,
    10,
    12,
    maxW
  );
  y = drawWrap(
    `${datos.mutual.nombre}. al art. 36 ley 24.240.-`,
    marginX,
    y,
    10,
    12,
    maxW
  );

  /* ----------------- FIRMAS (abajo, 2 columnas) -----------------
     En el PDF van ambas firmas abajo, una al lado de la otra.
     Lo hacemos “dinámico” para que nunca pise el texto:
     - sigLineY mínimo: topY + 310
     - sigLineY ideal: y + 16
     - sigLineY máximo: topY + 352 (para no salirse del bloque)
  --------------------------------------------------------------- */

  const minSig = topY + 310;
  const maxSig = topY + 352;
  const sigLineY = Math.min(maxSig, Math.max(minSig, y + 16));
  const sigLabelY = sigLineY + 14;

  const lineText = ".................................................";
  const lineSize = 10;
  const labelSize = 10;

  // posiciones horizontales (centradas en 2 columnas)
  const lineW = 200; // aprox
  const gap = 40;
  const totalW = lineW * 2 + gap;
  const startX = marginX + (maxW - totalW) / 2;

  const leftX = startX;
  const rightX = startX + lineW + gap;

  const centerUnder = (label: string, xLine: number) => {
    const w = font.widthOfTextAtSize(label, labelSize);
    return xLine + (lineW - w) / 2;
  };

  // línea punteada
  draw(lineText, leftX, sigLineY, lineSize, false);
  draw(lineText, rightX, sigLineY, lineSize, false);

  // labels
  draw("Firma Asociado", centerUnder("Firma Asociado", leftX), sigLabelY, labelSize, false);
  draw("Firma Garantía", centerUnder("Firma Garantía", rightX), sigLabelY, labelSize, false);
}

/* ----------------- template export ----------------- */

async function generarNotificacionLey24240PDF(datos: DatosDocumento): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4.w, A4.h]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Copia 1 (arriba)
  drawCopy(page, datos, 36, { regular: font, bold: fontBold });

  // Separador
  page.drawLine({
    start: { x: 42, y: yFromTop(A4.h, 420) },
    end: { x: A4.w - 42, y: yFromTop(A4.h, 420) },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  // Copia 2 (abajo)
  drawCopy(page, datos, 446, { regular: font, bold: fontBold });

  return await pdfDoc.save();
}

export const notificacionLey24240Template = {
  id: "notificacion-ley-24240",
  label: "Notificación Ley 24.240 (Art. 36)",
  filename: (d: DatosDocumento) => `notificacion-ley-24240-${d.credito.id_credito}.pdf`,
  render: (d: DatosDocumento) => generarNotificacionLey24240PDF(d),
} satisfies PdfTemplate;
