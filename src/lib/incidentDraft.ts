/**
 * Clave del borrador de incidente (UX-05), compartida para que el cierre de
 * sesión pueda limpiarlo (N-S7): en dispositivo compartido, el operador B que
 * entre tras A no debe heredar el borrador (patente, GPS, descripción) de A.
 */
export const INCIDENT_DRAFT_KEY = 'alerta-dealers:incident-draft';

export function clearIncidentDraft(): void {
  try {
    sessionStorage.removeItem(INCIDENT_DRAFT_KEY);
  } catch {
    // storage bloqueado: nada que limpiar
  }
}
