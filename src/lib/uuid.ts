/**
 * Generates a RFC4122 compliant UUID v4 safely across all environments (including non-secure contexts).
 * In non-secure contexts (like accessing via IP on mobile), window.crypto.randomUUID is not available.
 */
export function safeUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // Fallback in case of unexpected errors
    }
  }

  // Robust RFC4122 v4 compliant fallback generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
