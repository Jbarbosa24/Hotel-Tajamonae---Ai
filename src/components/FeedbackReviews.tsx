import { Feedback } from "@/types";
import { Card } from "@/components/ui/card";
import { Star, MessageSquare, User, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeedbackReviewsProps {
  feedbacks: Feedback[];
}

export function FeedbackReviews({ feedbacks }: FeedbackReviewsProps) {
  const averageRating = feedbacks.length > 0 
    ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col items-center justify-center text-center space-y-2 border-brand-teal/20">
          <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Calificación Promedio</div>
          <div className="text-5xl font-bold text-brand-teal">{averageRating.toFixed(1)}</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={`w-5 h-5 ${star <= Math.round(averageRating) ? "fill-brand-orange text-brand-orange" : "text-slate-200"}`} 
              />
            ))}
          </div>
          <div className="text-xs text-slate-400 italic">Basado en {feedbacks.length} opiniones</div>
        </Card>

        <Card className="p-6 md:col-span-2 space-y-4 border-brand-teal/20">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-teal" />
            Opiniones de los Huéspedes
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = feedbacks.filter(f => f.rating === rating).length;
              const percentage = feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0;
              return (
                <div key={rating} className="flex flex-col items-center gap-1">
                  <div className="text-xs font-medium text-slate-500">{rating}★</div>
                  <div className="w-full bg-slate-100 h-16 rounded-md overflow-hidden flex flex-col justify-end">
                    <div 
                      className="bg-brand-orange w-full transition-all duration-500" 
                      style={{ height: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">{count}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {feedbacks.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            <Star className="w-12 h-12 mb-3 opacity-20" />
            <p>Aún no hay calificaciones registradas.</p>
            <p className="text-sm">Taj-AI solicitará una opinión al finalizar cada interacción.</p>
          </div>
        ) : (
          feedbacks.map((feedback) => (
            <Card key={feedback.id} className="p-4 hover:shadow-md transition-shadow border-brand-teal/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">
                        {feedback.customerName || "Huésped Tajamonae"}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-3 h-3 ${star <= feedback.rating ? "fill-brand-orange text-brand-orange" : "text-slate-200"}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed italic">
                      "{feedback.comment}"
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(feedback.timestamp).toLocaleDateString()}
                  </div>
                  <Badge variant="outline" className="bg-brand-teal/5 text-brand-teal border-brand-teal/20 text-[10px]">
                    Verificado
                  </Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
