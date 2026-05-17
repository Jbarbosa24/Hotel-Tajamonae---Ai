import { Part } from "@google/genai";

export type Severity = "Baja" | "Media" | "Alta" | "Crítica";
export type Category = "Plomería" | "Electricidad" | "Limpieza" | "Suministros" | "HVAC" | "Mantenimiento General" | "Otro";
export type Status = "Abierto" | "En Progreso" | "Resuelto";

export interface Ticket {
  id: string;
  room: string;
  description: string;
  severity: Severity;
  category: Category;
  status: Status;
  timestamp: string;
  imageUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  parts: Part[];
}

export interface Feedback {
  id: string;
  rating: number;
  comment: string;
  timestamp: string;
  customerName?: string;
}
