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
 * - Si la fecha de emisión es después del día 15 → primera cuota vence 2 meses después.
 * - Si la fecha de emisión es el día 15 o antes → primera cuota vence 1 mes después.
 * Ambos casos respetan la regla para meses cortos.
 */
export function primeraFechaVencimiento(
  hoy: Date,
  dia: number,
  regla: ReglaVenc
): Date {
  const diaEmision = hoy.getDate();
  const mesesASumar = diaEmision > 15 ? 2 : 1;
  const mesVencimiento = addMonths(hoy, mesesASumar);
  return ajustarAlMes(mesVencimiento, dia, regla);
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
