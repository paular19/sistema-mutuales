import JSZip from "jszip";
import type { DatosDocumento } from "./types";
import { PDF_TEMPLATES, getTemplate } from "./registry";

export async function generarUno(docId: string, datos: DatosDocumento) {
  const tpl = getTemplate(docId);
  if (!tpl) throw new Error("Documento inválido");

  const bytes = await tpl.render(datos); // Uint8Array
  const buffer = Buffer.from(bytes);     // ✅ Buffer

  return {
    buffer,
    filename: tpl.filename(datos),
    contentType: "application/pdf",
  };
}

export async function generarTodosZip(datos: DatosDocumento) {
  const zip = new JSZip();

  for (const tpl of PDF_TEMPLATES) {
    const bytes = await tpl.render(datos);
    zip.file(tpl.filename(datos), bytes);
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  const buffer = Buffer.from(zipBytes); // ✅ Buffer

  return {
    buffer,
    filename: `documentos-${datos.credito.id_credito}.zip`,
    contentType: "application/zip",
  };
}
