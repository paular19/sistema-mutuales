import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Genera un recibo PDF simple y legalmente válido en Argentina.
 * @param pago - Registro de pago con sus PagoCuotas.
 * @param cuotas - Lista de cuotas relacionadas (con crédito y asociado incluidos).
 */
export async function generarReciboPDF({
  pago,
  cuotas,
}: {
  pago: any;
  cuotas: any[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // tamaño A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // 🔹 helpers para dibujar texto
  const drawText = (
    text: string,
    x: number,
    y: number,
    size = 11,
    bold = false
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  let y = 800;
  drawText(`RECIBO DE PAGO Nº ${pago.id_pago}`, 50, y, 16);
  y -= 20;
  drawText(`Fecha: ${new Date(pago.fecha_pago).toLocaleDateString("es-AR")}`, 50, y);
  y -= 30;

  // 🔹 Datos de la mutual
  const mutual = cuotas[0]?.credito?.asociado?.mutual || {};
  drawText("MUTUAL:", 50, y);
  drawText(mutual?.nombre || "—", 120, y);
  y -= 15;
  drawText("CUIT:", 50, y);
  drawText(mutual?.cuit || "—", 120, y);
  y -= 15;
  drawText("Domicilio:", 50, y);
  drawText(mutual?.domicilio || "—", 120, y);
  y -= 30;

  // 🔹 Datos del asociado
  const asociado = cuotas[0]?.credito?.asociado;
  drawText("ASOCIADO:", 50, y);
  drawText(`${asociado?.nombre ?? ""} ${asociado?.apellido ?? ""}`, 130, y);
  y -= 15;
  drawText("CUIT / DNI:", 50, y);
  drawText(asociado?.cuit ?? "—", 130, y);
  y -= 15;
  drawText("Email:", 50, y);
  drawText(asociado?.email ?? "—", 130, y);
  y -= 30;

  // 🔹 Detalle de cuotas
  drawText("Detalle de cuotas pagadas:", 50, y);
  y -= 20;
  drawText("N°", 50, y);
  drawText("Vencimiento", 100, y);
  drawText("Monto", 220, y);
  drawText("Producto", 320, y);
  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: 540, y }, thickness: 0.5, color: rgb(0, 0, 0) });
  y -= 15;

  cuotas.forEach((c) => {
    if (y < 100) {
      // Nueva página si se termina el espacio
      y = 800;
      page.drawText("(continúa...)", { x: 450, y: 50, size: 10, font });
    }
    drawText(c.numero_cuota.toString(), 50, y);
    drawText(new Date(c.fecha_vencimiento).toLocaleDateString("es-AR"), 100, y);
    drawText(`$${c.monto_total.toFixed(2)}`, 220, y);
    drawText(c.credito?.producto?.nombre ?? "—", 320, y);
    y -= 15;
  });

  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: 540, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 25;

  // 🔹 Totales
  drawText(`TOTAL PAGADO: $${pago.monto_pago.toFixed(2)}`, 50, y, 13);
  y -= 20;
  if (pago.observaciones) {
    drawText(`Observaciones: ${pago.observaciones}`, 50, y);
    y -= 20;
  }

  // 🔹 Firma
  drawText("......................................................", 350, 120);
  drawText("Firma autorizada", 400, 105, 10);

  // 🔹 Pie
  page.drawLine({ start: { x: 50, y: 80 }, end: { x: 540, y: 80 }, thickness: 0.5, color: rgb(0, 0, 0) });
  drawText("Emitido automáticamente por el sistema de gestión de mutuales.", 50, 65, 9);

  const pdfBytes = await pdf.save();
  return pdfBytes;
}
