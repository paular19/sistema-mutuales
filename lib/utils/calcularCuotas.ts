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

  const tasaMensualDecimal = tasaMensual / 100;
  const tasaAnualDecimal = tasaMensualDecimal * 12;

  // `gestionPct` es la comisión de gestión (porcentaje) aplicada al monto inicial
  const gestionAplicada = (gestionPct ?? 0) / 100;

  // Monto final sobre el que se aplica interés = monto inicial + comision de gestión
  const adjustedMonto = monto * (1 + gestionAplicada);

  const capitalPorCuota = adjustedMonto / cuotas;

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

  // Intereses se calculan sobre el monto ajustado
  const interesProrrateado = adjustedMonto * tasaAnualDecimal * (diasEntre / 360);

  const interesMensualNormal = capitalPorCuota * tasaMensualDecimal;

  // Comisión de gestión total aplicada al inicio (monto * gestionPct)
  const comisionTotal = monto * gestionAplicada;

  // Porcentaje que retiene la comercializadora sobre cada cuota (ej: 3%)
  const comercializadoraFactor = 1 - (comercializadoraPct / 100);

  const primeraCuotaAntesRetencion = capitalPorCuota + interesProrrateado;

  const primeraCuota = Math.round(primeraCuotaAntesRetencion * comercializadoraFactor * 100) / 100;

  const cuotaRestante = Math.round((capitalPorCuota + interesMensualNormal) * comercializadoraFactor * 100) / 100;

  const totalFinanciado = Math.round((primeraCuota + cuotaRestante * (cuotas - 1)) * 100) / 100;

  return {
    capitalPorCuota,
    interesProrrateado,
    interesMensualNormal,
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
