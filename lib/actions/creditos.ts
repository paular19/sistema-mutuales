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

      // Producto (ya filtrado por RLS)
      const producto = await tx.producto.findUnique({
        where: { id_producto },
      });

      if (!producto) return { error: "Producto no encontrado." };

      // Cálculos
      const intereses = monto * (producto.tasa_interes / 100);
      const comision = monto * (producto.comision_comerc / 100);
      const gestion = producto.comision_gestion ?? 0;

      const saldoInicial = monto + intereses + comision;
      const totalConGestion = saldoInicial + gestion;

      const primera_venc = primeraFechaVencimiento(
        new Date(),
        producto.dia_vencimiento,
        producto.regla_vencimiento
      );

      // Generar cuotas
      const cuotas = Array.from({ length: producto.numero_cuotas }, (_, i) => {
        const fecha_venc = ajustarAlMes(
          addMonths(primera_venc, i),
          producto.dia_vencimiento,
          producto.regla_vencimiento
        );

        const monto_total =
          saldoInicial / producto.numero_cuotas + (i === 0 ? gestion : 0);

        return {
          numero_cuota: i + 1,
          estado: EstadoCuota.pendiente,
          fecha_vencimiento: fecha_venc,
          monto_capital: monto / producto.numero_cuotas,
          monto_interes: intereses / producto.numero_cuotas,
          monto_total,
        };
      });

      // Crear crédito
      const credito = await tx.credito.create({
        data: {
          id_asociado,
          id_producto,
          monto,
          tasa_interes: producto.tasa_interes,
          numero_cuotas: producto.numero_cuotas,
          dia_vencimiento: producto.dia_vencimiento,
          regla_vencimiento: producto.regla_vencimiento,
          primera_venc,
          saldo_capital_inicial: saldoInicial,
          saldo_capital_actual: saldoInicial,
          cuotas_pagadas: 0,
          cuotas_pendientes: producto.numero_cuotas,
          estado: EstadoCredito.activo,
          observaciones,
          usuario_creacion: clerkId,
        },
      });

      // 🔥 FIX: NO usar createMany() — crear cuotas UNA POR UNA
      await Promise.all(
        cuotas.map((c) =>
          tx.cuota.create({
            data: {
              ...c,
              id_credito: credito.id_credito,
            },
          })
        )
      );

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

          // 📌 Identificador real según tu modelo
          const cuit = (
            row["cuit"] ||
            row["documento"] ||
            row["dni"] ||
            ""
          )
            .toString()
            .trim();

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
             ASOCIADO — buscar por CUIT (identificador real)
          --------------------------------------------- */
          let asociado = await tx.asociado.findFirst({
            where: {
              cuit,
              id_mutual: ctx.mutualId,
            },
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
             PRODUCTO
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
             GENERAR CRÉDITO
          --------------------------------------------- */
          const primera_venc = primeraFechaVencimiento(
            new Date(),
            producto.dia_vencimiento,
            producto.regla_vencimiento
          );

          await tx.credito.create({
            data: {
              id_asociado: asociado.id_asociado,
              id_producto: producto.id_producto,
              monto,
              tasa_interes: producto.tasa_interes,
              numero_cuotas: producto.numero_cuotas,
              dia_vencimiento: producto.dia_vencimiento,
              regla_vencimiento: producto.regla_vencimiento,
              primera_venc,
              saldo_capital_inicial: monto,
              saldo_capital_actual: monto,
              cuotas_pagadas: 0,
              cuotas_pendientes: producto.numero_cuotas,
              estado: EstadoCredito.activo,
              usuario_creacion: ctx.clerkId,
            },
          });

          creados++;
        } catch (e) {
          console.error(e);
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