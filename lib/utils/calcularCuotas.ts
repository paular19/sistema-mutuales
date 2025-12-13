// utils/calcularCuotas.ts

export interface CalcularCuotasParams {
  monto: number;
  cuotas: number;
  tasaMensual: number;
  comisionPct: number;
  gestion?: number | null;
  diaVencimiento: number;
  reglaVencimiento: string; 
}

export function calcularCuotasCredito({
  monto,
  cuotas,
  tasaMensual,
  comisionPct,
  gestion,
  diaVencimiento,
  reglaVencimiento
}: CalcularCuotasParams) {
  if (!monto || !cuotas || !tasaMensual) return null;

  const hoy = new Date();

  const tasaMensualDecimal = tasaMensual / 100;
  const tasaAnualDecimal = tasaMensualDecimal * 12;

  const capitalPorCuota = monto / cuotas;

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

  const interesProrrateado = monto * tasaAnualDecimal * (diasEntre / 360);

  const interesMensualNormal = capitalPorCuota * tasaMensualDecimal;

  const comisionPorCuota = capitalPorCuota * (comisionPct / 100);
  const comisionTotal = comisionPorCuota * cuotas;

  const primeraCuota =
    capitalPorCuota +
    interesProrrateado +
    comisionTotal +
    (gestion ?? 0);

  const cuotaRestante = capitalPorCuota + interesMensualNormal;

  const totalFinanciado =
    primeraCuota + cuotaRestante * (cuotas - 1);

  return {
    capitalPorCuota,
    interesProrrateado,
    interesMensualNormal,
    comisionPorCuota,
    comisionTotal,
    primeraCuota,
    cuotaRestante,
    totalFinanciado,
    diasEntre,
    primerVenc
  };
}
