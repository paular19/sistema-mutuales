// utils/calcularCuotas.ts

export interface CalcularCuotasParams {
  monto: number;
  cuotas: number;
  tasaMensual: number;
  comisionPct: number; // commercializadora pct (will be treated as percentage)
  gestionPct?: number | null; // gestion pct (percentage applied to initial monto)
  diaVencimiento: number;
  reglaVencimiento: string;
  comercializadoraPct?: number;
  fechaOtorgamiento?: Date; // fecha de creación del crédito
}

export function calcularCuotasCredito({
  monto,
  cuotas,
  tasaMensual,
  comisionPct,
  gestionPct,
  diaVencimiento,
  reglaVencimiento,
  comercializadoraPct = 3,
  fechaOtorgamiento
}: CalcularCuotasParams) {
  if (!monto || !cuotas || !tasaMensual) return null;

  const hoy = fechaOtorgamiento || new Date();

  const tasaMensualPercent = tasaMensual; // e.g. 9.58
  const tasaMensualDecimal = tasaMensualPercent / 100;
  const tasaAnualDecimal = tasaMensualDecimal * 12;

  // `gestionPct` es la comisión de gestión (porcentaje) aplicada al monto inicial
  const gestionAplicada = (gestionPct ?? 0) / 100;

  // Monto final sobre el que se aplica interés = monto inicial + comision de gestión
  const adjustedMonto = monto * (1 + gestionAplicada);

  // Primera fecha de vencimiento: siempre en el mes siguiente o posterior
  // Si hoy es 15/1 y el cierre es día 20, el primer vencimiento es 20/2 (no 20/1)
  let primerVenc = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1, // Siempre mes siguiente
    diaVencimiento
  );

  if (reglaVencimiento === "AJUSTAR_ULTIMO_DIA") {
    const ultimo = new Date(primerVenc.getFullYear(), primerVenc.getMonth() + 1, 0).getDate();
    if (diaVencimiento > ultimo) {
      primerVenc.setDate(ultimo);
    }
  }

  // Fecha de cierre del mes actual (para calcular prorrateo)
  let fechaCierre = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    diaVencimiento
  );

  if (reglaVencimiento === "AJUSTAR_ULTIMO_DIA") {
    const ultimo = new Date(fechaCierre.getFullYear(), fechaCierre.getMonth() + 1, 0).getDate();
    if (diaVencimiento > ultimo) {
      fechaCierre.setDate(ultimo);
    }
  }

  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const cierreSinHora = new Date(
    fechaCierre.getFullYear(),
    fechaCierre.getMonth(),
    fechaCierre.getDate()
  );

  const msDia = 1000 * 60 * 60 * 24;
  // Calcular días solo hasta el cierre del mes actual
  const diasEntre = Math.max(
    0,
    Math.round((cierreSinHora.getTime() - hoySinHora.getTime()) / msDia)
  );

  // Interés prorrateado para la PRIMERA cuota:
  // Se calcula el interés proporcional a los días desde hoy hasta el cierre del mes actual
  // El prorrateo se basa en los días del mes actual, NO en los días hasta el vencimiento
  const interesProrrateado = adjustedMonto * (tasaMensualPercent / 100) * (diasEntre / 30);

  // Comisión de gestión total aplicada al inicio (monto * gestionPct)
  const comisionTotal = monto * gestionAplicada;

  // Porcentaje que retiene la comercializadora sobre cada cuota (ej: 3%)
  const comercializadoraFactor = 1 - (comercializadoraPct / 100);

  // Calcular cuota usando fórmula de anualidad con tasa efectiva mensual
  const i = tasaMensualPercent / 100; // tasa efectiva mensual en decimal (ej: 9.58% -> 0.0958)
  const pow = Math.pow(1 + i, cuotas);
  // Fórmula exacta: (M * (1+i)^n * i) / ((1+i)^n - 1)
  const cuotaBruta = adjustedMonto * (pow * i) / (pow - 1);

  // Calcular capital e interés de la primera cuota para mostrar en resumen
  const interesEstandarPrimeraCuota = adjustedMonto * tasaMensualDecimal;
  const capitalPrimeraCuota = cuotaBruta - interesEstandarPrimeraCuota;

  // Generar primer pago con prorrateo (se suma interesProrrateado al primer bruto)
  const primeraCuotaBruta = cuotaBruta + interesProrrateado;

  // Valores SIN aplicar retención comercializadora (valores brutos)
  const primeraCuota = Math.round(primeraCuotaBruta * 100) / 100;
  const cuotaRestante = Math.round(cuotaBruta * 100) / 100;

  const totalFinanciado = Math.round((primeraCuota + cuotaRestante * (cuotas - 1)) * 100) / 100;

  // Generar detalle de todas las cuotas con fechas de cierre
  const detalleCuotas: Array<{
    numero: number;
    fechaCierre: Date;
    monto: number;
  }> = [];

  let fechaActual = new Date(primerVenc);

  for (let i = 1; i <= cuotas; i++) {
    const montoCuota = i === 1 ? primeraCuota : cuotaRestante;

    detalleCuotas.push({
      numero: i,
      fechaCierre: new Date(fechaActual),
      monto: montoCuota
    });

    // Calcular siguiente fecha
    if (i < cuotas) {
      fechaActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, diaVencimiento);

      // Aplicar regla de vencimiento para meses con menos días
      if (reglaVencimiento === "AJUSTAR_ULTIMO_DIA") {
        const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
        if (diaVencimiento > ultimoDia) {
          fechaActual.setDate(ultimoDia);
        }
      }
    }
  }

  return {
    capitalPorCuota: capitalPrimeraCuota, // capital de la primera cuota (sin prorrateo)
    interesProrrateado,
    interesMensualNormal: interesEstandarPrimeraCuota, // interés estándar sin prorrateo
    comisionTotal,
    primeraCuota,
    cuotaRestante,
    totalFinanciado,
    montoInicial: monto,
    montoFinal: adjustedMonto,
    diasEntre,
    primerVenc,
    detalleCuotas
  };
}
