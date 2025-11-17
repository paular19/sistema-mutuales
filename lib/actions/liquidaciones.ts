"use server";

import { withRLS } from "@/lib/db/with-rls";
import { ConfiguracionCierreSchema } from "@/lib/validators/liquidaciones";
import { addMonths, setDate } from "date-fns";
import { $Enums } from "@prisma/client";

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
  return withRLS(async (prisma) => {
    // 🔹 Configuración de cierre activa
    const config = await prisma.configuracionCierre.findFirst({
      where: { activo: true },
    });

    if (!config) {
      return { generated: false, reason: "No hay configuración de cierre activa." };
    }

    const hoy = new Date();
    const dia = hoy.getDate();

    // 🔹 Solo generar en el día de cierre
    if (dia !== config.dia_cierre) {
      return { generated: false, reason: "Hoy no es el día de cierre configurado." };
    }

    const periodo = periodoFromDate(hoy);

    // 🔹 Evitar duplicar liquidación del mismo período
    const existente = await prisma.liquidacion.findFirst({
      where: { periodo },
      select: { id_liquidacion: true },
    });
    if (existente) {
      return { generated: false, reason: "La liquidación del período ya fue generada." };
    }

    // 🔹 Calcular el próximo cierre
    const cierreEsteMes = setDate(hoy, config.dia_cierre);
    const proximoCierre = cierreEsteMes > hoy ? cierreEsteMes : addMonths(cierreEsteMes, 1);

    // 🔹 Buscar cuotas vencidas hasta el próximo cierre
    const cuotasDelPeriodo = await prisma.cuota.findMany({
      where: {
        fecha_vencimiento: { lte: proximoCierre },
        estado: { in: [$Enums.EstadoCuota.pendiente, $Enums.EstadoCuota.vencida] },
        credito: { estado: "activo" },
      },
      select: { id_cuota: true, monto_total: true },
    });

    // 🔹 Buscar la última liquidación para arrastrar cuotas impagas
    const ultimaLiquidacion = await prisma.liquidacion.findFirst({
      orderBy: { fecha_cierre: "desc" },
      include: {
        detalle: {
          include: {
            cuota: true,
          },
        },
      },
    });

    const cuotasArrastradas =
      ultimaLiquidacion?.detalle
        .filter((d) => d.cuota.estado !== $Enums.EstadoCuota.pagada)
        .map((d) => ({
          id_cuota: d.id_cuota,
          monto_liquidado: d.cuota.monto_total,
        })) ?? [];

    // 🔹 Unificar cuotas nuevas + arrastradas
    const cuotasUnificadas = [
      ...cuotasArrastradas,
      ...cuotasDelPeriodo.map((c) => ({
        id_cuota: c.id_cuota,
        monto_liquidado: c.monto_total,
      })),
    ];

    // Evitar duplicados (si una cuota arrastrada también entra por fecha)
    const cuotasUnicas = Array.from(
      new Map(cuotasUnificadas.map((c) => [c.id_cuota, c])).values()
    );

    const total = cuotasUnicas.reduce((acc, c) => acc + c.monto_liquidado, 0);

    // 🔹 Crear nueva liquidación
    const liquidacion = await prisma.liquidacion.create({
      data: {
        id_mutual: config.id_mutual,
        id_configuracion: config.id_configuracion,
        periodo,
        fecha_cierre: hoy,
        total_monto: total,
        detalle: {
          createMany: { data: cuotasUnicas },
        },
      },
    });

    // 🔹 Actualizar última liquidación
    await prisma.configuracionCierre.update({
      where: { id_configuracion: config.id_configuracion },
      data: { ultima_liquidacion: hoy },
    });

    return {
      generated: true,
      id: liquidacion.id_liquidacion,
      total,
      arrastradas: cuotasArrastradas.length,
      nuevas: cuotasDelPeriodo.length,
    };
  });
}

/**
 * Crea o actualiza la configuración de cierre (una por mutual).
 */
export async function upsertConfiguracionCierre(prevState: unknown, formData: FormData) {
  const parsed = ConfiguracionCierreSchema.safeParse({
    dia_cierre: Number(formData.get("dia_cierre")),
    activo: formData.get("activo") === "on" || formData.get("activo") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  return withRLS(async (prisma) => {
    // 🔹 Ver si ya existe una configuración de cierre para la mutual actual
    const existente = await prisma.configuracionCierre.findFirst();

    const data = {
      dia_cierre: parsed.data.dia_cierre,
      activo: parsed.data.activo,
    };

    const record = existente
      ? await prisma.configuracionCierre.update({
          where: { id_configuracion: existente.id_configuracion },
          data,
        })
      : await prisma.configuracionCierre.create({ data });

    return { success: true, record };
  });
}


