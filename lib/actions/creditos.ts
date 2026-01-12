"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import * as XLSX from "xlsx";
import { addMonths } from "date-fns";
import { EstadoCredito, EstadoCuota, VencimientoRegla } from "@prisma/client";
import { revalidatePath } from "next/cache";

/* ───────── Helpers de fechas / cálculos ───────── */
function ultimoDiaDelMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function ajustarAlMes(base: Date, dia: number, regla: VencimientoRegla) {
  const last = ultimoDiaDelMes(base);
  const target = regla === "AJUSTAR_ULTIMO_DIA" && dia > last ? last : dia;
  return new Date(base.getFullYear(), base.getMonth(), target);
}

function primeraFechaVencimiento(hoy: Date, dia: number, regla: VencimientoRegla) {
  const candidato = ajustarAlMes(hoy, dia, regla);
  if (hoy.getTime() <= candidato.getTime()) return candidato;
  return ajustarAlMes(addMonths(candidato, 1), dia, regla);
}

/* ──────────────────────────────────────────────
 *  🔹 CREAR CRÉDITO (individual)
 * ────────────────────────────────────────────── */
export async function createCredito(formData: FormData) {
  try {
    const info = await getServerUser();
    if (!info) return { error: "Usuario no autenticado" };

    const mutualId = info.mutualId;
    const clerkId = info.userId;

    if (!mutualId) return { error: "Mutual ID no encontrado" };

    return await withRLS(mutualId, clerkId, async (tx) => {
      const id_asociado = Number(formData.get("id_asociado"));
      const id_producto = Number(formData.get("id_producto"));
      const monto = Number(formData.get("monto"));
      const observaciones = String(formData.get("observaciones") || "");

      if (!id_asociado || !id_producto || !monto) {
        return { error: "Faltan datos obligatorios." };
      }

      // Producto
      const producto = await tx.producto.findUnique({
        where: { id_producto },
      });

      if (!producto) return { error: "Producto no encontrado." };

      /* 🔹 Cantidad de cuotas */
      const rawNumeroCuotas = formData.get("numero_cuotas");
      let numeroCuotas = rawNumeroCuotas ? Number(rawNumeroCuotas) : 1;

      if (!Number.isFinite(numeroCuotas) || numeroCuotas <= 0) {
        numeroCuotas = 1;
      }

      /* ──────────────────────────────────────────────
       *  🧮 Parámetros financieros
       * ────────────────────────────────────────────── */

      const hoy = new Date();

      // tasa mensual en decimal (ej: 9.58 → 0.0958)
      const tasaMensual = producto.tasa_interes / 100;

      // tasa anual estándar (TNA) = mensual * 12
      const tasaAnual = tasaMensual * 12;

      // comisión de gestión (porcentaje) aplicada al monto inicial. Por defecto 7% si no está definida
      const gestionPct = producto.comision_gestion && producto.comision_gestion > 0 ? producto.comision_gestion : 7;
      // comisión de la comercializadora (porcentaje) que se descuenta por cuota. Por defecto 3% si no está definida
      const comercializadoraPct = producto.comision_comerc && producto.comision_comerc > 0 ? producto.comision_comerc : 3;

      // Monto final sobre el que se aplicarán los intereses = monto inicial + comisión de gestión
      const adjustedMonto = monto * (1 + gestionPct / 100);

      const capitalPorCuota = adjustedMonto / numeroCuotas;

      // Primera fecha de vencimiento según regla de producto
      const primera_venc = primeraFechaVencimiento(
        hoy,
        producto.dia_vencimiento,
        producto.regla_vencimiento
      );

      // Días entre fecha de otorgamiento (hoy) y primer vencimiento (ACT/360)
      const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const primeraSinHora = new Date(
        primera_venc.getFullYear(),
        primera_venc.getMonth(),
        primera_venc.getDate()
      );
      const msPorDia = 1000 * 60 * 60 * 24;
      const diffMs = primeraSinHora.getTime() - hoySinHora.getTime();
      const diasEntre = Math.max(0, Math.round(diffMs / msPorDia));

      // Interés prorrateado para la PRIMERA cuota (sobre el monto ajustado)
      const interesProrrateado = adjustedMonto * tasaAnual * (diasEntre / 360);

      // Interés mensual "normal" para las cuotas siguientes (sobre el capital por cuota)
      const interesMensualNormal = capitalPorCuota * tasaMensual;

      // Comisión de gestión total aplicada al inicio (monto * gestionPct)
      const comisionTotal = monto * (gestionPct / 100);

      /* ──────────────────────────────────────────────
       *  🔢 Generación de cuotas
       * ────────────────────────────────────────────── */
      const cuotas: {
        numero_cuota: number;
        estado: EstadoCuota;
        fecha_vencimiento: Date;
        monto_capital: number;
        monto_interes: number;
        monto_total: number;
      }[] = [];

      for (let i = 0; i < numeroCuotas; i++) {
        const fecha_vencimiento = ajustarAlMes(
          addMonths(primera_venc, i),
          producto.dia_vencimiento,
          producto.regla_vencimiento
        );

        const esPrimera = i === 0;

        const interes = esPrimera ? interesProrrateado : interesMensualNormal;

        const monto_interes = interes; // la comisión de gestión ya fue aplicada al monto financiado
        const bruto = capitalPorCuota + monto_interes;
        const monto_total = Math.round(bruto * (1 - comercializadoraPct / 100) * 100) / 100;

        cuotas.push({
          numero_cuota: i + 1,
          estado: EstadoCuota.pendiente,
          fecha_vencimiento,
          monto_capital: capitalPorCuota,
          monto_interes,
          monto_total,
        });
      }

      // Saldo inicial = suma de todas las cuotas
      const saldoInicial = cuotas.reduce(
        (acc, c) => acc + c.monto_total,
        0
      );

      /* ──────────────────────────────────────────────
       *  💾 Crear crédito
       * ────────────────────────────────────────────── */
      const credito = await tx.credito.create({
        data: {
          id_mutual: mutualId,
          id_asociado,
          id_producto,
          monto, // capital original

          tasa_interes: producto.tasa_interes,   // mensual, como cargás en producto
          numero_cuotas: numeroCuotas,
          dia_vencimiento: producto.dia_vencimiento,
          regla_vencimiento: producto.regla_vencimiento,
          primera_venc,

          saldo_capital_inicial: saldoInicial,
          saldo_capital_actual: saldoInicial,

          cuotas_pagadas: 0,
          cuotas_pendientes: numeroCuotas,
          estado: EstadoCredito.activo,
          observaciones,
          usuario_creacion: clerkId,
        },
      });

      /* ──────────────────────────────────────────────
       *  💾 Crear cuotas
       * ────────────────────────────────────────────── */
      for (const c of cuotas) {
        await tx.cuota.create({
          data: {
            ...c,
            id_credito: credito.id_credito,
          },
        });
      }

      return { success: true, id_credito: credito.id_credito };
    });
  } catch (err) {
    console.error("❌ Error al crear crédito:", err);
    return { error: "Error inesperado al crear el crédito." };
  }
}

