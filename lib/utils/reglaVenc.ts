import { addMonths } from "date-fns";

export type ReglaVenc = "AJUSTAR_ULTIMO_DIA" | "ESTRICTO";

function ultimoDiaDelMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function ajustarAlMes(base: Date, dia: number, regla: ReglaVenc): Date {
  const y = base.getFullYear();
  const m = base.getMonth();
  const last = ultimoDiaDelMes(base);

  const targetDay =
    regla === "AJUSTAR_ULTIMO_DIA" && dia > last ? last : dia;

  return new Date(y, m, targetDay, 0, 0, 0, 0);
}

/**
 * Regla de vencimiento:
 * - Si hoy es menor o igual al día de vencimiento del mes actual -> vence este mes.
 * - Si hoy ya pasó ese día -> vence el mismo día del mes siguiente.
 * Respeta la regla para meses cortos.
 */
export function primeraFechaVencimiento(
  hoy: Date,
  dia: number,
  regla: ReglaVenc
): Date {
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
  const candidato = ajustarAlMes(hoySinHora, dia, regla);

  if (hoySinHora.getTime() <= candidato.getTime()) return candidato;

  return ajustarAlMes(addMonths(hoySinHora, 1), dia, regla);
}

export function generarVencimientos(
  cantidad: number,
  hoy: Date,
  dia: number,
  regla: ReglaVenc
): Date[] {
  const first = primeraFechaVencimiento(hoy, dia, regla);
  const out: Date[] = [];
  for (let i = 0; i < cantidad; i++) {
    out.push(ajustarAlMes(addMonths(first, i), dia, regla));
  }
  return out;
}
