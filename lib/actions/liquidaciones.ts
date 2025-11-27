"use server";

import { withRLS } from "@/lib/db/with-rls";
import { ConfiguracionCierreSchema } from "@/lib/validators/liquidaciones";
import { addMonths, setDate } from "date-fns";
import { $Enums } from "@prisma/client";
import { getServerUser } from "../auth/get-server-user";

/**
 * Devuelve el período actual en formato "YYYY-M"
 */
function periodoFromDate(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

/**
 * Genera automáticamente la liquidación mensual si:
 *  - Hoy coincide con el día de cierre configurado
 *  - No existe aún una liquidación para este período
 *  - Arrastra cuotas impagas de la liquidación anterior
 */
export async function generarLiquidacionSiCorresponde() {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada para RLS");

  return withRLS(info.mutualId, info.userId, async (prisma) => {
    const config = await prisma.configuracionCierre.findFirst({
      where: { activo: true },
    });

    if (!config) return { generated: false, reason: "No hay configuración activa." };

    const hoy = new Date();
    if (hoy.getDate() !== config.dia_cierre) {
      return { generated: false, reason: "Hoy no es el día de cierre." };
    }

    const periodo = `${hoy.getFullYear()}-${hoy.getMonth() + 1}`;

    const existente = await prisma.liquidacion.findFirst({
      where: { periodo },
    });

    if (existente) {
      return { generated: false, reason: "Ya existe liquidación del período." };
    }

    const cierreEsteMes = setDate(hoy, config.dia_cierre);
    const proximoCierre = cierreEsteMes > hoy ? cierreEsteMes : addMonths(cierreEsteMes, 1);

    const cuotasDelPeriodo = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre },
        estado: { in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida] },
        credito: { estado: "activo" },
      },
    });

    const ultima = await prisma.liquidacion.findFirst({
      orderBy: { fecha_cierre: "desc" },
      include: {
        detalle: { include: { cuota: true } },
      },
    });

    const cuotasArrastradas =
      ultima?.detalle
        .filter((d) => d.cuota.estado !== $Enums.EstadoCuota.pagada)
        .map((d) => ({
          id_cuota: d.id_cuota,
          monto_liquidado: d.cuota.monto_total,
        })) ?? [];

    const todas = [
      ...cuotasArrastradas,
      ...cuotasDelPeriodo.map((c) => ({
        id_cuota: c.id_cuota,
        monto_liquidado: c.monto_total,
      })),
    ];

    const unicas = Array.from(new Map(todas.map((c) => [c.id_cuota, c])).values());

    const total = unicas.reduce((acc, c) => acc + c.monto_liquidado, 0);

    if (!config) {
      return { generated: false, reason: "No hay configuración de cierre activa." };
    }

    const idMutual = info.mutualId!;
    const idConfig = config.id_configuracion;

    const liquidacion = await prisma.liquidacion.create({
      data: {
        id_mutual: idMutual,
        id_configuracion: idConfig,
        periodo,
        fecha_cierre: hoy,
        total_monto: total,
        detalle: {
          createMany: { data: unicas },
        },
      },
    });


    await prisma.configuracionCierre.update({
      where: { id_configuracion: config.id_configuracion },
      data: { ultima_liquidacion: hoy },
    });

    return {
      generated: true,
      id: liquidacion.id_liquidacion,
      total,
      nuevas: cuotasDelPeriodo.length,
      arrastradas: cuotasArrastradas.length,
    };
  });
}


/**
 * Crea o actualiza la configuración de cierre (una por mutual).
 */
export async function upsertConfiguracionCierre(prev: unknown, formData: FormData) {
  const info = await getServerUser();
  if (!info?.mutualId) throw new Error("Mutual no detectada para RLS");

  const parsed = ConfiguracionCierreSchema.safeParse({
    dia_cierre: Number(formData.get("dia_cierre")),
    activo: formData.get("activo") === "on" || formData.get("activo") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  return withRLS(info.mutualId, info.userId, async (prisma) => {
  const existente = await prisma.configuracionCierre.findFirst();

  const data = {
    dia_cierre: parsed.data.dia_cierre,
    activo: parsed.data.activo,
  };

  // Narrowing seguro
  const idMutual = info.mutualId!;

  const record = existente
    ? await prisma.configuracionCierre.update({
        where: { id_configuracion: existente.id_configuracion },
        data,
      })
    : await prisma.configuracionCierre.create({
        data: { ...data, id_mutual: idMutual },
      });

  return { success: true, record };
});
}