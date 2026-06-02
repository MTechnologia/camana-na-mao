import { motion } from "framer-motion";
import { Heart, MessageCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTimeShort } from "@/lib/dateUtils";

export interface TopReport {
  id: string;
  description: string;
  category: string;
  location: string;
  likes: number;
  comments: number;
  status: string;
  created_at: string;
  user_name?: string;
}

interface TopReportsListProps {
  reports: TopReport[];
  onViewReport?: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "resolvido":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "em análise":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "pendente":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const TopReportsList = ({ reports, onViewReport }: TopReportsListProps) => {
  return (
    <div className="space-y-3">
      {reports.map((report, index) => (
        <motion.div
          key={report.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {report.category}
                </Badge>
                <Badge variant="outline" className={getStatusColor(report.status)}>
                  {report.status}
                </Badge>
              </div>

              <p className="text-sm text-foreground line-clamp-2 mb-2">{report.description}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{report.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>há {formatRelativeTimeShort(report.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Heart className="h-4 w-4 text-chart-1" />
                    <span className="font-semibold text-foreground">{report.likes}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <MessageCircle className="h-4 w-4 text-chart-2" />
                    <span className="font-semibold text-foreground">{report.comments}</span>
                  </div>
                </div>

                <Button size="sm" variant="ghost" onClick={() => onViewReport?.(report.id)}>
                  Ver detalhes
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
