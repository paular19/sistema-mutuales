import { prisma } from "@/lib/db/prisma";
import { withRLS } from "@/lib/db/with-rls";

export async function getInformeSaldosContables(periodo?: string) {
  return withRLS(async (tx) => {
    const hoy = new Date();
    const [year, month] = periodo ? periodo.split("-").map(Number) : [hoy.getFullYear(), hoy.getMonth() + 1];
    const fin = new Date(year, month, 0, 23, 59, 59); // corte hasta fin del mes actual

    const cuotas = await tx.cuota.findMany({
      include: {
        credito: {
          include: { asociado: true, producto: true },
        },
        pagoCuotas: {
          where: { fecha_pago: { lte: fin } }, // 🔹 pagos hasta esa fecha
        },
      },
    });

    return cuotas.map((c) => {
      const debe = c.monto_total;
      const haber = c.pagoCuotas.reduce((acc, p) => acc + p.monto_pagado, 0);
      const saldo = debe - haber;

      return {
        id_credito: c.id_credito,
        id_cuota: c.id_cuota,
        socio: `${c.credito.asociado.nombre ?? ""} ${c.credito.asociado.apellido ?? ""}`.trim(),
        producto: c.credito.producto.nombre,
        monto_credito: c.credito.monto,
        cargos: debe,
        abonos: haber,
        saldo,
        interes_a_devengar: c.estado === "pendiente" ? c.monto_interes : 0,
        dia_vencimiento: c.fecha_vencimiento,
        tasa_interes: c.credito.tasa_interes,
        estado_credito: c.credito.estado,
      };
    });
  });
}

export interface Informe3688Row {
  periodo: string;                // YYYY-MM
  cuit: string;
  nombre_razon: string;
  tipo_persona: "fisica" | "juridica";
  domicilio: string;              // calle nro, localidad, provincia, CP
  tipo_operacion: string;         // ej: "credito"
  moneda: string;                 // "ARS" (o la que tengas)
  importe_total_mes: number;      // suma por sujeto+tipo_operacion en el mes
  fecha_inicio: Date;             // primer día mes
  fecha_fin: Date;                // último día mes
  observaciones?: string;
}

export async function getInforme3688(periodo?: string, umbral = 1_600_000) {
  return withRLS(async (tx) => {
    const hoy = new Date();
    const [y, m] = periodo ? periodo.split("-").map(Number) : [hoy.getFullYear(), hoy.getMonth() + 1];
    const inicio = new Date(y, m - 1, 1, 0, 0, 0);
    const fin = new Date(y, m, 0, 23, 59, 59);
    const periodoStr = `${y}-${String(m).padStart(2, "0")}`;

    // 🔹 Créditos creados (otorgados) dentro del mes => “colocación de fondos”
    const creditos = await tx.credito.findMany({
      where: { fecha_creacion: { gte: inicio, lte: fin } },
      include: { asociado: true },
    });

    // Agrupar por sujeto + tipo_operacion + moneda
    const map = new Map<
      string,
      {
        cuit: string;
        nombre_razon: string;
        tipo_persona: "fisica" | "juridica";
        domicilio: string;
        tipo_operacion: string;
        moneda: string;
        total: number;
      }
    >();

    for (const c of creditos) {
      const asociado = c.asociado;
      const cuit = asociado.cuit ?? "00000000000";
      const nombre_razon =
        asociado.tipo_persona === "juridica"
          ? asociado.razon_social ?? "SIN RAZÓN SOCIAL"
          : `${asociado.nombre ?? ""} ${asociado.apellido ?? ""}`.trim() || "SIN NOMBRE";

      const domicilio = [
        asociado.calle ? `${asociado.calle}${asociado.numero_calle ? " " + asociado.numero_calle : ""}` : "",
        asociado.localidad ?? "",
        asociado.provincia ?? "",
        asociado.codigo_postal ?? "",
      ]
        .filter(Boolean)
        .join(", ");

      const tipo_operacion = (c as any).tipo_operacion ?? "credito";
      const moneda = (c as any).moneda ?? "ARS";

      const key = `${cuit}|${tipo_operacion}|${moneda}`;
      const prev =
        map.get(key) ??
        {
          cuit,
          nombre_razon,
          tipo_persona: asociado.tipo_persona,
          domicilio,
          tipo_operacion,
          moneda,
          total: 0,
        };

      // Criterio: suma del monto del crédito otorgado en el mes (colocación)
      prev.total += Number(c.monto || 0);
      map.set(key, prev);
    }

    // ✅ Cambio de bucle para evitar error TS2802
    const filas: Informe3688Row[] = [];

    for (const v of Array.from(map.values())) {
      if (v.total >= umbral) {
        filas.push({
          periodo: periodoStr,
          cuit: v.cuit,
          nombre_razon: v.nombre_razon,
          tipo_persona: v.tipo_persona,
          domicilio: v.domicilio,
          tipo_operacion: v.tipo_operacion,
          moneda: v.moneda,
          importe_total_mes: Number(v.total.toFixed(2)),
          fecha_inicio: inicio,
          fecha_fin: fin,
        });
      }
    }

    return filas;
  });
}
