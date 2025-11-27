"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { addMonths, setDate, startOfMonth, endOfMonth } from "date-fns";
import { ConfiguracionCierre } from "@prisma/client";

/**
 * 🔹 Obtiene la configuración de cierre activa de la mutual actual
 */
export async function getConfiguracionCierreActiva(): Promise<ConfiguracionCierre | null> {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
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
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada (RLS)");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const config = await prisma.configuracionCierre.findFirst({
      where: { activo: true },
      orderBy: { id_configuracion: "desc" },
    });

    // 🔹 Fallback seguro: la página NO debe romper
    if (!config) {
      return {
        tieneConfiguracion: false,
        periodo: null,
        dia_cierre: null,
        proximoCierre: null,
        inicio: null,
        fin: null,
      };
    }

    const hoy = new Date();
    const diaCierre = config.dia_cierre;

    const cierreEsteMes = setDate(hoy, diaCierre);
    const proximoCierre =
      cierreEsteMes > hoy ? cierreEsteMes : addMonths(cierreEsteMes, 1);

    const inicio = startOfMonth(proximoCierre);
    const fin = endOfMonth(proximoCierre);

    const periodo = `${inicio.getFullYear()}-${String(
      inicio.getMonth() + 1
    ).padStart(2, "0")}`;

    return {
      tieneConfiguracion: true,
      periodo,
      dia_cierre: diaCierre,
      proximoCierre,
      inicio,
      fin,
    };
  });
}