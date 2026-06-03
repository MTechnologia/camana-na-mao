import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Expand, MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv, serializeCsv, type CsvHeader } from "@/lib/csvSerialize";
import { cn } from "@/lib/utils";

export type ChartExportConfig = {
  filename: string;
  headers: CsvHeader[];
  rows: Array<Record<string, unknown>>;
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onDrillDown?: () => void;
  /** Exportação CSV embutida (serializa e baixa no clique). */
  exportConfig?: ChartExportConfig;
  /** Exportação customizada; tem prioridade sobre `exportConfig`. */
  onExport?: () => void;
  onFullscreen?: () => void;
  className?: string;
  lastUpdated?: string;
}

export const ChartCard = ({
  title,
  subtitle,
  children,
  onDrillDown,
  exportConfig,
  onExport,
  onFullscreen,
  className,
  lastUpdated,
}: ChartCardProps) => {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const canExport = Boolean(onExport || exportConfig);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    if (!exportConfig || exportConfig.rows.length === 0) return;
    const csv = serializeCsv(exportConfig.headers, exportConfig.rows);
    downloadCsv(csv, exportConfig.filename);
  };

  const handleFullscreen = () => {
    if (onFullscreen) {
      onFullscreen();
      return;
    }
    setFullscreenOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("bg-card rounded-xl border border-border p-6", className)}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Opções do gráfico"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100]">
              {onDrillDown && (
                <DropdownMenuItem onClick={onDrillDown}>
                  <Search className="h-4 w-4 mr-2" />
                  Ver o próximo nível
                </DropdownMenuItem>
              )}
              {canExport && (
                <DropdownMenuItem
                  onClick={handleExport}
                  disabled={!onExport && (!exportConfig || exportConfig.rows.length === 0)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar dados
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleFullscreen}>
                <Expand className="h-4 w-4 mr-2" />
                Tela cheia
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="min-h-[300px]">{children}</div>

        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-4 text-right">
            Atualizado em {lastUpdated}
          </p>
        )}
      </motion.div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[min(96vw,1200px)] w-full max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </DialogHeader>
          <div className="min-h-[min(70vh,560px)]">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};
