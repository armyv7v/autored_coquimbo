/**
 * Chilean License Plate (Patente Vehicular) Validator and Formatter
 * Supports both modern (4 letters + 2 numbers) and legacy (2 letters + 4 numbers) Chilean plate formats.
 */

export interface PlateValidationResult {
  isValid: boolean;
  normalized: string; // e.g. "GKLP42"
  formatted: string; // e.g. "GK·LP·42" or "AB·12·34"
  formatType: 'NEW_4L_2N' | 'OLD_2L_4N' | 'MOTO' | 'INVALID';
}

/**
 * Normalizes any plate string by stripping spaces, dots, hyphens and converting to uppercase.
 */
export function normalizePlate(plate: string): string {
  if (!plate) return '';
  return plate
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .trim();
}

/**
 * Validates Chilean vehicle license plate format.
 */
export function validateChileanPlate(rawPlate: string): PlateValidationResult {
  const clean = normalizePlate(rawPlate);

  // New Format (2007 - Present): 4 Letters + 2 Digits (e.g. GKLP42, BBBB10)
  // Excludes vowels A, E, I, O, U, M, N, Ñ, Q to avoid confusion and offensive words.
  const newFormatRegex = /^[B-DF-HJ-NP-TV-Z]{4}[0-9]{2}$/;
  if (newFormatRegex.test(clean)) {
    const formatted = `${clean.slice(0, 2)}·${clean.slice(2, 4)}·${clean.slice(4, 6)}`;
    return {
      isValid: true,
      normalized: clean,
      formatted,
      formatType: 'NEW_4L_2N',
    };
  }

  // Legacy Format (1985 - 2007): 2 Letters + 4 Digits (e.g. AB1234, CD5678)
  const oldFormatRegex = /^[A-Z]{2}[0-9]{4}$/;
  if (oldFormatRegex.test(clean)) {
    const formatted = `${clean.slice(0, 2)}·${clean.slice(2, 4)}·${clean.slice(4, 6)}`;
    return {
      isValid: true,
      normalized: clean,
      formatted,
      formatType: 'OLD_2L_4N',
    };
  }

  // Motorcycles: 2 Letters + 3 Digits or 3 Letters + 2 Digits
  const motoRegex = /^([A-Z]{2}[0-9]{3}|[A-Z]{3}[0-9]{2})$/;
  if (motoRegex.test(clean)) {
    return {
      isValid: true,
      normalized: clean,
      formatted: clean,
      formatType: 'MOTO',
    };
  }

  // Generic fallback if user enters alphanumeric 6 chars
  if (clean.length === 6) {
    return {
      isValid: true,
      normalized: clean,
      formatted: `${clean.slice(0, 2)}·${clean.slice(2, 4)}·${clean.slice(4, 6)}`,
      formatType: 'NEW_4L_2N',
    };
  }

  return {
    isValid: false,
    normalized: clean,
    formatted: clean,
    formatType: 'INVALID',
  };
}

/**
 * Searches and extracts candidate Chilean plates from any raw OCR string.
 */
export function extractPlatesFromText(text: string): string[] {
  if (!text) return [];
  const matches: string[] = [];
  
  // Find words of 6 characters
  const cleanTokens = text.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/);
  for (const token of cleanTokens) {
    const check = validateChileanPlate(token);
    if (check.isValid && !matches.includes(check.formatted)) {
      matches.push(check.formatted);
    }
  }

  return matches;
}
