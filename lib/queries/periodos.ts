// lib/queries/periodos.ts
import { withRLS } from "@/lib/db/with-rls";
import { addMonths, setDate, startOfMonth, endOfMonth } from "date-fns";

/**
 * 🔹 Obtiene la configuración de cierre activa de la mutual actual
 */
export async function getConfiguracionCierreActiva() {
  return withRLS(async (prisma) => {
    return prisma.configuracionCierre.findFirst({
      where: { activo: true },
      orderBy: { id_configuracion: "desc" },
    });
  });
}

/**
 * 🔹 Devuelve el período actual (string y rango de fechas)
 * basado en el día de cierre configurado.
 */
export async function getPeriodoActual() {
  const config = await getConfiguracionCierreActiva();
  if (!config) throw new Error("No hay configuración de cierre activa");

  const hoy = new Date();
  const diaCierre = config.dia_cierre;

  const cierreEsteMes = setDate(hoy, diaCierre);
  const proximoCierre = cierreEsteMes > hoy ? cierreEsteMes : addMonths(cierreEsteMes, 1);

  const inicio = startOfMonth(proximoCierre);
  const fin = endOfMonth(proximoCierre);

  const periodo = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}`;

  return { periodo, dia_cierre: diaCierre, proximoCierre, inicio, fin };
}
