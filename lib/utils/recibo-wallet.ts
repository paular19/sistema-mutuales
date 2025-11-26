import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Genera un recibo PDF para ingreso de saldo en Wallet,
 * siguiendo el mismo estilo que generarReciboPDF.
 */
export async function generarReciboWalletPDF({
  pago,
  asociado,
  movimientos,
  saldoRestante,
  mutual,
}: {
  pago: any;
  asociado: any;
  movimientos: { id_cuota: number; monto: number; numero_cuota: number }[];
  saldoRestante: number;
  mutual: any;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const drawText = (
    text: string,
    x: number,
    y: number,
    size = 11
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

  // Encabezado
  drawText(`RECIBO DE WALLET Nº ${pago.id_pago}`, 50, y, 16);
  y -= 20;
  drawText(`Fecha: ${new Date(pago.fecha_pago).toLocaleDateString("es-AR")}`, 50, y);
  y -= 30;

  // Mutual
  drawText("MUTUAL:", 50, y);
  drawText(mutual?.nombre ?? "—", 120, y);
  y -= 15;
  drawText("CUIT:", 50, y);
  drawText(mutual?.cuit ?? "—", 120, y);
  y -= 30;

  // Asociado
  drawText("ASOCIADO:", 50, y);
  drawText(`${asociado.apellido} ${asociado.nombre}`, 130, y);
  y -= 15;
  drawText("CUIT / DNI:", 50, y);
  drawText(asociado.cuit ?? "—", 130, y);
  y -= 30;

  // Monto ingresado
  drawText(`Monto ingresado: $${pago.monto_pago.toFixed(2)}`, 50, y, 13);
  y -= 30;

  // Detalle de imputaciones
  drawText("Detalle de imputación:", 50, y);
  y -= 20;

  drawText("Cuota", 50, y);
  drawText("Monto imputado", 150, y);
  y -= 10;

  page.drawLine({
    start: { x: 50, y },
    end: { x: 540, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  y -= 15;

  movimientos.forEach((m) => {
    if (y < 100) {
      y = 800;
      page.drawText("(continúa...)", { x: 450, y: 50, size: 10 });
    }
    drawText(`#${m.numero_cuota}`, 50, y);
    drawText(`$${m.monto.toFixed(2)}`, 150, y);
    y -= 15;
  });

  y -= 20;
  page.drawLine({
    start: { x: 50, y },
    end: { x: 540, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  // Saldo restante
  drawText(`Saldo disponible restante: $${saldoRestante.toFixed(2)}`, 50, y, 13);
  y -= 30;

  // Firma
  drawText("......................................................", 350, 120);
  drawText("Firma autorizada", 400, 105, 10);

  // Pie
  page.drawLine({
    start: { x: 50, y: 80 },
    end: { x: 540, y: 80 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  drawText(
    "Emitido automáticamente por el sistema de gestión de mutuales.",
    50,
    65,
    9
  );

  return pdf.save();
}
