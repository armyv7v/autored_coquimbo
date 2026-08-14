/**
 * Robust date formatting utility for Firebase Timestamps, ISO strings, and Date objects.
 */

export function parseIncidentDate(createdAt: any): Date {
  if (!createdAt) return new Date();
  try {
    if (typeof createdAt?.toDate === 'function') {
      return createdAt.toDate();
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
  return new Date();
}

export function formatTimeCL(createdAt: any): string {
  const d = parseIncidentDate(createdAt);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateCL(createdAt: any): string {
  const d = parseIncidentDate(createdAt);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatFullDateTimeCL(createdAt: any): string {
  const d = parseIncidentDate(createdAt);
  return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
}
