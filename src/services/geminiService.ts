export interface Incident {
  type: string;
  description: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  ROBBERY: 'robos',
  SUSPICIOUS_ACTIVITY: 'actividad sospechosa',
  VANDALISM: 'vandalismo',
  TRESPASSING: 'intrusiones',
  FRAUD: 'fraudes',
  OTHER: 'incidentes varios',
};

function getMostCommonType(incidents: Incident[]): string | null {
  const counts = incidents.reduce<Record<string, number>>((acc, incident) => {
    const type = incident.type || 'OTHER';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const [topType] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return topType || null;
}

export async function generateSecurityTip(incidents: Incident[]): Promise<string> {
  if (incidents.length === 0) return "No hay suficientes datos para generar un tip de seguridad específico. Mantente alerta.";

  const topType = getMostCommonType(incidents);
  const recentCount = incidents.filter((incident) => {
    const createdAt = new Date(incident.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 7;
  }).length;

  if (topType === 'ROBBERY') {
    return 'Se detecta recurrencia de robos: reforzá cierres, control de accesos y coordinación de apertura/cierre entre locales vecinos.';
  }

  if (topType === 'SUSPICIOUS_ACTIVITY' || topType === 'TRESPASSING') {
    return 'Predominan reportes de actividad sospechosa: pedí verificación temprana, registrá patentes y evitá confrontaciones sin apoyo.';
  }

  if (topType === 'FRAUD') {
    return 'Hay señales de fraude: validá identidad, medios de pago y documentación antes de entregar vehículos o cerrar operaciones.';
  }

  if (recentCount >= 3) {
    return 'Hubo varios incidentes recientes: reforzá la comunicación interna y revisá cámaras, iluminación y protocolos de respuesta del personal.';
  }

  const readableType = typeLabels[topType || 'OTHER'] || 'incidentes de seguridad';
  return `Se repiten ${readableType}: mantené registro compartido, controles preventivos y aviso temprano entre locales para reducir exposición.`;
}
