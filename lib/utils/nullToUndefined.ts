// Reemplaza recursivamente todos los `null` por `undefined`
// Manteniendo los tipos originales (genérico con TS)

export function nullToUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => nullToUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : nullToUndefined(v)])
    ) as T;
  }
  return obj;
}
