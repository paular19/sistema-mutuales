"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import * as XLSX from "xlsx";
import { addMonths } from "date-fns";
import { EstadoCredito, EstadoCuota, VencimientoRegla } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generarDocumentoCredito } from "@/lib/utils/documento-credito-pdflib";
import { writeFile } from "fs/promises";
import { join } from "path";

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
  // Regla: Si la fecha de emisión es después del día 15, el primer vencimiento
  // debe ser 2 meses después. Si es antes del 15, es 1 mes después.
  const diaEmision = hoy.getDate();
  const mesesASumar = diaEmision > 15 ? 2 : 1;
  const mesVencimiento = addMonths(hoy, mesesASumar);
  return ajustarAlMes(mesVencimiento, dia, regla);
}

/* ───────── Helper para generar y guardar PDF ───────── */
async function generarYGuardarPDFCredito(credito: any) {
  try {
    const pdfBuffer = await generarDocumentoCredito({
      credito: {
        id_credito: credito.id_credito,
        monto: credito.monto,
        numero_cuotas: credito.numero_cuotas,
        tasa_interes: credito.tasa_interes,
        fecha_creacion: credito.fecha_creacion,
        primera_venc: credito.primera_venc,
        producto: credito.producto,
      },
      asociado: credito.asociado,
      mutual: credito.mutual,
    });

    // Guardar en public/documentos/creditos
    const dirPath = join(process.cwd(), "public", "documentos", "creditos");
    const fileName = `credito-${credito.id_credito}.pdf`;
    const filePath = join(dirPath, fileName);

    // Crear directorio si no existe
    await writeFile(filePath, pdfBuffer);

    console.log(`✅ PDF generado: ${fileName}`);
  } catch (error) {
    console.error("❌ Error generando PDF:", error);
    throw error;
  }
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

      /* 🔹 Fecha de creación del crédito */
      const fechaCreacionStr = formData.get("fecha_creacion");
      const hoy = fechaCreacionStr ? new Date(String(fechaCreacionStr)) : new Date();

      /* ──────────────────────────────────────────────
       *  🧮 Parámetros financieros
       * ────────────────────────────────────────────── */

      // tasa mensual (como porcentaje) y su forma decimal
      const tasaMensualPercent = producto.tasa_interes;
      const tasaMensual = tasaMensualPercent / 100;

      // comisión de gestión (porcentaje) aplicada al monto inicial. Por defecto 7.816712% si no está definida
      const gestionPct = producto.comision_gestion && producto.comision_gestion > 0 ? producto.comision_gestion : 7.816712;

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
      const diasEntre = Math.max(0, Math.round(diffMs / msPorDia) - 1);

      // Cálculo de prorrateo (solo días extra más allá de 30):
      // tasaMensual = tasaAnual * 30 / 360
      // % = (tasaMensual / 30) × diasExtra
      // agregado = adjustedMonto × (% / 100)
      const diasExtra = Math.max(0, diasEntre - 30);
      let interesProrrateado = 0;
      if (diasExtra > 0) {
        const tasaAnual = tasaMensualPercent * 12;
        const tasaMensualNueva = (tasaAnual * 30) / 360;
        const porcentaje = (tasaMensualNueva / 30) * diasExtra;
        const porcentajeRedondeado = Math.round(porcentaje * 10000) / 10000;
        interesProrrateado = Math.round(adjustedMonto * (porcentajeRedondeado / 100) * 100) / 100;
      }

      // tasa efectiva mensual en decimal
      const iRate = tasaMensual; // ya definido como tasaMensualPercent/100

      // Cuota por fórmula de anualidad (bruta) - usar exactamente la fórmula dada:
      // cuota = (M * (1 + (L10/100))^n * (L10/100)) / ((1 + (L10/100))^n - 1)
      const i = tasaMensualPercent / 100;
      const pow = Math.pow(1 + i, numeroCuotas);
      const cuotaBruta = adjustedMonto * (pow * i) / (pow - 1);

      // Primera cuota bruta incluye prorrateo
      const primeraCuotaBruta = cuotaBruta + interesProrrateado;

      // Generar calendario de amortización para registrar capital e interés
      const cuotas: {
        numero_cuota: number;
        estado: EstadoCuota;
        fecha_vencimiento: Date;
        monto_capital: number;
        monto_interes: number;
        monto_total: number;
      }[] = [];

      let outstanding = adjustedMonto;
      for (let idx = 0; idx < numeroCuotas; idx++) {
        const fecha_vencimiento = ajustarAlMes(
          addMonths(primera_venc, idx),
          producto.dia_vencimiento,
          producto.regla_vencimiento
        );

        const esPrimera = idx === 0;

        // interés estándar del periodo
        const interesEstandar = outstanding * iRate;

        // interés total en la cuota (incluye prorrateo en la primera)
        const monto_interes = esPrimera ? interesEstandar + interesProrrateado : interesEstandar;

        // principal pagado ese periodo (la anualidad cubre principal + interés estándar)
        const principalPago = cuotaBruta - interesEstandar;

        // evitar problemas de redondeo en la última cuota
        const monto_capital = idx === numeroCuotas - 1 ? Math.round(outstanding * 100) / 100 : Math.round(principalPago * 100) / 100;

        // bruto: cuotaBruta (+ prorrateo en la primera)
        const bruto = esPrimera ? primeraCuotaBruta : cuotaBruta;

        const monto_total = Math.round(bruto * 100) / 100;

        cuotas.push({
          numero_cuota: idx + 1,
          estado: EstadoCuota.pendiente,
          fecha_vencimiento,
          monto_capital,
          monto_interes: Math.round(monto_interes * 100) / 100,
          monto_total,
        });

        outstanding = Math.round((outstanding - monto_capital) * 1000000) / 1000000; // mantener precisión razonable
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
          fecha_creacion: hoy, // fecha personalizada o hoy

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

      // 🎯 GENERAR PDF DEL CRÉDITO (background - no bloquea)
      // Traer datos completos para el PDF
      const creditoCompleto = await tx.credito.findUnique({
        where: { id_credito: credito.id_credito },
        include: {
          asociado: true,
          producto: true,
          mutual: true,
        },
      });

      // Generar PDF en background (sin await para no bloquear)
      if (creditoCompleto) {
        generarYGuardarPDFCredito(creditoCompleto).catch((err) => {
          console.error("⚠️ Error al generar PDF de crédito:", err);
          // No fallar toda la operación si falla el PDF
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

          const tasaMensualPercent = producto.tasa_interes;
          const tasaMensual = tasaMensualPercent / 100;

          // comisión de gestión (porcentaje) aplicada al monto inicial. Por defecto 7.816712%
          const gestionPct = producto.comision_gestion && producto.comision_gestion > 0 ? producto.comision_gestion : 7.816712;

          const adjustedMonto = monto * (1 + gestionPct / 100);

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
            Math.round((primerSinHora.getTime() - hoySinHora.getTime()) / msPorDia) - 1
          );

          // Cálculo de prorrateo (solo días extra más allá de 30):
          // tasaMensual = tasaAnual * 30 / 360
          // % = (tasaMensual / 30) × diasExtra
          // agregado = adjustedMonto × (% / 100)
          const diasExtra = Math.max(0, diasEntre - 30);
          let interesProrrateado = 0;
          if (diasExtra > 0) {
            const tasaAnual = tasaMensualPercent * 12;
            const tasaMensualNueva = (tasaAnual * 30) / 360;
            const porcentaje = (tasaMensualNueva / 30) * diasExtra;
            const porcentajeRedondeado = Math.round(porcentaje * 10000) / 10000;
            interesProrrateado = Math.round(adjustedMonto * (porcentajeRedondeado / 100) * 100) / 100;
          }

          // tasa efectiva mensual en decimal
          const iRate = tasaMensual;

          // Cuota por fórmula de anualidad (bruta) - usar exactamente la fórmula dada
          const i = tasaMensualPercent / 100;
          const pow = Math.pow(1 + i, numeroCuotas);
          const cuotaBruta = adjustedMonto * (pow * i) / (pow - 1);

          // Primera cuota bruta incluye prorrateo
          const primeraCuotaBruta = cuotaBruta + interesProrrateado;

          /* ---------------------------------------------
           *  GENERAR CUOTAS
           --------------------------------------------- */

          const cuotas = [];
          let outstanding = adjustedMonto;

          for (let c = 0; c < numeroCuotas; c++) {
            const fecha_venc = ajustarAlMes(
              addMonths(primera_venc, c),
              producto.dia_vencimiento,
              producto.regla_vencimiento
            );

            const esPrimera = c === 0;

            // interés estándar del periodo
            const interesEstandar = outstanding * iRate;

            // interés total en la cuota (incluye prorrateo en la primera)
            const monto_interes = esPrimera ? interesEstandar + interesProrrateado : interesEstandar;

            // principal pagado ese periodo (la anualidad cubre principal + interés estándar)
            const principalPago = cuotaBruta - interesEstandar;

            // evitar problemas de redondeo en la última cuota
            const monto_capital = c === numeroCuotas - 1 ? Math.round(outstanding * 100) / 100 : Math.round(principalPago * 100) / 100;

            // bruto: cuotaBruta (+ prorrateo en la primera)
            const bruto = esPrimera ? primeraCuotaBruta : cuotaBruta;

            const monto_total = Math.round(bruto * 100) / 100;

            cuotas.push({
              numero_cuota: c + 1,
              estado: EstadoCuota.pendiente,
              fecha_vencimiento: fecha_venc,
              monto_capital,
              monto_interes: Math.round(monto_interes * 100) / 100,
              monto_total,
            });

            outstanding = Math.round((outstanding - monto_capital) * 1000000) / 1000000;
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

