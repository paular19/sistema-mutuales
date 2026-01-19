import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DatosDocumento} from "@/lib/utils/documento-credito-pdflib";
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

function fmtFechaCorta(d?: Date | string | null) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return safe(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear());
  return `${dd}-${mm}-${yy}`;
}

// Wrapping simple por ancho de fuente
function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = safe(text).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Español simple para monto en letras (suficiente para contratos; reemplazable por lib)
function numeroEnLetrasAR(n: number) {
  const unidades = ["CERO","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE"];
  const especiales = ["DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE"];
  const decenas = ["","DIEZ","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const centenas = ["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];

  const entero = Math.floor(Math.abs(n));
  const centavos = Math.round((Math.abs(n) - entero) * 100);

  function twoDigits(x: number) {
    if (x < 10) return unidades[x];
    if (x >= 10 && x <= 15) return especiales[x - 10];
    if (x < 20) return `DIECI${unidades[x - 10].toLowerCase()}`.toUpperCase();
    if (x === 20) return "VEINTE";
    if (x < 30) return `VEINTI${unidades[x - 20].toLowerCase()}`.toUpperCase();
    const d = Math.floor(x / 10);
    const u = x % 10;
    return u ? `${decenas[d]} Y ${unidades[u]}` : decenas[d];
  }

  function threeDigits(x: number) {
    if (x === 0) return "";
    if (x === 100) return "CIEN";
    const c = Math.floor(x / 100);
    const r = x % 100;
    return `${centenas[c]}${r ? " " + twoDigits(r) : ""}`.trim();
  }

  function chunk(n: number): string {
    if (n === 0) return "CERO";
    const out: string[] = [];
    const millones = Math.floor(n / 1_000_000);
    const miles = Math.floor((n % 1_000_000) / 1000);
    const resto = n % 1000;

    if (millones) out.push(millones === 1 ? "UN MILLON" : `${chunk(millones)} MILLONES`);
    if (miles) out.push(miles === 1 ? "MIL" : `${threeDigits(miles)} MIL`.trim());
    if (resto) out.push(threeDigits(resto));

    return out.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  const letras = chunk(entero);
  const cent = String(centavos).padStart(2, "0");
  return `${letras} CON ${cent}/100`;
}

/* ----------------- extras según tu regla ----------------- */

function getCuotasExtras(datos: DatosDocumento) {
  const anyD = datos as any;
  const anyC = datos.credito as any;

  // cuota exacta (monto_total) — puede venir como number o string
  const cuotaExacta = Number(anyC?.monto_total ?? anyD?.monto_total ?? anyD?.cuota_monto ?? NaN);

  // gastos admin (si lo tenés en algún lado)
  const gastosAdminImporte = anyC?.gastos_admin_importe ?? anyD?.gastos_admin_importe;
  const gastosAdminPct = anyC?.gastos_admin_pct ?? anyD?.gastos_admin_pct;

  // vencimiento primera cuota
  const vencPrimera =
    anyC?.vencimiento_primera_cuota ??
    anyD?.vencimiento_primera_cuota ??
    datos.credito.primera_venc;

  // destino (si no viene, default)
  const destinoFondos = anyC?.destino_fondos ?? anyD?.destino_fondos ?? "GASTOS VARIOS";

  // desglose opcional cuota
  const capitalCuota = anyC?.capital_cuota ?? anyD?.capital_cuota;
  const tasaServicioCuota = anyC?.tasa_servicio_cuota ?? anyD?.tasa_servicio_cuota;

  // fiador opcional
  const fiadorNombre = anyD?.fiador?.nombre ?? "";
  const fiadorDni = anyD?.fiador?.dni ?? "";
  const fiadorDomicilio = anyD?.fiador?.domicilio ?? "";
  const fiadorLocalidad = anyD?.fiador?.localidad ?? "";

  return {
    cuotaExacta: Number.isFinite(cuotaExacta) ? cuotaExacta : undefined,
    gastosAdminImporte: gastosAdminImporte != null ? Number(gastosAdminImporte) : undefined,
    gastosAdminPct: gastosAdminPct != null ? Number(gastosAdminPct) : undefined,
    vencPrimera,
    destinoFondos,
    capitalCuota: capitalCuota != null ? Number(capitalCuota) : undefined,
    tasaServicioCuota: tasaServicioCuota != null ? Number(tasaServicioCuota) : undefined,
    fiadorNombre,
    fiadorDni,
    fiadorDomicilio,
    fiadorLocalidad,
  };
}

/* ----------------- render ----------------- */

async function generarContratoMutuoPDF(datos: DatosDocumento): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4.w, A4.h]);
  const { height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;
  const maxW = A4.w - marginX * 2;

  const drawLine = (text: string, x: number, yTop: number, size = 9, isBold = false) => {
    page.drawText(text, {
      x,
      y: yFromTop(height, yTop),
      size,
      font: isBold ? bold : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawParagraph = (text: string, x: number, yTop: number, size: number, leading: number, isBold = false) => {
    const f = isBold ? bold : font;
    const lines = wrapText(text, f, size, maxW);
    let y = yTop;
    for (const ln of lines) {
      page.drawText(ln, { x, y: yFromTop(height, y), size, font: f, color: rgb(0, 0, 0) });
      y += leading;
    }
    return y;
  };

  const a = datos.asociado;
  const c = datos.credito;
  const m = datos.mutual;
  const ex = getCuotasExtras(datos);

  const nro = c.id_credito;

  const nombreAsoc =
    safe(a.razon_social) ||
    [safe(a.apellido).toUpperCase(), safe(a.nombre).toUpperCase()].filter(Boolean).join(" ").trim();

  const socioNro = safe(a.socio_nro, safe(a.codigo_externo, `${a.id_asociado}/00`));
  const dni = dniFromCuit(a.cuit) || safe((a as any).dni, "");
  const domicilio = [
    safe(a.calle).toUpperCase(),
    a.numero_calle != null ? String(a.numero_calle) : "",
    a.piso ? `PISO ${safe(a.piso).toUpperCase()}` : "",
    a.departamento ? `DPTO ${safe(a.departamento).toUpperCase()}` : "",
  ].filter(Boolean).join(" ").trim();

  const localidad = safe(a.localidad).toUpperCase();
  const provincia = safe(a.provincia).toUpperCase();

  const fechaContrato = fmtFechaCorta((datos as any)?.mutuo?.fecha ?? c.fecha_creacion);
  const monto = Number(c.monto);
  const montoLetras = numeroEnLetrasAR(monto);
  const cuotas = Number(c.numero_cuotas);

  // ✅ cuota exacta = monto_total (si viene), sino fallback
  const cuotaMonto = Number(ex.cuotaExacta ?? (cuotas ? monto / cuotas : 0));

  const venc1 = fmtFechaCorta(ex.vencPrimera);

  // Tasa anual: uso credito.tasa_interes como tasa por servicio anual (como tu PDF)
  const tasaAnual = Number(c.tasa_interes);

  /* ----------------- HEADER ----------------- */

  let y = 40;
  drawLine(safe(m.nombre, "Asociación Mutual"), marginX, y, 11, true);
  y += 18;

  drawLine(`CONTRATO DE MUTUO Nº: ${nro}`, marginX, y, 11, true);
  y += 16;

  drawLine(
    `Ayuda Económica Nº ${nro}   Asociado Nº ${socioNro}   Liquidación Nº ${nro}`,
    marginX,
    y,
    9,
    false
  );
  y += 18;

  /* ----------------- INTRO ----------------- */

  y = drawParagraph(
    `En la localidad de Rio Cuarto, al ${fechaContrato}, entre la ${safe(m.nombre)}, C.U.I.T. Nº ${safe(
      m.cuit
    )}, con domicilio legal, representada en este acto por su Presidente y Secretario, quienes suscriben, en adelante denominada "la mutual" por una parte y por la otra parte el Sr/a. ${nombreAsoc} (Socio Nº ${socioNro}), DNI ${dni}, con domicilio real en calle ${domicilio} de la ciudad de ${localidad}, provincia de ${provincia}, denominado en adelante el "Asociado", celebran el presente "Contrato de Mutuo", el que se regirá por las normas pertinentes (art. 1525 a 1532 C.C.C.) y en particular por las cláusulas que se detallan a continuación:`,
    marginX,
    y,
    8.7,
    11
  );

  y += 6;

  /* ----------------- CLAUSULAS ----------------- */

  // PRIMERA
  drawLine("Primera :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `La mutual entrega al asociado una ayuda económica por la cantidad de pesos ${montoLetras} ($ ${money(
      monto
    )}), quien acepta y recibe la suma en este acto a su entera conformidad, sirviendo el presente de suficiente recibo.`,
    marginX,
    y,
    8.7,
    11
  );
  y += 6;

  // SEGUNDA
  drawLine("Segunda :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `El asociado se obliga a reintegrar y/o devolver la suma dada en carácter de ayuda económica por la Mutual en ${cuotas} cuotas iguales mensuales y consecutivas de pesos $ ${money(
      cuotaMonto
    )} cada una, venciendo la primera el día ${venc1} y las restantes en los meses subsiguientes. El capital dado en carácter de ayuda económica será destinado a ${safe(
      ex.destinoFondos
    )}; devengará una tasa por servicios efectiva del ${tasaAnual.toFixed(
      4
    )}% anual, cuya capitalización está autorizada conforme a lo dispuesto por el art. 770 del Código Civil y Comercial de la Nación (Ley 26.994.).`,
    marginX,
    y,
    8.7,
    11
  );

  // ✅ si hay desglose de cuota, lo mostramos
  if (ex.capitalCuota != null || ex.tasaServicioCuota != null) {
    y += 4;
    y = drawParagraph(
      `Constitución de la cuota: capital $ ${money(ex.capitalCuota ?? 0)} - Tasa de servicio $ ${money(
        ex.tasaServicioCuota ?? 0
      )}`,
      marginX,
      y,
      8.7,
      11
    );
  }

  // ✅ aclaración 1ª cuota con gastos admin
  if (ex.gastosAdminImporte != null || ex.gastosAdminPct != null) {
    const gaTxt =
      ex.gastosAdminImporte != null
        ? `Gastos Administrativos $ ${money(ex.gastosAdminImporte)}`
        : `Gastos Administrativos (${(ex.gastosAdminPct ?? 0).toFixed(4)}%)`;

    y += 4;
    y = drawParagraph(
      `Aclaración: la primera cuota incluye ${gaTxt}, por lo cual su importe puede diferir de las restantes.`,
      marginX,
      y,
      8.7,
      11
    );
  }

  y += 6;

  // TERCERA
  drawLine("Tercera :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `En garantía de fiel cumplimiento de este contrato el asociado y el fiador firman un pagaré con la cláusula sin protesto, el cual forma parte del presente contrato. En caso de incumplimiento de pago la mutual podrá reclamar el pago judicialmente mediante la presentación del pagaré solamente o presentando el mutuo y el pagaré. En caso que la mutual no presente el pagaré se considerará que la ayuda económica ha sido abonada por el asociado.`,
    marginX,
    y,
    8.7,
    11
  );
  y += 6;

  // CUARTA
  drawLine("Cuarta :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `La mora automática se producirá de pleno derecho, sin necesidad de interpelación ni aviso previo. La falta de pago en término de cualquiera de las cuotas facultará a la mutual a considerar la totalidad de la deuda como de plazo vencido, pudiendo exigir el pago total del capital, la tasa por servicio y los intereses punitorios como cláusula penal pactada. Estarán a cargo exclusivo del asociado incumplidor los gastos judiciales o extrajudiciales, administrativos, transferencias y cualquier otro que surgiera con motivo de actuaciones realizadas por la mutual para percibir judicial o extrajudicialmente el préstamo otorgado.`,
    marginX,
    y,
    8.7,
    11
  );
  y += 6;

  // QUINTA
  drawLine("Quinta :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `Los pagos deberán efectuarse en el domicilio de la mutual indicado más arriba o donde ésta lo indicare en lo sucesivo, en los horarios de atención a los asociados. En el supuesto que el vencimiento acaeciera un día inhábil o no laborable, el vencimiento se producirá el día posterior hábil.`,
    marginX,
    y,
    8.7,
    11
  );
  y += 6;

  // SEXTA
  drawLine("Sexta :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `A los fines de solucionar las dudas que surjan de la interpretación, o por el incumplimiento en tiempo, forma y lugar de este contrato, todos los firmantes renuncian expresamente a todo fuero que pudiera corresponder, incluso el Federal; pactan expresamente la vía ejecutiva y se someten voluntariamente a la jurisdicción de los Tribunales Ordinarios de la Ciudad de Rio Cuarto, provincia de Córdoba.`,
    marginX,
    y,
    8.7,
    11
  );
  y += 6;

  // SEPTIMA
  drawLine("Séptima :", marginX, y, 9, true); y += 12;

  const fiadorNombre = safe(ex.fiadorNombre, "—");
  const fiadorDni = safe(ex.fiadorDni, "—");
  const fiadorDom = safe(ex.fiadorDomicilio, "—");
  const fiadorLoc = safe(ex.fiadorLocalidad, "—");

  y = drawParagraph(
    `El Sr/a. ${fiadorNombre}, DNI ${fiadorDni}, con domicilio real en ${fiadorDom} de la localidad de ${fiadorLoc}, se constituye en fiador principal pagador de todas las obligaciones legales y contractuales que corresponden al asociado, sin limitación alguna de tiempo y monto y hasta la efectiva cancelación de la deuda. Renuncia por anticipado a los beneficios de excusión, división e interpelación previa, dejando constancia que la relación asociado/fiador es ajena a la mutual.`,
    marginX,
    y,
    8.7,
    11
  );

  y += 6;

  // OCTAVA
  drawLine("Octavo :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `Los domicilios de la mutual, asociado y fiador que figuran en este mutuo se constituyen en especiales a los efectos de este contrato, y en ellos tendrá absoluta validez toda notificación extrajudicial o judicial que se practicare, aunque las mismas sean rehusadas de recibir o devueltas por la empresa encargada de distribuirla.`,
    marginX,
    y,
    8.7,
    11
  );

  y += 6;

  // NOVENO
  drawLine("Noveno :", marginX, y, 9, true); y += 12;
  y = drawParagraph(
    `En prueba de conformidad las partes firman dos (2) ejemplares de un mismo tenor y a un solo efecto, de una hoja con una carilla útil, recibiendo un ejemplar cada una de las partes, en el lugar y fecha indicado ut-supra.`,
    marginX,
    y,
    8.7,
    11
  );

  /* ----------------- firmas ----------------- */

  const baseY = 790; // desde arriba
  page.drawLine({
    start: { x: marginX, y: yFromTop(height, baseY) },
    end: { x: marginX + 220, y: yFromTop(height, baseY) },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: marginX + 280, y: yFromTop(height, baseY) },
    end: { x: marginX + 500, y: yFromTop(height, baseY) },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  drawLine("Firma Asociado", marginX, baseY - 12, 9, false);
  drawLine("Firma Fiador", marginX + 280, baseY - 12, 9, false);

  drawLine("ORIGINAL", marginX + 240, baseY - 30, 9, true);

  return await pdfDoc.save();
}

export const contratoMutuoTemplate = {
  id: "contrato-mutuo",
  label: "Contrato de Mutuo (Ayuda Económica)",
  filename: (d: DatosDocumento) => `contrato-mutuo-${d.credito.id_credito}.pdf`,
  render: (d: DatosDocumento) => generarContratoMutuoPDF(d),
} satisfies PdfTemplate;
