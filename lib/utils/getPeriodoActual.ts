// lib/utils/getPeriodoActual.ts
import { getConfiguracionCierre } from "@/lib/queries/liquidaciones";
import { addMonths } from "date-fns";

/**
 * Calcula el período (YYYY-MM) en curso según el día de cierre configurado.
 * Si el día de cierre del mes ya pasó, se considera el próximo mes.
 */
export async function getPeriodoActual(): Promise<string> {
  const config = await getConfiguracionCierre();
  if (!config) return "—";

  const hoy = new Date();
  const diaCierre = config.dia_cierre;

  // Creamos una fecha con el día de cierre de este mes
  const cierreEsteMes = new Date(hoy.getFullYear(), hoy.getMonth(), diaCierre);

  // Si hoy ya es posterior al día de cierre, usamos el mes siguiente
  const periodoFecha = hoy > cierreEsteMes ? addMonths(hoy, 1) : hoy;

  const year = periodoFecha.getFullYear();
  const month = String(periodoFecha.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}
