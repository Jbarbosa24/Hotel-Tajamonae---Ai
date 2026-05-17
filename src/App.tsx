import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuestPortal } from "@/components/GuestPortal";
import { MaintenanceDashboard } from "@/components/MaintenanceDashboard";
import { FeedbackReviews } from "@/components/FeedbackReviews";
import { Ticket, ChatMessage, Feedback } from "@/types";
import { Settings, Hotel, MessageSquare, LayoutDashboard, Star } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, query, orderBy, updateDoc, doc } from "firebase/firestore";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pin, setPin] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "model",
      parts: [{ text: "¡Bienvenido al Hotel Tajamonae! Es un verdadero placer saludarle. Mi nombre es Taj-AI y estoy aquí para que su estancia sea perfecta. ¿Con quién tengo el gusto de hablar y en qué habitación se encuentra? \n\n(Recuerde que si tiene algún reporte técnico, puede adjuntar una foto para ayudarnos a resolverlo más pronto)." }],
    },
  ]);

  useEffect(() => {
    const ticketsPath = "tickets";
    const ticketsQuery = query(collection(db, ticketsPath), orderBy("timestamp", "desc"));
    const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      setTickets(ticketsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, ticketsPath);
    });

    const feedbackPath = "feedback";
    const feedbacksQuery = query(collection(db, feedbackPath), orderBy("timestamp", "desc"));
    const unsubscribeFeedbacks = onSnapshot(feedbacksQuery, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[];
      setFeedbacks(feedbackData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, feedbackPath);
    });

    return () => {
      unsubscribeTickets();
      unsubscribeFeedbacks();
    };
  }, []);

  const addTicket = async (ticketParams: Omit<Ticket, "id" | "status" | "timestamp">) => {
    const path = "tickets";
    try {
      await addDoc(collection(db, path), {
        ...ticketParams,
        status: "Abierto",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addFeedback = async (feedbackParams: Omit<Feedback, "id" | "timestamp">) => {
    const path = "feedback";
    try {
      await addDoc(collection(db, path), {
        ...feedbackParams,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const updateTicketStatus = async (id: string, newStatus: Ticket["status"]) => {
    const path = `tickets/${id}`;
    try {
      const ticketRef = doc(db, "tickets", id);
      await updateDoc(ticketRef, { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setPin("");
    } else {
      alert("PIN Incorrecto");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-16 flex items-center">
              <img 
                src="/logo.png" 
                alt="Logo Tajamonae" 
                className="h-full w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const next = e.currentTarget.nextElementSibling as HTMLElement;
                  if (next) next.style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }} className="text-xl font-bold text-brand-teal">
                Tajamonae
              </div>
            </div>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdmin(false)}
            className="text-xs font-semibold px-3 py-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
          >
            Salir de Admin
          </button>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {!isAdmin ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-800">Bienvenido</h2>
              <p className="text-slate-500">¿En qué podemos ayudarle hoy?</p>
            </div>
            <GuestPortal 
              messages={messages} 
              setMessages={setMessages} 
              onTicketCreated={addTicket}
              onFeedbackSubmitted={addFeedback}
            />
          </div>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm w-full lg:w-fit">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white px-6">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Mantenimiento
              </TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white px-6">
                <Star className="w-4 h-4 mr-2" />
                Opiniones
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white px-6">
                <MessageSquare className="w-4 h-4 mr-2" />
                Métricas
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
              <MaintenanceDashboard tickets={tickets} onUpdateStatus={updateTicketStatus} />
            </TabsContent>

            <TabsContent value="reviews" className="mt-0 focus-visible:outline-none">
              <FeedbackReviews feedbacks={feedbacks} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardMetric title="Consultas Hoy" value="24" trend="+15%" />
                <DashboardMetric title="Tickets Abiertos" value={tickets.filter(t => t.status !== "Resuelto").length.toString()} trend="Estable" />
                <DashboardMetric title="Rating Promedio" value="4.8" trend="+0.2" />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Hotel className="w-4 h-4" />
          <span>© 2024 Hotel Tajamonae • Experiencia Inteligente</span>
        </div>
        {!isAdmin && (
          <button 
            onClick={() => setShowAdminLogin(true)}
            className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            Acceso Personal
          </button>
        )}
      </footer>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Acceso Administrativo</h3>
              <button onClick={() => setShowAdminLogin(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Ingrese su PIN</label>
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN (Demo: 1234)"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-brand-teal text-white rounded-lg font-semibold hover:bg-brand-teal/90">
                Ingresar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardMetric({ title, value, trend }: { title: string, value: string, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      <div className="flex bg-slate-300 h-[1px] my-3" />
      <div className="flex items-baseline justify-between">
        <h4 className="text-3xl font-bold text-slate-900">{value}</h4>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
      </div>
    </div>
  );
}
