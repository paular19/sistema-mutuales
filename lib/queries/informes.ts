// lib/queries/informes.ts
import { prisma } from "@/lib/db/prisma";
import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";

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
