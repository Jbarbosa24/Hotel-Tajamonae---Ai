import { Content } from "@google/genai";

export async function sendMessageToAgent(history: Content[]): Promise<{ text?: string; parts?: any[]; toolCalls?: any[]; rawResponse?: any }> {
  try {
    // Truncate history to save context and tokens
    const MAX_HISTORY = 12;
    let prunedHistory = history;
    if (history.length > MAX_HISTORY) {
      prunedHistory = [history[0], ...history.slice(-(MAX_HISTORY - 1))];
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        history: prunedHistory.map((msg, idx) => {
          // Keep binary data only for the current message to save quota/bandwidth
          if (idx < prunedHistory.length - 1) {
            return {
              role: msg.role,
              parts: msg.parts.map((part: any) => {
                if (part.inlineData) return { text: "[Archivo multimedia]" };
                return part;
              })
            };
          }
          return msg;
        }) 
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errData = await response.json();
        const errorMessage = errData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      } else {
        const text = await response.text();
        throw new Error(`Technical error (${response.status}): ${text.substring(0, 50)}`);
      }
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Unexpected non-JSON response from server: ${text.substring(0, 50)}`);
    }

    const data = await response.json();

    if (data.parts && data.parts.length > 0) {
      return { 
        parts: data.parts,
        toolCalls: data.functionCalls, 
        text: data.text,
        rawResponse: data 
      };
    }

    return { text: data.text || "" };
  } catch (error: any) {
    console.error("Error calling backend chat API:", error);
    return { text: error.message || "Mil disculpas, he tenido un pequeño inconveniente técnico. ¿Podría repetirme su solicitud, por favor?" };
  }
}
