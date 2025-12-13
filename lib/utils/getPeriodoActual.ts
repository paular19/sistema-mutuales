"use server";

import { getServerUser } from "../auth/get-server-user";
import { withRLS } from "@/lib/db/with-rls";

export async function getPeriodoActual() {
  const hoy = new Date();

  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  return {
    periodo,
    fecha: hoy,
    proximoCierre: null,       // ya no existe concepto de cierre
    tieneConfiguracion: false, // siempre false porque ya no hay configuraciones
  };
}
