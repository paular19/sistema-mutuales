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

  // Primera fecha de vencimiento: depende del día de emisión
  // Si emite después del día 15 → vencimiento 2 meses después
  // Si emite día 15 o antes → vencimiento 1 mes después
  const diaEmision = hoy.getDate();
  const mesesASumar = diaEmision > 15 ? 2 : 1;
  let primerVenc = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + mesesASumar,
    diaVencimiento
  );

  if (reglaVencimiento === "AJUSTAR_ULTIMO_DIA") {
    const ultimo = new Date(primerVenc.getFullYear(), primerVenc.getMonth() + 1, 0).getDate();
    if (diaVencimiento > ultimo) {
      primerVenc.setDate(ultimo);
    }
  }

  // Calcular días entre la fecha de emisión y el primer vencimiento
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const primerVencSinHora = new Date(
    primerVenc.getFullYear(),
    primerVenc.getMonth(),
    primerVenc.getDate()
  );

  const msDia = 1000 * 60 * 60 * 24;
  const diasEntre = Math.max(
    0,
    Math.round((primerVencSinHora.getTime() - hoySinHora.getTime()) / msDia) - 1
  );

  // Interés prorrateado para la PRIMERA cuota:
  // Solo se prorratean los días EXTRA más allá de 30 (un mes estándar)
  // La cuota base ya incluye 30 días de interés, el prorrateo es por los días adicionales
  // Ejemplo: Si emite el 22/01 y vence el 20/03 (58 días), diasExtra = 28, prorrateo = (28/30) * interés mensual
  const diasExtra = Math.max(0, diasEntre - 31);
  const interesProrrateado = adjustedMonto * (tasaMensualPercent / 100) * (diasExtra / 30);

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
  // Redondear primero
  let primeraCuota = Math.round(primeraCuotaBruta * 100) / 100;
  let cuotaRestante = Math.round(cuotaBruta * 100) / 100;

  // Calcular total financiado inicial
  let totalFinanciado = Math.round((primeraCuota + cuotaRestante * (cuotas - 1)) * 100) / 100;

  // 🔹 REDONDEO A VALORES LIMPIOS: Redondear total al múltiplo de $10,000 más cercano
  // Esto hace que el monto sea más "limpio" (ej: $1,496,515.95 → $1,500,000)
  const multiplo = 10000;
  const montoObjetivo = Math.ceil(totalFinanciado / multiplo) * multiplo;
  const diferencia = montoObjetivo - totalFinanciado;

  if (Math.abs(diferencia) > 0.01 && cuotas > 1) {
    // Distribuir diferencia equitativamente entre cuotas restantes
    const ajustePorCuota = Math.round((diferencia / (cuotas - 1)) * 100) / 100;

    // Ajustar cuota restante
    cuotaRestante = Math.round((cuotaRestante + ajustePorCuota) * 100) / 100;

    // Recalcular total
    totalFinanciado = Math.round((primeraCuota + cuotaRestante * (cuotas - 1)) * 100) / 100;

    // Si aún hay pequeña diferencia, ajustar en la última cuota
    const diferenciaFinal = montoObjetivo - totalFinanciado;
    if (Math.abs(diferenciaFinal) > 0.01) {
      cuotaRestante = Math.round((cuotaRestante + diferenciaFinal) * 100) / 100;
      totalFinanciado = montoObjetivo;
    }
  }

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
