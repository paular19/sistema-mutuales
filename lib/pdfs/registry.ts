import "server-only";
import type { PdfTemplate } from "./types";

import { solicitudIngreso } from "./templates/solicitud-ingreso";
import { pdf2 } from "./templates/pdf-2";
import { pdf3 } from "./templates/pdf-3";
import { conozcaACliente } from "./templates/conozca-a-su-cliente"; 
import { declaracionJuradaUIF } from "./templates/declaracion-jurada-uif"; 
import { declaracionJuradaPEP } from "./templates/declaracion-jurada-pep";
import { nominaPEP } from "./templates/nomina-pep-con-sello";
import { nominaPEP2 } from "./templates/nomina-pep-2";
import { solicitudDocumentacionLegajo } from "./templates/solicitud-documentacion-legajo";
import { declaracionSujetoNoObligadoUIF } from "./templates/declaracion-sujeto-no-obligado-uif";
import { detalleCuotasCredito } from "./templates/detalle-cuotas-credito";
import { solicitudAyudaEconomicaPagare } from "./templates/solicitud-ayuda-economica-pagare";
import { liquidacionAyudaEconomicaTemplate } from "./templates/liquidacion-ayuda-economica";
import { contratoMutuoTemplate } from "./templates/contrato-mutuo";
import { notificacionLey24240Template } from "./templates/notificacion-ley-24240";
import { ayudasEconomicasAVencerTemplate } from "./templates/ayudas-economicas-a-vencer";


function assertTemplate(t: any, name: string): asserts t is PdfTemplate {
  if (!t) throw new Error(`[PDF] Template "${name}" es undefined. Revisá el import/export.`);
  if (typeof t.id !== "string" || !t.id) throw new Error(`[PDF] Template "${name}" no tiene id válido.`);
  if (typeof t.label !== "string") throw new Error(`[PDF] Template "${name}" no tiene label válido.`);
  if (typeof t.filename !== "function") throw new Error(`[PDF] Template "${name}" no tiene filename().`);
  if (typeof t.render !== "function") throw new Error(`[PDF] Template "${name}" no tiene render().`);
}

const raw = [
  { t: solicitudIngreso, name: "solicitudIngreso" },
  { t: pdf2, name: "pdf2" },
  { t: pdf3, name: "pdf3" },
  { t: conozcaACliente, name: "conozcaACliente" },
  { t: declaracionJuradaUIF, name: "declaracionJuradaUIF" },
  { t: declaracionJuradaPEP, name: "declaracionJuradaPEP" }, 
  { t: nominaPEP, name: "nominaPEP" },
  { t: nominaPEP2, name: "nominaPEP2" },
  { t: solicitudDocumentacionLegajo, name: "solicitudDocumentacionLegajo" },
  { t: declaracionSujetoNoObligadoUIF, name: "declaracionSujetoNoObligadoUIF" },
  { t: detalleCuotasCredito, name: "detalleCuotasCredito" },
  { t: solicitudAyudaEconomicaPagare, name: "solicitudAyudaEconomicaPagare" },
  { t: liquidacionAyudaEconomicaTemplate, name: "liquidacionAyudaEconomica" },
  { t: contratoMutuoTemplate, name: "contratoMutuo" },
  { t: notificacionLey24240Template, name: "notificacionLey24240" },
  { t: ayudasEconomicasAVencerTemplate, name: "ayudasEconomicasAVencer" },

];

raw.forEach(({ t, name }) => assertTemplate(t, name));

export const PDF_TEMPLATES: PdfTemplate[] = raw.map(x => x.t);

export function getTemplate(id: string | null) {
  if (!id) return null;
  return PDF_TEMPLATES.find(t => t.id === id) ?? null;
}
