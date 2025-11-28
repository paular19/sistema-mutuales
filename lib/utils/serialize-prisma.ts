// lib/utils/serialize-prisma.ts

/**
 * Convierte objetos Prisma con Decimal, BigInt u otros tipos no serializables
 * en valores planos compatibles con Server → Client (Next.js RSC).
 *
 * - Decimal → number
 * - BigInt → number
 * - Date → ISO string
 * - null / undefined → igual
 */
export function serializePrisma(input: any): any {
  return JSON.parse(
    JSON.stringify(input, (_key, value) => {
      // Prisma.Decimal
      if (
        value &&
        typeof value === "object" &&
        value.constructor?.name === "Decimal"
      ) {
        return Number(value);
      }

      // BigInt → number
      if (typeof value === "bigint") {
        return Number(value);
      }

      // Date → string
      if (value instanceof Date) {
        return value.toISOString();
      }

      return value;
    })
  );
}
