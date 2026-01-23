import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type DatosDocumento = any;

const A4 = { w: 595.32, h: 841.92 };

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

function parseDateAny(v?: string | Date | null): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

    const s = v.trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + "T00:00:00");
        return isNaN(d.getTime()) ? null : d;
    }

    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
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

function fmtFechaCorta(v?: string | Date | null) {
    const d = parseDateAny(v);
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear());
    return `${dd}-${mm}-${yy}`;
}

function yFromTop(pageHeight: number, yTop: number) {
    return pageHeight - yTop;
}

function money(n?: number | null) {
    if (n == null || Number.isNaN(n)) return "";
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n?: number | null, digits = 4) {
    if (n == null || Number.isNaN(n)) return "";
    return n.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function pct2(n?: number | null) {
    if (n == null || Number.isNaN(n)) return "";
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getExtras(datos: DatosDocumento) {
    const anyD = datos as any;

    const nroAyuda = anyD?.liquidacion?.nroAyuda ?? anyD?.nroAyuda ?? (datos.credito as any)?.nroAyuda;
    const nroLiquidacion = anyD?.liquidacion?.nroLiquidacion ?? anyD?.nroLiquidacion ?? (datos.credito as any)?.nroLiquidacion;

    const tasaExtraLabel = anyD?.liquidacion?.tasaExtraLabel ?? anyD?.tasaExtraLabel ?? (datos.credito as any)?.tasaExtraLabel ?? "CFT";

    const tasaExtraPct = anyD?.liquidacion?.tasaExtraPct ?? anyD?.tasaExtraPct ?? (datos.credito as any)?.tasaExtraPct;

    const deducciones: any[] = anyD?.liquidacion?.deducciones ?? anyD?.deducciones ?? (datos.credito as any)?.deducciones ?? [];

    const totalDeducciones =
        anyD?.liquidacion?.totalDeducciones ?? anyD?.totalDeducciones ?? (datos.credito as any)?.totalDeducciones ??
        (deducciones.length ? deducciones.reduce((a: number, i: any) => a + (Number(i.importe) || 0), 0) : undefined);

    const importeNetoPercibir =
        anyD?.liquidacion?.importeNetoPercibir ?? anyD?.importeNetoPercibir ?? (datos.credito as any)?.importeNetoPercibir ??
        (typeof totalDeducciones === "number" ? datos.credito.monto - totalDeducciones : undefined);

    const cuotaMensual =
        anyD?.liquidacion?.cuotaMensual ?? anyD?.cuotaMensual ?? (datos.credito as any)?.cuotaMensual ??
        (datos.credito.numero_cuotas ? datos.credito.monto / datos.credito.numero_cuotas : undefined);

    return {
        nroAyuda,
        nroLiquidacion,
        tasaExtraLabel,
        tasaExtraPct,
        deducciones,
        totalDeducciones,
        importeNetoPercibir,
        cuotaMensual,
    };
}

function drawHr(page: any, x: number, y: number, w: number) {
    page.drawLine({
        start: { x, y },
        end: { x: x + w, y },
        thickness: 1,
        color: rgb(0.75, 0.75, 0.75),
    });
}

function drawSignatureBlock(page: any, height: number, x: number, yTop: number, w: number, font: any) {
    const fs = 9;

    page.drawText(
        "Conste que doy mi conformidad a la presente liquidación, recibiendo un ejemplar y el importe correspondiente.",
        { x, y: yFromTop(height, yTop), size: fs, font, color: rgb(0, 0, 0) }
    );

    const lineY1 = yTop + 24;
    page.drawText("Firma del Asociado", { x, y: yFromTop(height, lineY1), size: fs, font });
    page.drawLine({ start: { x, y: yFromTop(height, lineY1 + 12) }, end: { x: x + w * 0.48, y: yFromTop(height, lineY1 + 12) }, thickness: 1, color: rgb(0, 0, 0) });

    page.drawText("Sello y firma de la Mutual", { x: x + w * 0.52, y: yFromTop(height, lineY1), size: fs, font });
    page.drawLine({ start: { x: x + w * 0.52, y: yFromTop(height, lineY1 + 12) }, end: { x: x + w, y: yFromTop(height, lineY1 + 12) }, thickness: 1, color: rgb(0, 0, 0) });

    page.drawText(".................................................", { x, y: yFromTop(height, lineY1 + 30), size: fs, font });
    page.drawText(".................................................", { x: x + w * 0.52, y: yFromTop(height, lineY1 + 30), size: fs, font });
}

function drawCopy(page: any, datos: DatosDocumento, topY: number, copyLabel: "ORIGINAL" | "DUPLICADO", fonts: { regular: any; bold: any }) {
    const { height } = page.getSize();
    const marginX = 42;
    const blockW = A4.w - marginX * 2;

    const font = fonts.regular;
    const bold = fonts.bold;

    const draw = (text: string, x: number, yTop: number, size: number, isBold = false) => {
        page.drawText(safe(text), { x, y: yFromTop(height, yTop), size, font: isBold ? bold : font, color: rgb(0, 0, 0) });
    };

    const drawFit = (text: string, x: number, yTop: number, size: number, maxWidth: number, isBold = false) => {
        const f = isBold ? bold : font;
        let t = safe(text);
        if (!t) return;
        const fits = () => f.widthOfTextAtSize(t, size) <= maxWidth;
        if (fits()) {
            page.drawText(t, { x, y: yFromTop(height, yTop), size, font: f, color: rgb(0, 0, 0) });
            return;
        }
        const ell = "…";
        while (t.length > 1 && f.widthOfTextAtSize(t + ell, size) > maxWidth) t = t.slice(0, -1);
        t = t.trimEnd();
        page.drawText(t + ell, { x, y: yFromTop(height, yTop), size, font: f, color: rgb(0, 0, 0) });
    };

    const a = datos.asociado;
    const c = datos.credito;
    const m = datos.mutual;

    const extras = getExtras(datos);

    const fecha = fmtFechaCorta((extras as any).fecha ?? (c as any).fecha_liquidacion ?? c.fecha_creacion);
    const nroAyuda = safe(extras.nroAyuda, safe(c.id_credito));
    const nroLiquidacion = safe(extras.nroLiquidacion, safe(c.id_credito));

    const nombreCompleto = safe(a.razon_social) || [safe(a.apellido).toUpperCase(), safe(a.nombre).toUpperCase()].filter(Boolean).join(" ").trim();

    const asociadoNumero = safe(a.socio_nro, safe(a.codigo_externo, safe(a.id_asociado)));
    const cuentaNumero = safe(a.codigo_externo, safe(a.convenio_numero, ""));
    const dni = dniFromCuit(a.cuit);

    const tasaAnualPct = Number(c.tasa_interes) || 115.0;

    const montoSolicitado = Number(c.monto);
    const cuotaMensual = extras.cuotaMensual;
    const formaPagoTexto = `${c.numero_cuotas} cuotas mensuales de $ ${money(cuotaMensual)} cada una.`;

    draw(copyLabel, marginX + blockW - 80, topY, 10, true);

    drawFit(safe(m.nombre, "Mutual"), marginX, topY, 10, blockW - 100, true);

    drawFit("Liquidación de Ayuda Económica - Emisión de Ayudas Económicas Amortizables", marginX, topY + 18, 11, blockW, true);

    drawHr(page, marginX, yFromTop(height, topY + 26), blockW);

    draw(`Fecha: ${fecha}`, marginX, topY + 42, 9, false);
    draw(`NºAyuda : ${nroAyuda}`, marginX + 170, topY + 42, 9, false);
    draw(`NºLiquidación: ${nroLiquidacion}`, marginX + 340, topY + 42, 9, false);

    drawFit(`Asociado: ${asociadoNumero}-${nombreCompleto}`, marginX, topY + 60, 9, blockW, true);

    draw(`Cta. Nº: ${cuentaNumero}`, marginX, topY + 76, 9, false);
    draw(`DNI: ${dni}`, marginX + 170, topY + 76, 9, false);

    draw(`Tasa Anual (%)  ${pct(tasaAnualPct)} %`, marginX, topY + 94, 9, false);

    if (extras.tasaExtraPct != null) {
        draw(`${safe(extras.tasaExtraLabel)}  ${pct2(Number(extras.tasaExtraPct))} %`, marginX + 260, topY + 94, 9, false);
    }

    draw(`Monto Total de Ayuda Económica Solicitada:  ${money(montoSolicitado)}`, marginX, topY + 112, 9, true);

    draw("Deducciones", marginX, topY + 134, 9, true);

    let yDed = topY + 150;
    const ded = extras.deducciones ?? [];

    if (!ded.length) {
        draw("-", marginX, yDed, 9, false);
        yDed += 14;
    } else {
        for (const item of ded.slice(0, 6)) {
            drawFit(safe(item.label), marginX, yDed, 9, 240, false);
            if (item.tasaPct != null) draw(pct(Number(item.tasaPct)), marginX + 260, yDed, 9, false);
            if (item.importe != null) draw(money(Number(item.importe)), marginX + 360, yDed, 9, false);
            yDed += 14;
        }
    }

    drawFit(`Forma de pago : ${formaPagoTexto}`, marginX, yDed + 8, 9, blockW, false);

    const yTot = yDed + 30;
    draw(`Importe Neto a Percibir  ${money(extras.importeNetoPercibir)}`, marginX, yTot, 9, true);
    draw(`Total Deducciones  ${money(extras.totalDeducciones)}`, marginX + 280, yTot, 9, true);

    drawSignatureBlock(page, height, marginX, yTot + 22, blockW, font);
}

async function generarLiquidacionAyudaEconomicaPDF(datos: DatosDocumento): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([A4.w, A4.h]);
    // incluir la tasa en los metadatos para verificación externa
    const tasaAnualMeta = Number(datos.credito?.tasa_interes) || 115.0;
    pdfDoc.setSubject(`tasa:${tasaAnualMeta.toFixed(2)}`);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    drawCopy(page, datos, 40, "ORIGINAL", { regular: font, bold: fontBold });

    page.drawLine({ start: { x: 42, y: yFromTop(A4.h, 420) }, end: { x: A4.w - 42, y: yFromTop(A4.h, 420) }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

    drawCopy(page, datos, 470, "DUPLICADO", { regular: font, bold: fontBold });

    return await pdfDoc.save();
}

export const liquidacionAyudaEconomicaTemplate = {
    id: "liquidacion-ayuda-economica",
    label: "Liquidación Ayuda Económica (Original/Duplicado)",
    filename: (d: DatosDocumento) => {
        const anyD = d as any;
        const nroAyuda = anyD?.liquidacion?.nroAyuda ?? anyD?.nroAyuda ?? d.credito.id_credito;
        return `liquidacion-ayuda-${nroAyuda}.pdf`;
    },
    render: async (d: DatosDocumento) => generarLiquidacionAyudaEconomicaPDF(d),
} as any;
