import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { DataExportDialog, type ExportFormat } from '@/components/analytics/DataExportDialog';
import { useUserRole } from '@/hooks/useUserRole';
import type { DataExportDefaultFilters } from '@/lib/buildDataExportFilters';
import type { ExportDataset } from '@/lib/exportFields';
import { cn } from '@/lib/utils';

type DataExportTriggerProps = {
  defaultFilters?: DataExportDefaultFilters;
  defaultDataset?: ExportDataset;
  defaultFormat?: ExportFormat;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  /** Texto visível em telas ≥ sm. */
  label?: string;
  showIcon?: boolean;
};

/**
 * Botão + dialog HU-7.1 — staff institucional (`canExportData`: admin, gestor, assessor, vereador).
 */
export function DataExportTrigger({
  defaultFilters,
  defaultDataset = 'urban_reports',
  defaultFormat,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Exportar dados',
  showIcon = true,
}: DataExportTriggerProps) {
  const { canExportData, loading } = useUserRole();
  const [open, setOpen] = useState(false);

  const dialogFilters = useMemo(() => defaultFilters, [defaultFilters]);

  if (loading || !canExportData) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn('gap-1.5', className)}
        onClick={() => setOpen(true)}
      >
        {showIcon ? <Download className="h-4 w-4 shrink-0" aria-hidden /> : null}
        <span className={cn(!label && 'sr-only')}>{label}</span>
      </Button>
      <DataExportDialog
        open={open}
        onOpenChange={setOpen}
        defaultFilters={dialogFilters}
        defaultDataset={defaultDataset}
        defaultFormat={defaultFormat}
      />
    </>
  );
}
