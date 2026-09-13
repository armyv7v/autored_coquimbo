export interface Incident {
  type: string;
  description: string;
  createdAt: string;
}

// Claves de tipo de incidente reales de la red (los documentos usan ROBO /
// SOSPECHOSO / MARCAJE / OTRO); las claves en inglés se mantienen por
// compatibilidad con datos históricos (A-30).
const typeLabels: Record<string, string> = {
  ROBO: 'robos',
  ROBBERY: 'robos',
  SOSPECHOSO: 'actividad sospechosa',
  SUSPICIOUS_ACTIVITY: 'actividad sospechosa',
  MARCAJE: 'marcajes',
  VANDALISM: 'vandalismo',
  TRESPASSING: 'intrusiones',
  FRAUD: 'fraudes',
  OTRO: 'incidentes varios',
  OTHER: 'incidentes varios',
};

function getMostCommonType(incidents: Incident[]): string | null {
  const counts = incidents.reduce<Record<string, number>>((acc, incident) => {
    const type = incident.type || 'OTRO';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const [topType] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return topType || null;
}

export async function generateSecurityTip(incidents: Incident[]): Promise<string> {
  if (incidents.length === 0) return "Aún no hay datos suficientes para generar un tip de seguridad. Manténgase alerta.";

  const topType = getMostCommonType(incidents);
  const recentCount = incidents.filter((incident) => {
    const createdAt = new Date(incident.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 7;
  }).length;

  if (topType === 'ROBO' || topType === 'ROBBERY') {
    return 'Se detecta recurrencia de robos: refuerce cierres, control de accesos y coordine apertura/cierre entre locales vecinos.';
  }

  if (topType === 'SOSPECHOSO' || topType === 'SUSPICIOUS_ACTIVITY' || topType === 'TRESPASSING') {
    return 'Predominan los reportes de actividad sospechosa: pida verificación temprana, registre patentes y evite confrontaciones sin apoyo.';
  }

  if (topType === 'FRAUD') {
    return 'Hay señales de fraude: valide identidad, medios de pago y documentación antes de entregar vehículos o cerrar operaciones.';
  }

  if (recentCount >= 3) {
    return 'Hubo varios incidentes recientes: refuerce la comunicación interna y revise cámaras, iluminación y protocolos de respuesta del personal.';
  }

  const readableType = typeLabels[topType || 'OTRO'] || 'incidentes de seguridad';
  return `Se repiten ${readableType}: mantenga registro compartido, controles preventivos y aviso temprano entre locales para reducir la exposición.`;
}
