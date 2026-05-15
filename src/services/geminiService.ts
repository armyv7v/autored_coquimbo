import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export interface Incident {
  type: string;
  description: string;
  createdAt: string;
}

export async function generateSecurityTip(incidents: Incident[]): Promise<string> {
  if (!apiKey) return "Configurá tu GEMINI_API_KEY para recibir consejos de seguridad basados en IA.";
  if (incidents.length === 0) return "No hay suficientes datos para generar un tip de seguridad específico. Mantente alerta.";

  const incidentSummary = incidents
    .slice(0, 10)
    .map(i => `- ${i.type}: ${i.description} (${new Date(i.createdAt).toLocaleString()})`)
    .join("\n");

  const prompt = `Analiza los siguientes incidentes de seguridad reportados en una red de automotoras en Coquimbo, Chile, y genera un ÚNICO tip de seguridad corto (máximo 2 frases) y práctico para los otros dueños de locales.
  
  Incidentes recientes:
  ${incidentSummary}
  
  Escribe el tip en español, con un tono profesional y preventivo. No uses encabezados.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || "Refuerza la vigilancia perimetral y mantén a tu equipo informado.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Refuerza la vigilancia perimetral y mantén a tu equipo informado sobre movimientos sospechosos.";
  }
}
