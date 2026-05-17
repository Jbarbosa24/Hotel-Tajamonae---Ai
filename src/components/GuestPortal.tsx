import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Ticket, Feedback } from "@/types";
import { sendMessageToAgent } from "@/services/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, User, Bot, Loader2, RefreshCcw, X, Camera, Paperclip, Image as ImageIcon } from "lucide-react";
import { Content } from "@google/genai";

import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase";

interface GuestPortalProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onTicketCreated: (ticket: Omit<Ticket, "id" | "status" | "timestamp">) => void;
  onFeedbackSubmitted: (feedback: Omit<Feedback, "id" | "timestamp">) => void;
}

export function GuestPortal({ messages, setMessages, onTicketCreated, onFeedbackSubmitted }: GuestPortalProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !selectedImage && !isLoading) return;

    const userText = inputValue.trim();
    const imageToUpload = selectedImage;

    setInputValue("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Construct parts correctly for Gemini
    const parts: any[] = [];
    if (userText) parts.push({ text: userText });
    if (imageToUpload) {
      parts.push({ 
        inlineData: { 
          data: imageToUpload.split(",")[1], 
          mimeType: imageToUpload.split(",")[0].split(":")[1].split(";")[0] 
        } 
      });
    }

    // fallback for rendering
    if (parts.length === 0) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: parts,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build history for the API
      let currentHistory: Content[] = [...messages, userMessage].map(m => ({
        role: m.role,
        parts: m.parts,
      }));

      // A recursive-like loop or a single loop for tool handling
      let isDone = false;
      while (!isDone) {
        const result = await sendMessageToAgent(currentHistory);

        if (result.parts && result.parts.length > 0) {
          // Store all parts returned by the model
          const modelParts = result.parts;
          
          if (result.toolCalls && result.toolCalls.length > 0) {
            // Model decided to call a tool
            const call = result.toolCalls[0];
            
            if (call.name === "report_maintenance_issue") {
              const argsWithImage = { ...call.args } as any;
              if (imageToUpload && !argsWithImage.imageUrl) {
                argsWithImage.imageUrl = imageToUpload;
              }
              // Execute tool payload locally
              onTicketCreated(argsWithImage);

              const modelCallMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "model",
                parts: modelParts, // Use all parts (text + thought + functionCall)
              };
              
              const toolResponseMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      id: call.id,
                      name: call.name,
                      response: { success: true, message: "Ticket created successfully" }
                    }
                  }
                ]
              };

              setMessages((prev) => [...prev, modelCallMsg, toolResponseMsg]);
              
              currentHistory.push({ role: "model", parts: modelParts });
              currentHistory.push({ 
                role: "user", 
                parts: [{ 
                  functionResponse: { 
                    id: call.id,
                    name: call.name, 
                    response: { success: true } 
                  } 
                }] 
              });
            } else if (call.name === "submit_customer_feedback") {
              // Execute feedback tool
              onFeedbackSubmitted(call.args as any);

              const modelCallMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "model",
                parts: modelParts, // Use all parts
              };
              
              const toolResponseMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      id: call.id,
                      name: call.name,
                      response: { success: true, message: "Feedback received successfully" }
                    }
                  }
                ]
              };

              setMessages((prev) => [...prev, modelCallMsg, toolResponseMsg]);
              
              currentHistory.push({ role: "model", parts: modelParts });
              currentHistory.push({ 
                role: "user", 
                parts: [{ 
                  functionResponse: { 
                    id: call.id,
                    name: call.name, 
                    response: { success: true } 
                  } 
                }] 
              });
            } else {
              isDone = true;
            }
          } else if (result.text) {
            // Plain text response
            const modelTextMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: "model",
              parts: modelParts,
            };
            setMessages((prev) => [...prev, modelTextMessage]);
            isDone = true;
          } else {
            isDone = true;
          }
        } else if (result.text) {
          // Fallback if parts are missing but text exists
          const modelTextMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "model",
            parts: [{ text: result.text }],
          };
          setMessages((prev) => [...prev, modelTextMessage]);
          isDone = true;
        } else {
          isDone = true;
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessages((prev) => [
        ...prev, 
        { id: crypto.randomUUID(), role: "model", parts: [{ text: e.message || "Lo siento, ha ocurrido un error de conexión." }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "model",
        parts: [{ text: "¡Bienvenido al Hotel Tajamonae! Es un verdadero placer saludarle. Mi nombre es Taj-AI y estoy aquí para que su estancia sea perfecta. ¿Con quién tengo el gusto de hablar y en qué número de habitación se encuentra?" }],
      },
    ]);
  };

  return (
    <Card className="flex flex-col h-[500px] border-slate-200 shadow-sm overflow-hidden bg-white">
      <div className="bg-brand-teal p-4 text-white flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Taj-AI
          </h2>
          <p className="text-xs text-white/80">Atención personalizada y gestión de servicios</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetSession}
            className="text-white hover:bg-white/20 h-8 px-2 border border-white/20"
            title="Nueva Sesión"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1" />
            Nueva
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetSession}
            className="text-white hover:bg-white/20 h-8 px-2 border border-white/20"
            title="Finalizar Chat"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Finalizar
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-4" viewportRef={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const textPart = msg.parts.find((p) => p.text);
            const imagePart = msg.parts.find((p) => p.inlineData && p.inlineData.mimeType.startsWith("image/"));

            if (!textPart && !imagePart) return null;

            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-brand-orange/10 text-brand-orange" : "bg-brand-teal/10 text-brand-teal"}`}>
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isUser ? "bg-brand-orange text-white rounded-tr-sm" : "bg-brand-teal text-white rounded-tl-sm"}`}>
                  {textPart && <p className="text-sm leading-relaxed whitespace-pre-wrap">{textPart.text}</p>}
                  {imagePart && (
                    <img 
                      src={`data:${imagePart.inlineData!.mimeType};base64,${imagePart.inlineData!.data}`} 
                      alt="Adjunto" 
                      className="mt-2 max-w-full rounded-lg border border-white/20"
                    />
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-brand-teal/10 text-brand-teal rounded-2xl rounded-tl-sm px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                <span className="text-xs text-brand-teal-dark">Taj-AI escribiendo...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-100 bg-white space-y-3">
        {selectedImage && (
          <div className="relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
            <button 
              onClick={clearImage}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="text-slate-400 hover:text-brand-teal hover:bg-brand-teal/5"
            title="Adjuntar foto"
          >
            <Camera className="w-5 h-5" />
          </Button>
          <Input 
            disabled={isLoading}
            placeholder="Escriba su mensaje aquí..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 focus-visible:ring-brand-teal"
          />
          <Button onClick={() => handleSend()} disabled={isLoading || (!inputValue.trim() && !selectedImage)} className="bg-brand-teal hover:bg-brand-teal/90 text-white">
            <Send className="w-4 h-4 mr-2" />
            Enviar
          </Button>
        </div>
      </div>
    </Card>
  );
}
