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
 * Regla sugerida (estándar tarjetas/finanzas):
 * - Si hoy <= día de vencimiento de este mes → primera cuota vence este mes.
 * - Si hoy > día de vencimiento → primera cuota el mismo día del mes siguiente.
 * Ambos casos respetan la regla para meses cortos.
 */
export function primeraFechaVencimiento(
  hoy: Date,
  dia: number,
  regla: ReglaVenc
): Date {
  const candidato = ajustarAlMes(hoy, dia, regla);
  if (hoy.getTime() <= candidato.getTime()) return candidato;
  const siguienteMes = addMonths(candidato, 1);
  return ajustarAlMes(siguienteMes, dia, regla);
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
