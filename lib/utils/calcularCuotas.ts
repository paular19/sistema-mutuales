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
}

export function calcularCuotasCredito({
  monto,
  cuotas,
  tasaMensual,
  comisionPct,
  gestionPct,
  diaVencimiento,
  reglaVencimiento
  , comercializadoraPct = 3
}: CalcularCuotasParams) {
  if (!monto || !cuotas || !tasaMensual) return null;

  const hoy = new Date();

  const tasaMensualPercent = tasaMensual; // e.g. 9.58
  const tasaMensualDecimal = tasaMensualPercent / 100;
  const tasaAnualDecimal = tasaMensualDecimal * 12;

  // `gestionPct` es la comisión de gestión (porcentaje) aplicada al monto inicial
  const gestionAplicada = (gestionPct ?? 0) / 100;

  // Monto final sobre el que se aplica interés = monto inicial + comision de gestión
  const adjustedMonto = monto * (1 + gestionAplicada);

  let primerVenc = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    diaVencimiento
  );

  if (primerVenc.getTime() <= hoy.getTime()) {
    primerVenc = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      diaVencimiento
    );
  }

  if (reglaVencimiento === "AJUSTAR_ULTIMO_DIA") {
    const ultimo = new Date(primerVenc.getFullYear(), primerVenc.getMonth() + 1, 0).getDate();
    if (diaVencimiento > ultimo) {
      primerVenc.setDate(ultimo);
    }
  }

  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const venSinHora = new Date(
    primerVenc.getFullYear(),
    primerVenc.getMonth(),
    primerVenc.getDate()
  );

  const msDia = 1000 * 60 * 60 * 24;
  const diasEntre = Math.max(
    0,
    Math.round((venSinHora.getTime() - hoySinHora.getTime()) / msDia)
  );

  // Intereses se calculan sobre el monto ajustado.
  // Nueva regla: (tasaMensual/30) * (diasEntre - 30) / 100 * montoFinal
  const diasExtra = Math.max(0, diasEntre - 30);
  const interesProrrateado = adjustedMonto * (tasaMensualPercent / 30) * (diasExtra / 100);

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
    primerVenc
  };
}
