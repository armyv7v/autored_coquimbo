/**
 * Robust date formatting utility for Firebase Timestamps, ISO strings, and Date objects.
 */

/**
 * N-D4: sin fecha legible el fallback era `new Date()` — el documento
 * renderizaba la hora de "ahora" y el operador no podía confiar en la hora
 * mostrada (todas las tarjetas del Historial mostraban la misma hora en la
 * auditoría del 15-11). Devuelve null y la UI muestra "fecha desconocida".
 */
export function parseIncidentDate(createdAt: any): Date | null {
  if (!createdAt) return null;
  try {
    if (typeof createdAt?.toDate === 'function') {
      const d = createdAt.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof createdAt?.seconds === 'number') {
      return new Date(createdAt.seconds * 1000);
    }
    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  } catch (e) {
    console.warn('Error parsing date:', e);
  }
  return null;
}

export function formatTimeCL(createdAt: any): string {
  const d = parseIncidentDate(createdAt);
  if (!d) return 'hora desconocida';
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateCL(createdAt: any): string {
  const d = parseIncidentDate(createdAt);
  if (!d) return 'fecha desconocida';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatFullDateTimeCL(createdAt: any): string {
  const d = parseIncidentDate(createdAt);
  if (!d) return 'fecha desconocida';
  return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
}
