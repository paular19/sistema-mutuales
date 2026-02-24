"use server";

import { getCancelacionDesdeLiquidacion } from "@/lib/queries/cancelacion";
import { getPreLiquidacion } from "@/lib/queries/liquidaciones";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

export interface ExportFilaLiquidacionCancelacion {
    asociado: string;
    numeroCuenta: string;
    numeroAyuda: number;
    fechaCierre: Date | string;
    monto: number;
    numeroCuota: number;
}

interface ExportOptions {
    productoId?: number;
    format: "xlsx" | "pdf";
}

function formatFecha(value: Date | string) {
    return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" }).format(new Date(value));
}

function toXlsxBuffer(rows: ExportFilaLiquidacionCancelacion[]) {
    const worksheetRows = rows.map((row) => ({
        Asociado: row.asociado,
        "Número de cuenta": row.numeroCuenta,
        "Número de ayuda": row.numeroAyuda,
        "Fecha de Cierre": formatFecha(row.fechaCierre),
        Monto: row.monto,
        "Número de cuota": row.numeroCuota,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detalle");

    return XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
    });
}

function fitText(value: string, maxLength: number) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

async function toPdfBuffer(title: string, rows: ExportFilaLiquidacionCancelacion[]) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const addPage = () => {
        const page = doc.addPage([842, 595]);
        return { page, width: page.getWidth(), height: page.getHeight() };
    };

    let { page, height } = addPage();
    let y = height - 40;

    page.drawText(title, {
        x: 32,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    y -= 22;
    page.drawText(`Generado: ${new Intl.DateTimeFormat("es-AR").format(new Date())}`, {
        x: 32,
        y,
        size: 9,
        font,
        color: rgb(0.35, 0.35, 0.35),
    });

    y -= 20;

    const header = [
        { label: "Asociado", x: 32 },
        { label: "N° Cuenta", x: 230 },
        { label: "N° Ayuda", x: 325 },
        { label: "Fecha de Cierre", x: 410 },
        { label: "Monto", x: 535 },
        { label: "N° Cuota", x: 645 },
    ];

    const drawHeader = () => {
        for (const h of header) {
            page.drawText(h.label, { x: h.x, y, size: 9, font: fontBold, color: rgb(0, 0, 0) });
        }
        y -= 14;
    };

    drawHeader();

    for (const row of rows) {
        if (y < 36) {
            ({ page, height } = addPage());
            y = height - 40;
            drawHeader();
        }

        page.drawText(fitText(row.asociado || "", 36), {
            x: 32,
            y,
            size: 8.5,
            font,
            color: rgb(0, 0, 0),
        });

        page.drawText(fitText(String(row.numeroCuenta ?? ""), 14), {
            x: 230,
            y,
            size: 8.5,
            font,
            color: rgb(0, 0, 0),
        });

        page.drawText(String(row.numeroAyuda ?? ""), {
            x: 325,
            y,
            size: 8.5,
            font,
            color: rgb(0, 0, 0),
        });

        page.drawText(formatFecha(row.fechaCierre), {
            x: 410,
            y,
            size: 8.5,
            font,
            color: rgb(0, 0, 0),
        });

        page.drawText(
            new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
            }).format(row.monto),
            {
                x: 535,
                y,
                size: 8.5,
                font,
                color: rgb(0, 0, 0),
            }
        );

        page.drawText(String(row.numeroCuota ?? ""), {
            x: 655,
            y,
            size: 8.5,
            font,
            color: rgb(0, 0, 0),
        });

        y -= 13;
    }

    return Buffer.from(await doc.save());
}

function currentDateKey() {
    return new Intl.DateTimeFormat("sv-SE").format(new Date());
}

export async function exportLiquidacionesAction(options: ExportOptions) {
    const data = await getPreLiquidacion({ productoId: options.productoId });

    const rows: ExportFilaLiquidacionCancelacion[] = data.cuotas.map((cuota) => ({
        asociado: cuota.asociado,
        numeroCuenta: cuota.numero_cuenta,
        numeroAyuda: cuota.numero_ayuda,
        fechaCierre: cuota.fecha_vencimiento,
        monto: cuota.monto_total,
        numeroCuota: cuota.numero_cuota,
    }));

    const dateKey = currentDateKey();

    if (options.format === "pdf") {
        const buffer = await toPdfBuffer("Liquidaciones", rows);
        return {
            buffer,
            filename: `liquidaciones-${dateKey}.pdf`,
            contentType: "application/pdf",
        };
    }

    const buffer = toXlsxBuffer(rows);
    return {
        buffer,
        filename: `liquidaciones-${dateKey}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
}

export async function exportCancelacionesAction(options: ExportOptions) {
    const data = await getCancelacionDesdeLiquidacion({ productoId: options.productoId });

    const rows: ExportFilaLiquidacionCancelacion[] = !data
        ? []
        : [...data.cuotasPagadas, ...data.cuotasPendientes].map((cuota) => ({
            asociado: cuota.asociado ?? "",
            numeroCuenta: cuota.numero_cuenta,
            numeroAyuda: cuota.numero_ayuda,
            fechaCierre: cuota.fecha_vencimiento,
            monto: cuota.monto_total,
            numeroCuota: cuota.numero_cuota,
        }));

    const dateKey = currentDateKey();

    if (options.format === "pdf") {
        const buffer = await toPdfBuffer("Cancelaciones", rows);
        return {
            buffer,
            filename: `cancelaciones-${dateKey}.pdf`,
            contentType: "application/pdf",
        };
    }

    const buffer = toXlsxBuffer(rows);
    return {
        buffer,
        filename: `cancelaciones-${dateKey}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
}
