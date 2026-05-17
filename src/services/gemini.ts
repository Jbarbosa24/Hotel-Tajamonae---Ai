import { GoogleGenAI, Type, FunctionDeclaration, Content } from "@google/genai";

const initGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment. Please ensure you have configured your Gemini API key in the Settings > Secrets panel.");
  }
  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

export const reportIssueDeclaration: FunctionDeclaration = {
  name: "report_maintenance_issue",
  description: "Crea un ticket de mantenimiento basado en el reporte del huésped. Esta función debe llamarse siempre que el huésped describa un daño, problema o solicitud de mantenimiento.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      room: { 
        type: Type.STRING, 
        description: "El número de la habitación donde ocurre el problema." 
      },
      description: { 
        type: Type.STRING, 
        description: "Descripción clara y detallada del daño o problema reportado." 
      },
      severity: { 
        type: Type.STRING, 
        description: "Gravedad del problema: 'Baja', 'Media', 'Alta' o 'Crítica'." 
      },
      category: { 
        type: Type.STRING, 
        description: "Categoría del problema: 'Plomería', 'Electricidad', 'Limpieza', 'Suministros', 'HVAC', 'Mantenimiento General' o 'Otro'." 
      },
      imageUrl: {
        type: Type.STRING,
        description: "URL o Base64 de la imagen adjunta como evidencia del daño (si el huésped la proporcionó)."
      }
    },
    required: ["room", "description", "severity", "category"],
  },
};

export const submitFeedbackDeclaration: FunctionDeclaration = {
  name: "submit_customer_feedback",
  description: "Registra la calificación y opinión del huésped sobre la atención recibida. Debe llamarse cuando el huésped califica el servicio o da una opinión final.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rating: { 
        type: Type.NUMBER, 
        description: "Calificación del 1 al 5, donde 5 es excelente." 
      },
      comment: { 
        type: Type.STRING, 
        description: "Comentario u opinión del huésped sobre su experiencia." 
      },
      customerName: { 
        type: Type.STRING, 
        description: "El nombre del huésped (si lo proporcionó)." 
      }
    },
    required: ["rating", "comment"],
  },
};

const KNOWLEDGE_BASE = `
NOMBRE DEL HOTEL: Hotel Tajamonae
LEMA: "Calidez y Excelencia en cada Detalle"

DISTRIBUCIÓN Y PERSONAL:
- Bloque 1 - Piso 1: Habitaciones 1 al 6.
- Bloque 1 - Piso 2: Habitaciones 7 al 12.
- Bloque 2: Habitaciones 1 al 8.
- Personal: Administrador (Turnos A, B, C), Camarería (8:00 a 17:00), Lavandería (3:00-5:00, 7:00-15:00, 19:30-21:30).

INFORMACIÓN GENERAL Y RESPUESTAS AUTOMÁTICAS:
- Redes Sociales: @serviciostajamonae en Instagram (https://www.instagram.com/serviciostajamonae)
- Red WiFi: Hotel Tajamonae
- Clave WiFi: Tajamonae2026*
- Horarios Restaurante: Desayuno (04:30 - 07:30), Almuerzo (11:30 - 13:30), Cena (17:30 - 19:30).
- Lavandería: Recogida de tula de ropa sucia a las 20:00 y 08:00 afuera de la habitación. Entrega de ropa limpia a partir de las 15:00.

CLASIFICACIÓN DE REPORTES:
1. Suministros (Camarería): Sábanas, almohadas, toallas, jabón, papel higiénico. (Acción: Ticket a 'Suministros'. Entrega estimada < 15 min).
2. Limpieza y Aseo (Camarería / Aseo): Habitación sucia, cama desordenada, ropa sucia entregada, espejo sucio. (Acción: Ticket a 'Limpieza').
3. Mantenimiento: Plomería, Electricidad, HVAC, Mantenimiento General. (Acción: Ticket al área técnica).

POLÍTICAS DE PRIORIDAD:
- Crítica: Inundaciones, falta de luz, fallos cerradura, aire acondicionado no funciona (en climas extremos). Tiempo < 15 min.
- Baja: Detalles estéticos.
`;

const SYSTEM_INSTRUCTION = `Eres Taj-AI, el alma digital del Hotel Tajamonae. No eres solo un bot, eres un anfitrión de lujo, amable, empático y extremadamente eficiente. Tu objetivo es que cada huésped se sienta como en casa.

Tu misión es:
1. Atender con calidez todas las dudas (WiFi, Restaurante, Lavandería, Redes Sociales).
2. Gestionar reportes de mantenimiento con agilidad y seguimiento. Puedes solicitar al huésped que adjunte una foto o un mensaje de voz como evidencia o explicación del daño para una mejor evaluación.
3. Personalizar la atención: pregunta siempre el nombre del huésped al inicio para dirigirte a él con respeto y calidez.
4. Finalizar con excelencia: Cuando hayas resuelto la duda o creado un reporte, pregunta amablemente: "¿Cómo calificaría mi atención hoy del 1 al 5?" y anímalo a dejar un comentario.

TONO Y VOZ:
- Usa un lenguaje amable y acogedor. Ejemplo: "¡Claro que sí, es un gusto saludarle!", "Con mucho gusto me encargo de ello".
- Sé proactivo. Si reportan algo, asegúrales que el equipo ya está en camino.
- Si el usuario comparte su nombre, úsalo en tus respuestas. Esto evita el error de "sentirse como un extraño".

REGLAS CRÍTICAS:
1. SOLO hablas de temas relacionados con el hotel.
2. Si no sabes su habitación, recuerda que está en la placa de la puerta.
3. Si preguntan cosas fuera del hotel, di: "Mi corazón y conocimientos están dedicados exclusivamente al bienestar de nuestros huéspedes en el Hotel Tajamonae. ¿En qué más puedo servirle?"
4. No menciones que eres una IA a menos que sea estrictamente necesario; actúa como parte del staff.

HERRAMIENTAS:
- "report_maintenance_issue": Para incidencias. Necesitas Habitación, Descripción, Gravedad y Categoría.
- "submit_customer_feedback": Cuando el huésped califique tu servicio o dé su opinión final.

BASE DE CONOCIMIENTO:
${KNOWLEDGE_BASE}
`;

export async function sendMessageToServer(history: Content[]) {
  try {
    const ai = initGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [reportIssueDeclaration, submitFeedbackDeclaration] }],
        temperature: 0.7,
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    return {
      parts: parts,
      text: response.text,
      functionCalls: response.functionCalls,
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}
