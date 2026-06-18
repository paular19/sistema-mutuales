"use server";

import { withRLS } from "@/lib/db/with-rls";
import { getServerUser } from "@/lib/auth/get-server-user";
import * as XLSX from "xlsx";
import { addMonths } from "date-fns";
import { EstadoCredito, EstadoCuota, VencimientoRegla } from "@prisma/client";
import { revalidatePath } from "next/cache";

/* ───────── Helpers de fechas / cálculos ───────── */
function inicioDelDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function ultimoDiaDelMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function ajustarAlMes(base: Date, dia: number, regla: VencimientoRegla) {
  const last = ultimoDiaDelMes(base);
  const target = regla === "AJUSTAR_ULTIMO_DIA" && dia > last ? last : dia;
  return new Date(base.getFullYear(), base.getMonth(), target, 0, 0, 0, 0);
}

function primeraFechaVencimiento(fechaBase: Date, dia: number, regla: VencimientoRegla) {
  const hoy = inicioDelDia(fechaBase);
  // Regla de negocio: la primera cuota siempre vence en el mes siguiente.
  return ajustarAlMes(addMonths(hoy, 1), dia, regla);
}

async function obtenerFechaActualDB(tx: any): Promise<Date> {
  // Usa la fecha de DB para evitar desfasajes entre reloj de app y Postgres.
  const rows = await tx.$queryRaw<{ hoy: Date }[]>`
    SELECT CURRENT_DATE::timestamp AS hoy
  `;

  const hoy = rows?.[0]?.hoy;
  return hoy ? inicioDelDia(new Date(hoy)) : inicioDelDia(new Date());
}

