// Validação de GTIN (GTIN-8/12/13/14) com dígito verificador mod-10.
// Espelha public.validate_gtin_check_digit no banco.

export const VALID_GTIN_LENGTHS = [8, 12, 13, 14] as const;

export function isValidGtinFormat(gtin: string): boolean {
  return /^[0-9]+$/.test(gtin) && VALID_GTIN_LENGTHS.includes(gtin.length as 8 | 12 | 13 | 14);
}

/** Calcula o dígito verificador para o corpo do GTIN (sem o último dígito). */
export function computeGtinCheckDigit(body: string): number {
  let sum = 0;
  // pesos alternados 3/1 da direita para a esquerda
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    const weight = i % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  return (10 - (sum % 10)) % 10;
}

/** Valida formato + dígito verificador. Nunca aceita GTIN "quase certo". */
export function isValidGtin(gtin: string | null | undefined): boolean {
  if (!gtin || !isValidGtinFormat(gtin)) return false;
  const body = gtin.slice(0, -1);
  const checkDigit = Number(gtin[gtin.length - 1]);
  return computeGtinCheckDigit(body) === checkDigit;
}
