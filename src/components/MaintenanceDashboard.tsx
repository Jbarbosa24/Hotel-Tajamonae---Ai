import { Ticket } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Wrench } from "lucide-react";

interface MaintenanceDashboardProps {
  tickets: Ticket[];
  onUpdateStatus: (id: string, newStatus: Ticket["status"]) => void;
}

const severityColors = {
  Baja: "bg-slate-100 text-slate-800 hover:bg-slate-200",
  Media: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  Alta: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  "Crítica": "bg-red-100 text-red-800 hover:bg-red-200",
};

const statusColors = {
  Abierto: "text-slate-500",
  "En Progreso": "text-brand-teal",
  Resuelto: "text-emerald-600",
};

export function MaintenanceDashboard({ tickets, onUpdateStatus }: MaintenanceDashboardProps) {
  if (tickets.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center h-[500px] border-dashed border-2 border-slate-200 bg-slate-50">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-medium text-slate-700">Todo en orden</h3>
        <p className="text-slate-500 mt-1 max-w-sm text-center">No hay tickets de mantenimiento pendientes. ¡Buen trabajo de prevención!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Abiertos</p>
            <p className="text-2xl font-bold">{tickets.filter(t => t.status === "Abierto").length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">En Progreso</p>
            <p className="text-2xl font-bold">{tickets.filter(t => t.status === "En Progreso").length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Resueltos</p>
            <p className="text-2xl font-bold">{tickets.filter(t => t.status === "Resuelto").length}</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Habitación</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="w-[200px]">Descripción</TableHead>
              <TableHead>Evidencia</TableHead>
              <TableHead>Gravedad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-xs text-slate-500">{ticket.id}</TableCell>
                <TableCell className="font-medium text-slate-900">{ticket.room}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{ticket.category}</Badge></TableCell>
                <TableCell className="text-sm text-slate-600 line-clamp-2" title={ticket.description}>
                  {ticket.description}
                </TableCell>
                <TableCell>
                  {ticket.imageUrl ? (
                    <img 
                      src={ticket.imageUrl} 
                      alt="Evidencia" 
                      className="w-10 h-10 object-cover rounded border border-slate-200 cursor-pointer hover:scale-150 transition-transform" 
                      onClick={() => window.open(ticket.imageUrl, '_blank')}
                    />
                  ) : (
                    <span className="text-xs text-slate-400 italic">No adjunta</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={`shadow-none ${severityColors[ticket.severity]}`}>
                    {ticket.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${statusColors[ticket.status]}`}>
                    {ticket.status === "Abierto" && <AlertCircle className="w-4 h-4" />}
                    {ticket.status === "En Progreso" && <Wrench className="w-4 h-4" />}
                    {ticket.status === "Resuelto" && <CheckCircle2 className="w-4 h-4" />}
                    {ticket.status}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {ticket.status === "Abierto" && (
                    <Button size="sm" variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal/10" onClick={() => onUpdateStatus(ticket.id, "En Progreso")}>
                      Iniciar <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  {ticket.status === "En Progreso" && (
                    <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onUpdateStatus(ticket.id, "Resuelto")}>
                      Completar <CheckCircle2 className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  {ticket.status === "Resuelto" && (
                    <span className="text-xs text-slate-400">Finalizado</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