/* ──────────────────────────────────────────────
 *  🔹 IMPORTAR CRÉDITOS DESDE EXCEL
 * ────────────────────────────────────────────── */
/* ──────────────────────────────────────────────
 *  🔹 IMPORTAR CRÉDITOS DESDE EXCEL (NUEVO)
 *  ✔ Genera cuotas completas
 *  ✔ Aplica interés mensual
 *  ✔ Aplica comisión comercializadora por cuota
 *  ✔ Gestión solo en la primera cuota
 *  ✔ Saldo inicial correcto
 * ────────────────────────────────────────────── */

export async function importCreditosAction(formData: FormData) {
  const info = await getServerUser();
  if (!info) return { error: "Usuario no autenticado" };
  if (!info.mutualId) return { error: "Mutual no definida" };

  return withRLS(info.mutualId, info.userId, async (tx, ctx) => {
    try {
      const file = formData.get("file") as File | null;
      if (!file) return { error: "No se recibió archivo" };

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      let creados = 0;
      let asociadosNuevos = 0;
      const errores: { fila: number; mensaje: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const filaReal = i + 2;

        try {
          const nombre = row["nombre"]?.toString().trim();
          const apellido = row["apellido"]?.toString().trim();
          const cuit = (
            row["cuit"] ||
            row["documento"] ||
            row["dni"] ||
            ""
          ).toString().trim();

          const productoNombre = row["producto"]?.toString().trim();
          const monto = Number(row["monto"]);

          if (!nombre || !apellido || !productoNombre || !monto || !cuit) {
            errores.push({
              fila: filaReal,
              mensaje: "Datos incompletos (nombre, apellido, cuit, producto, monto)",
            });
            continue;
          }

          /* ---------------------------------------------
           *  ASOCIADO — buscar o crear
           --------------------------------------------- */
          let asociado = await tx.asociado.findFirst({
            where: { cuit, id_mutual: ctx.mutualId },
            select: { id_asociado: true },
          });

          if (!asociado) {
            asociado = await tx.asociado.create({
              data: {
                nombre,
                apellido,
                cuit,
                telefono: "",
                calle: "",
                codigo_postal: "",
                localidad: "",
                provincia: "",
                dec_jurada: false,
                id_mutual: ctx.mutualId,
              },
              select: { id_asociado: true },
            });
            asociadosNuevos++;
          }

          /* ---------------------------------------------
           *  PRODUCTO
           --------------------------------------------- */
          const producto = await tx.producto.findFirst({
            where: {
              nombre: { contains: productoNombre, mode: "insensitive" },
              id_mutual: ctx.mutualId,
            },
          });

          if (!producto) {
            errores.push({
              fila: filaReal,
              mensaje: `Producto "${productoNombre}" no encontrado`,
            });
            continue;
          }

          /* ---------------------------------------------
           *  CANTIDAD DE CUOTAS
           --------------------------------------------- */
          let numeroCuotas =
            row["numero_cuotas"]
              ? Number(row["numero_cuotas"])
              : row["cuotas"]
                ? Number(row["cuotas"])
                : 1;

          numeroCuotas =
            Number.isFinite(numeroCuotas) && numeroCuotas > 0
              ? numeroCuotas
              : 1;

          /* ---------------------------------------------
           *  CALCULOS FINANCIEROS (IGUAL QUE createCredito)
           --------------------------------------------- */

          const hoy = new Date();

          const tasaMensual = producto.tasa_interes / 100;
          const tasaAnual = tasaMensual * 12;

          // comisión de gestión (porcentaje) aplicada al monto inicial. Por defecto 7%
          const gestionPct = producto.comision_gestion && producto.comision_gestion > 0 ? producto.comision_gestion : 7;
          // comisión de la comercializadora por cuota (porcentaje). Por defecto 3%
          const comercializadoraPct = producto.comision_comerc && producto.comision_comerc > 0 ? producto.comision_comerc : 3;

          const adjustedMonto = monto * (1 + gestionPct / 100);

          const capitalPorCuota = adjustedMonto / numeroCuotas;

          const primera_venc = primeraFechaVencimiento(
            hoy,
            producto.dia_vencimiento,
            producto.regla_vencimiento
          );

          // días entre hoy y primer vencimiento
          const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          const primerSinHora = new Date(
            primera_venc.getFullYear(),
            primera_venc.getMonth(),
            primera_venc.getDate()
          );
          const msPorDia = 1000 * 60 * 60 * 24;
          const diasEntre = Math.max(
            0,
            Math.round((primerSinHora.getTime() - hoySinHora.getTime()) / msPorDia)
          );

          // interés prorrateado sobre el monto ajustado
          const interesProrrateado = adjustedMonto * tasaAnual * (diasEntre / 360);

          // interés mensual normal (sobre el capital por cuota)
          const interesMensualNormal = capitalPorCuota * tasaMensual;

          // comisión de gestión total aplicada al inicio
          const comisionTotal = monto * (gestionPct / 100);

          /* ---------------------------------------------
           *  GENERAR CUOTAS
           --------------------------------------------- */

          const cuotas = [];

          for (let c = 0; c < numeroCuotas; c++) {
            const fecha_venc = ajustarAlMes(
              addMonths(primera_venc, c),
              producto.dia_vencimiento,
              producto.regla_vencimiento
            );

            const esPrimera = c === 0;

            const interes = esPrimera ? interesProrrateado : interesMensualNormal;

            const monto_interes = interes;
            const bruto = capitalPorCuota + monto_interes;
            const monto_total = Math.round(bruto * (1 - comercializadoraPct / 100) * 100) / 100;

            cuotas.push({
              numero_cuota: c + 1,
              estado: EstadoCuota.pendiente,
              fecha_vencimiento: fecha_venc,
              monto_capital: capitalPorCuota,
              monto_interes,
              monto_total,
            });
          }

          const saldoInicial = cuotas.reduce(
            (acc, q) => acc + q.monto_total,
            0
          );

          /* ---------------------------------------------
           *  CREAR CRÉDITO
           --------------------------------------------- */
          const credito = await tx.credito.create({
            data: {
              id_mutual: ctx.mutualId,
              id_asociado: asociado.id_asociado,
              id_producto: producto.id_producto,
              monto,

              tasa_interes: producto.tasa_interes, // mensual  
              numero_cuotas: numeroCuotas,
              dia_vencimiento: producto.dia_vencimiento,
              regla_vencimiento: producto.regla_vencimiento,
              primera_venc,

              saldo_capital_inicial: saldoInicial,
              saldo_capital_actual: saldoInicial,

              cuotas_pagadas: 0,
              cuotas_pendientes: numeroCuotas,
              estado: EstadoCredito.activo,
              usuario_creacion: ctx.clerkId,
            },
          });

          /* ---------------------------------------------
           *  CREAR CUOTAS UNA POR UNA
           --------------------------------------------- */
          for (const cu of cuotas) {
            await tx.cuota.create({
              data: {
                ...cu,
                id_credito: credito.id_credito,
              },
            });
          }

          creados++;
        } catch (err) {
          console.error(err);
          errores.push({
            fila: filaReal,
            mensaje: "Error inesperado procesando la fila",
          });
        }
      }

      return {
        success: true,
        creados,
        asociadosNuevos,
        errores,
      };
    } catch (err) {
      console.error("❌ Error general importando créditos", err);
      return { error: "Error inesperado al importar créditos" };
    }
  });
}

