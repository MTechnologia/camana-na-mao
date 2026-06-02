import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const KPICard = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  onClick,
  className,
}: KPICardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border p-6 transition-all",
        onClick && "cursor-pointer hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn("w-12 h-12 rounded-lg flex items-center justify-center", "bg-primary/10")}
        >
          <Icon className="w-6 h-6 text-primary" />
        </div>
        {trend && (
          <div
            className={cn(
              "text-sm font-medium px-2 py-1 rounded",
              trend.direction === "up" ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50",
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
};
