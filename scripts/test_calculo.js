// Test directo de la fórmula de cuota
const adjustedMonto = 1078200.00;
const tasaMensualPercent = 9.58;
const numeroCuotas = 6;

const i = tasaMensualPercent / 100;
const pow = Math.pow(1 + i, numeroCuotas);
const cuotaBruta = adjustedMonto * (pow * i) / (pow - 1);

console.log('Prueba de cálculo de cuota:');
console.log('F9 (adjustedMonto):', adjustedMonto);
console.log('L10 (tasa %):', tasaMensualPercent);
console.log('F10 (cuotas):', numeroCuotas);
console.log('i (tasa decimal):', i);
console.log('pow ((1+i)^n):', pow);
console.log('Cuota bruta:', cuotaBruta.toFixed(2));
console.log('Esperado: 244523.42');
