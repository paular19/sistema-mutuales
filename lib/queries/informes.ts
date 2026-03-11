// lib/queries/informes.ts
import { prisma } from "@/lib/db/prisma";
import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import { Prisma } from "@prisma/client";

// -------------------------------------------------------------
// Tipos
// -------------------------------------------------------------

export interface InformeSaldosRow {
  id_credito: number;
  id_cuota: number;
  socio: string;
  producto: string;
  monto_credito: number;
  cargos: number;
  abonos: number;
  saldo: number;
  interes_a_devengar: number;
  dia_vencimiento: Date | null;
  tasa_interes: number;
  estado_credito: string;
}

export interface CentralDeudorRawRow {
  cuit_mutual: string;
  cuit_asociado: string;
  apellido: string;
  nombre: string;
  saldo_deuda: number;
  primera_vencida: Date | null;
}

// -------------------------------------------------------------
// SALDOS CONTABLES
// -------------------------------------------------------------

export async function getInformeSaldosContables(
  periodo?: string
): Promise<InformeSaldosRow[]> {

  const info = await getServerUser();
  if (!info) throw new Error("Usuario no autenticado.");
  if (!info.mutualId) throw new Error("Mutual no encontrada.");

  const { mutualId, user } = info;
  const clerkId = user.id;

  return withRLS(mutualId, clerkId, async (tx) => {
    // -----------------------------
    // Rango temporal
    // -----------------------------
    const hoy = new Date();
    const [year, month] = periodo
      ? periodo.split("-").map(Number)
      : [hoy.getFullYear(), hoy.getMonth() + 1];

    const fin = new Date(year, month, 0, 23, 59, 59);

    // -----------------------------
    // Query principal
    // -----------------------------
    const cuotas = await tx.cuota.findMany({
      include: {
        credito: {
          include: { asociado: true, producto: true },
        },
        pagoCuotas: {
          where: { fecha_pago: { lte: fin } },
        },
      },
    });

    // -----------------------------
    // Transformación a informe
    // -----------------------------
    return cuotas.map<InformeSaldosRow>((c) => {
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

export async function getInforme3688(periodo?: string, umbral = 1_600_000) {
  const info = await getServerUser();
  if (!info) throw new Error("Usuario no autenticado.");
  if (!info.mutualId) throw new Error("Mutual no encontrada.");

  const { mutualId, user } = info;
  const clerkId = user.id;

  return withRLS(mutualId, clerkId, async (tx) => {
    const hoy = new Date();
    const [y, m] = periodo
      ? periodo.split("-").map(Number)
      : [hoy.getFullYear(), hoy.getMonth() + 1];

    const inicio = new Date(y, m - 1, 1, 0, 0, 0);
    const fin = new Date(y, m, 0, 23, 59, 59);
    const periodoStr = `${y}-${String(m).padStart(2, "0")}`;

    const creditos = await tx.credito.findMany({
      where: { fecha_creacion: { gte: inicio, lte: fin } },
      include: { asociado: true },
    });

    const map = new Map<string, any>();

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

      prev.total += Number(c.monto || 0);
      map.set(key, prev);
    }

    const filas = [];

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

/**
 * Obtiene deudores por crédito con cuotas impagas usando agregación en SQL.
 * Está optimizada para datasets grandes evitando traer cuotas individuales al servidor.
 */
export async function getCentralDeudoresRawData(
  idMutual: number,
  fechaCorte: Date,
  clerkId: string
): Promise<CentralDeudorRawRow[]> {
  return withRLS(idMutual, clerkId, async (tx) => {
    const rows = await tx.$queryRaw<CentralDeudorRawRow[]>(Prisma.sql`
      WITH cuotas_impagas AS (
        SELECT
          c.id_credito,
          cr.id_asociado,
          cr.id_mutual,
          SUM(c.monto_total)::double precision AS saldo_deuda,
          MIN(c.fecha_vencimiento) FILTER (
            WHERE c.fecha_vencimiento::date < ${fechaCorte}::date
          ) AS primera_vencida
        FROM cuotas c
        INNER JOIN creditos cr ON cr.id_credito = c.id_credito
        WHERE cr.id_mutual = ${idMutual}
          AND c.estado IN ('pendiente', 'vencida', 'parcial')
        GROUP BY c.id_credito, cr.id_asociado, cr.id_mutual
        HAVING SUM(c.monto_total) > 0
      )
      SELECT
        COALESCE(NULLIF(m.cuit, ''), 'NO CARGADO') AS cuit_mutual,
        COALESCE(NULLIF(a.cuit, ''), 'NO CARGADO') AS cuit_asociado,
        COALESCE(NULLIF(a.apellido, ''), 'NO CARGADO') AS apellido,
        COALESCE(NULLIF(a.nombre, ''), 'NO CARGADO') AS nombre,
        ci.saldo_deuda,
        ci.primera_vencida
      FROM cuotas_impagas ci
      INNER JOIN asociados a ON a.id_asociado = ci.id_asociado
      INNER JOIN mutuales m ON m.id_mutual = ci.id_mutual
      ORDER BY a.apellido NULLS LAST, a.nombre NULLS LAST, ci.id_credito
    `);

    return rows;
  });
}
