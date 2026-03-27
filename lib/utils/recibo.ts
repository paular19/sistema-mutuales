import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const HEADER_HEIGHT = 120;
const FOOTER_Y = 40;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 20;
const CONTENT_BOTTOM = 110;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value ?? 0);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR").format(date);
}

function safeText(value: unknown, fallback = "-") {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const normalized = safeText(text, "").replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    let fragment = word;
    while (fragment.length > 0) {
      let sliceLength = fragment.length;
      while (
        sliceLength > 1 &&
        font.widthOfTextAtSize(fragment.slice(0, sliceLength), size) > maxWidth
      ) {
        sliceLength -= 1;
      }

      lines.push(fragment.slice(0, sliceLength));
      fragment = fragment.slice(sliceLength);
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

type ReciboInput = {
  pago: any;
  cuotas: any[];
};

export async function generarReciboPDF({ pago, cuotas }: ReciboInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logoImage: Awaited<ReturnType<typeof pdf.embedJpg>> | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logosoberania.jpeg");
    const logoBytes = await readFile(logoPath);
    logoImage = await pdf.embedJpg(logoBytes);
  } catch {
    logoImage = null;
  }

  const mutual = cuotas[0]?.credito?.asociado?.mutual ?? null;
  const asociado = cuotas[0]?.credito?.asociado ?? null;
  const nombreAsociado =
    safeText(asociado?.razon_social, "") ||
    [asociado?.apellido, asociado?.nombre].filter(Boolean).join(" ") ||
    "-";

  let pageNumber = 0;
  let page: PDFPage;
  let y = CONTENT_TOP;

  const drawFooter = (currentPage: PDFPage) => {
    currentPage.drawLine({
      start: { x: MARGIN_X, y: FOOTER_Y + 18 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: FOOTER_Y + 18 },
      thickness: 0.6,
      color: rgb(0.78, 0.82, 0.8),
    });

    currentPage.drawText("Emitido automáticamente por el sistema de gestión de mutuales.", {
      x: MARGIN_X,
      y: FOOTER_Y,
      size: 8.5,
      font,
      color: rgb(0.34, 0.38, 0.36),
    });

    currentPage.drawText(`Página ${pageNumber}`, {
      x: PAGE_WIDTH - MARGIN_X - 42,
      y: FOOTER_Y,
      size: 8.5,
      font,
      color: rgb(0.34, 0.38, 0.36),
    });
  };

  const drawHeader = (currentPage: PDFPage) => {
    currentPage.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - HEADER_HEIGHT,
      width: PAGE_WIDTH,
      height: HEADER_HEIGHT,
      color: rgb(0.97, 0.98, 0.97),
    });

    if (logoImage) {
      const scaled = logoImage.scale(0.16);
      currentPage.drawImage(logoImage, {
        x: MARGIN_X,
        y: PAGE_HEIGHT - scaled.height - 22,
        width: scaled.width,
        height: scaled.height,
      });
    }

    currentPage.drawText("RECIBO DE COBRANZA", {
      x: 250,
      y: PAGE_HEIGHT - 42,
      size: 18,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.18),
    });

    currentPage.drawText(`N° ${safeText(pago?.id_pago)}`, {
      x: 250,
      y: PAGE_HEIGHT - 64,
      size: 11,
      font: fontBold,
      color: rgb(0.31, 0.74, 0.23),
    });

    currentPage.drawText(`Fecha de pago: ${formatDate(pago?.fecha_pago)}`, {
      x: 250,
      y: PAGE_HEIGHT - 82,
      size: 10,
      font,
      color: rgb(0.28, 0.31, 0.35),
    });

    currentPage.drawText(`Referencia: ${safeText(pago?.referencia)}`, {
      x: 250,
      y: PAGE_HEIGHT - 98,
      size: 10,
      font,
      color: rgb(0.28, 0.31, 0.35),
    });
  };

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber += 1;
    drawHeader(page);
    drawFooter(page);
    y = CONTENT_TOP;
  };

  const columns = [
    { label: "Cuota", x: MARGIN_X, width: 42, align: "left" as const },
    { label: "Crédito", x: 86, width: 52, align: "left" as const },
    { label: "Vencimiento", x: 146, width: 88, align: "left" as const },
    { label: "Producto", x: 240, width: 190, align: "left" as const },
    { label: "Monto", x: 442, width: 110, align: "right" as const },
  ];

  const drawTableHeader = () => {
    if (y - 28 < CONTENT_BOTTOM) {
      addPage();
    }

    page.drawRectangle({
      x: MARGIN_X,
      y: y - 6,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: 22,
      color: rgb(0.92, 0.96, 0.92),
    });

    for (const column of columns) {
      page.drawText(column.label, {
        x: column.x,
        y,
        size: 9.5,
        font: fontBold,
        color: rgb(0.12, 0.16, 0.14),
      });
    }

    y -= 24;
  };

  const ensureSpace = (neededHeight: number, withTableHeader = false) => {
    if (y - neededHeight >= CONTENT_BOTTOM) return;
    addPage();
    if (withTableHeader) {
      drawTableHeader();
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(24);
    page.drawText(title, {
      x: MARGIN_X,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.18),
    });
    y -= 16;
    page.drawLine({
      start: { x: MARGIN_X, y: y + 4 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: y + 4 },
      thickness: 0.8,
      color: rgb(0.82, 0.86, 0.84),
    });
    y -= 10;
  };

  const drawField = (label: string, value: string, valueX: number, valueWidth: number) => {
    const lines = wrapText(value, font, 10.5, valueWidth);
    const height = Math.max(16, lines.length * 13);
    ensureSpace(height + 2);

    page.drawText(label, {
      x: MARGIN_X,
      y,
      size: 10.5,
      font: fontBold,
      color: rgb(0.16, 0.18, 0.2),
    });

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: valueX,
        y: y - index * 13,
        size: 10.5,
        font,
        color: rgb(0.16, 0.18, 0.2),
      });
    });

    y -= height;
  };

  const drawTableRow = (cuota: any, rowIndex: number) => {
    const values = [
      String(cuota?.numero_cuota ?? "-"),
      String(cuota?.id_credito ?? cuota?.credito?.id_credito ?? "-"),
      formatDate(cuota?.fecha_vencimiento),
      safeText(cuota?.credito?.producto?.nombre),
      formatCurrency(Number(cuota?.monto_total ?? 0)),
    ];

    const wrapped = values.map((value, index) => {
      const column = columns[index];
      return wrapText(value, font, 9.5, column.width);
    });

    const lineCount = Math.max(...wrapped.map((lines) => lines.length), 1);
    const rowHeight = lineCount * 12 + 10;
    ensureSpace(rowHeight, true);

    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 6,
        width: PAGE_WIDTH - MARGIN_X * 2,
        height: rowHeight,
        color: rgb(0.985, 0.99, 0.985),
      });
    }

    wrapped.forEach((lines, index) => {
      const column = columns[index];
      lines.forEach((line, lineIndex) => {
        const textWidth = font.widthOfTextAtSize(line, 9.5);
        const x =
          column.align === "right"
            ? column.x + column.width - textWidth
            : column.x;

        page.drawText(line, {
          x,
          y: y - lineIndex * 12,
          size: 9.5,
          font,
          color: rgb(0.16, 0.18, 0.2),
        });
      });
    });

    y -= rowHeight;
  };

  addPage();

  drawSectionTitle("Datos de la mutual");
  drawField("Mutual:", safeText(mutual?.nombre), 110, 420);
  drawField("CUIT:", safeText(mutual?.cuit), 110, 420);

  y -= 4;
  drawSectionTitle("Datos del asociado");
  drawField("Asociado:", nombreAsociado, 110, 420);
  drawField("CUIT / DNI:", safeText(asociado?.cuit), 110, 420);
  drawField("Email:", safeText(asociado?.email), 110, 420);

  y -= 4;
  drawSectionTitle("Detalle de cuotas cobradas");
  drawTableHeader();
  cuotas.forEach((cuota, index) => drawTableRow(cuota, index));

  y -= 12;
  ensureSpace(70);
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 1,
    color: rgb(0.78, 0.82, 0.8),
  });
  y -= 22;

  page.drawText(`Total pagado: ${formatCurrency(Number(pago?.monto_pago ?? 0))}`, {
    x: MARGIN_X,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.18),
  });

  y -= 24;

  const observaciones = safeText(pago?.observaciones, "");
  if (observaciones) {
    const obsLines = wrapText(observaciones, font, 10, 420);
    ensureSpace(obsLines.length * 12 + 20);
    page.drawText("Observaciones:", {
      x: MARGIN_X,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.16, 0.18, 0.2),
    });

    obsLines.forEach((line, index) => {
      page.drawText(line, {
        x: 130,
        y: y - index * 12,
        size: 10,
        font,
        color: rgb(0.16, 0.18, 0.2),
      });
    });

    y -= obsLines.length * 12 + 12;
  }

  ensureSpace(70);
  page.drawLine({
    start: { x: PAGE_WIDTH - 200, y: y - 16 },
    end: { x: PAGE_WIDTH - 60, y: y - 16 },
    thickness: 0.8,
    color: rgb(0.45, 0.47, 0.49),
  });
  page.drawText("Firma autorizada", {
    x: PAGE_WIDTH - 160,
    y: y - 34,
    size: 9.5,
    font,
    color: rgb(0.28, 0.31, 0.35),
  });

  return pdf.save();
}
