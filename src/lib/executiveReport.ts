export interface IncidentSummary {
  id: string;
  type: string;
  description: string;
  dealershipId?: string;
  createdAt: string;
  status?: string;
  imageUrl?: string;
  location?: { lat: number; lng: number };
}

export function formatWhatsAppFlashReport(incident: IncidentSummary, reporterName?: string): string {
  const timestamp = new Date(incident.createdAt).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  });

  const typeEmoji = incident.type === 'ROBO' ? '🚨' : incident.type === 'SOSPECHOSO' ? '⚠️' : '📍';

  let text = `${typeEmoji} *ALERTA TÁCTICA AUTORED COQUIMBO* ${typeEmoji}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📌 *Tipo:* ${incident.type}\n`;
  text += `🏢 *Sede:* ${incident.dealershipId || 'Central AutoRed'}\n`;
  text += `⏰ *Hora:* ${timestamp}\n`;
  text += `📝 *Detalle:* ${incident.description || 'Sin descripción adicional.'}\n`;
  
  if (reporterName) {
    text += `👤 *Emisor:* ${reporterName}\n`;
  }
  
  if (incident.location?.lat && incident.location?.lng) {
    text += `🗺️ *GPS:* https://maps.google.com/?q=${incident.location.lat},${incident.location.lng}\n`;
  }

  if (incident.imageUrl) {
    text += `📸 *Evidencia Adjunta:* ${incident.imageUrl}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🛡️ *Estado de Red:* ACTIVADA - Alerta Máxima`;

  return text;
}

export function formatExecutiveDailyDigest(incidents: IncidentSummary[], activeDealershipsCount: number): string {
  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const total = incidents.length;
  const robos = incidents.filter(i => i.type === 'ROBO').length;
  const sospechosos = incidents.filter(i => i.type === 'SOSPECHOSO').length;
  const marcajes = incidents.filter(i => i.type === 'MARCAJE').length;
  const abiertos = incidents.filter(i => i.status === 'OPEN' || !i.status).length;
  const resueltos = incidents.filter(i => i.status === 'RESOLVED').length;

  let text = `📊 *MINUTA EJECUTIVA DE SEGURIDAD AUTORED*\n`;
  text += `📅 *Fecha:* ${today}\n`;
  text += `🏢 *Nodos Conectados:* ${activeDealershipsCount} automotoras\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📈 *RESUMEN OPERATIVO:*\n`;
  text += `• Total Eventos Registrados: *${total}*\n`;
  text += `• 🚨 Robos / Asaltos: *${robos}*\n`;
  text += `• ⚠️ Movimientos Sospechosos: *${sospechosos}*\n`;
  text += `• 📍 Marcajes Detectados: *${marcajes}*\n\n`;
  text += `🛡️ *ESTADO DE CASOS:*\n`;
  text += `• 🔴 Casos Abiertos / Seguimiento: *${abiertos}*\n`;
  text += `• 🟢 Casos Resueltos / Neutralizados: *${resueltos}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔒 *Red de Protección Coquimbo - Operación Normal*`;

  return text;
}