function parseNumberField(value: FormDataEntryValue | null) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLocalDateField(value: FormDataEntryValue | null) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;

  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }

  return parsed;
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calcularDiasExtraDocumento(fechaBase: Date, fechaComparar: Date) {
  const base = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
  const comparar = new Date(fechaComparar.getFullYear(), fechaComparar.getMonth(), fechaComparar.getDate());
  const mesSiguiente = new Date(
    base.getFullYear(),
    base.getMonth() + 1,
    base.getDate()
  );
  const msDia = 1000 * 60 * 60 * 24;
  return Math.round((comparar.getTime() - mesSiguiente.getTime()) / msDia);
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

      const nombreProductoNormalizado = normalizarTexto(producto.nombre);
      const esDocumentoSolaFirma =
        nombreProductoNormalizado.includes("documento") &&
        nombreProductoNormalizado.includes("sola firma");
      const tipo_operacion = esDocumentoSolaFirma ? "documento_sola_firma" : "credito";

      const tasaInteresOverride = parseNumberField(formData.get("tasa_interes"));
      const primeraVencOverride = parseLocalDateField(formData.get("primera_venc"));

  const fechaBase = await obtenerFechaActualDB(tx);

  /* 🔹 Cantidad de cuotas */
  const rawNumeroCuotas = formData.get("numero_cuotas");
  let numeroCuotas = rawNumeroCuotas ? Number(rawNumeroCuotas) : 1;

      if (!Number.isFinite(numeroCuotas) || numeroCuotas <= 0) {
        numeroCuotas = 1;
      }

      /* 🔹 Fecha de creación del crédito */
      const fechaCreacionStr = formData.get("fecha_creacion");
      // IMPORTANTE: new Date("2026-01-22") parsea como UTC, lo que causa
      // que getDate() devuelva un día distinto según timezone.
      // Parseamos manualmente para garantizar fecha local correcta.
      let hoy: Date;
      if (fechaCreacionStr) {
        const [y, m, d] = String(fechaCreacionStr).split('-').map(Number);
        hoy = new Date(y, m - 1, d);
      } else {
        hoy = fechaBase;
      }

      /* ──────────────────────────────────────────────
       *  🧮 Parámetros financieros
       * ────────────────────────────────────────────── */

      // tasa mensual (como porcentaje) y su forma decimal
      const tasaMensualPercent = esDocumentoSolaFirma
        ? tasaInteresOverride
        : producto.tasa_interes;

      if (tasaMensualPercent === null || tasaMensualPercent <= 0) {
        return { error: "La tasa de interés debe ser mayor a 0." };
      }

      const tasaMensual = tasaMensualPercent / 100;

      // comisión de gestión (porcentaje) aplicada al monto inicial. Por defecto 7.816712% si no está definida
      const gestionPct = esDocumentoSolaFirma
        ? 0
        : (producto.comision_gestion ?? 7.816712);

      if (esDocumentoSolaFirma && !primeraVencOverride) {
        return { error: "Debe seleccionar la primera fecha de vencimiento." };
      }

      const diaVencimiento = esDocumentoSolaFirma
        ? (primeraVencOverride?.getDate() ?? null)
        : producto.dia_vencimiento;

      if (diaVencimiento === null || diaVencimiento < 1 || diaVencimiento > 31) {
        return { error: "El día de vencimiento debe estar entre 1 y 31." };
      }

      const reglaVencimiento = esDocumentoSolaFirma
        ? VencimientoRegla.ESTRICTO
        : producto.regla_vencimiento;

      // Monto final sobre el que se aplicarán los intereses = monto inicial + comisión de gestión
      const adjustedMonto = monto * (1 + gestionPct / 100);

      const capitalPorCuota = adjustedMonto / numeroCuotas;

      // Primera fecha de vencimiento según regla de producto
      const primera_venc = esDocumentoSolaFirma
        ? new Date(
          (primeraVencOverride as Date).getFullYear(),
          (primeraVencOverride as Date).getMonth(),
          (primeraVencOverride as Date).getDate()
        )
        : primeraFechaVencimiento(
          hoy,
          diaVencimiento,
          reglaVencimiento
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

      // Cálculo de prorrateo:
      // - Documento a sola firma usa días relativos al mes base (puede ser negativo)
      // - Resto mantiene días extra sobre 30
      // tasaMensual = tasaAnual * 30 / 360
      // % = (tasaMensual / 30) × diasProrrateo
      // agregado = adjustedMonto × (% / 100)
      const diasExtraDocumento = calcularDiasExtraDocumento(hoySinHora, primeraSinHora);

      const diasProrrateo = esDocumentoSolaFirma
        ? diasExtraDocumento
        : Math.max(0, diasEntre - 30);
      let interesProrrateado = 0;
      if (diasProrrateo !== 0) {
        const tasaAnual = tasaMensualPercent * 12;
        const tasaMensualNueva = (tasaAnual * 30) / 360;
        const porcentaje = (tasaMensualNueva / 30) * diasProrrateo;
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
      let ultimoVencimiento = new Date(primera_venc);
      for (let idx = 0; idx < numeroCuotas; idx++) {
        const fecha_vencimiento = idx === 0
          ? new Date(primera_venc)
          : esDocumentoSolaFirma
            ? ajustarAlMes(
              addMonths(ultimoVencimiento, 1),
              diaVencimiento,
              reglaVencimiento
            )
            : ajustarAlMes(
              addMonths(primera_venc, idx),
              diaVencimiento,
              reglaVencimiento
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

        ultimoVencimiento = fecha_vencimiento;

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
          tipo_operacion,

          tasa_interes: tasaMensualPercent,
          numero_cuotas: numeroCuotas,
          dia_vencimiento: Math.trunc(diaVencimiento),
          regla_vencimiento: reglaVencimiento,
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
 *  🔹 ANULAR CRÉDITO (sin pagos registrados)
 * ────────────────────────────────────────────── */
export async function anularCredito(id_credito: number) {
  try {
    const info = await getServerUser();
    if (!info) return { error: "Usuario no autenticado" };

    const mutualId = info.mutualId;
    const clerkId = info.userId;

    if (!mutualId) return { error: "Mutual ID no encontrado" };
    if (!Number.isFinite(id_credito)) return { error: "ID de crédito inválido" };

    return await withRLS(mutualId, clerkId, async (tx) => {
      const credito = await tx.credito.findUnique({
        where: { id_credito },
        select: { estado: true },
      });

      if (!credito) return { error: "Crédito no encontrado" };
      if (credito.estado === EstadoCredito.cancelado) {
        return { error: "El crédito ya está cancelado" };
      }

      const pagoExistente = await tx.pagoCuota.findFirst({
        where: { cuota: { id_credito } },
        select: { id_pago_cuota: true },
      });

      if (pagoExistente) {
        return { error: "No se puede anular: el crédito tiene pagos registrados" };
      }

      await tx.credito.update({
        where: { id_credito },
        data: {
          estado: EstadoCredito.cancelado,
          cuotas_pendientes: 0,
          saldo_capital_actual: 0,
          usuario_modificacion: clerkId,
        },
      });

      revalidatePath("/dashboard/creditos");

      return { success: true };
    });
  } catch (err) {
    console.error("❌ Error al anular crédito:", err);
    return { error: "Error inesperado al anular el crédito." };
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
      const fechaBase = await obtenerFechaActualDB(tx);

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

          const hoy = fechaBase;

          const tasaMensualPercent = producto.tasa_interes;
          const tasaMensual = tasaMensualPercent / 100;

          // comisión de gestión (porcentaje) aplicada al monto inicial. Por defecto 7.816712%
          const gestionPct = producto.comision_gestion ?? 7.816712;

          const adjustedMonto = monto * (1 + gestionPct / 100);

          const primera_venc = primeraFechaVencimiento(
            fechaBase,
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

